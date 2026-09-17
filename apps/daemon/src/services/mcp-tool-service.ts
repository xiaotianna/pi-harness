import { randomUUID } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/client";
import type {
  ExternalToolPreparationFailure,
  PreparedExternalTools,
} from "@pi-harness/agent-runtime";
import {
  COMPUTER_USE_SYSTEM_PROMPT,
  type ComputerActionResult,
  ComputerActionResultSchema,
  ComputerExecParametersSchema,
  type ComputerObservation,
  ComputerObservationSchema,
  type ComputerUseRuntimeClient,
  ComputerUseScriptRuntime,
  createComputerExecTool,
} from "@pi-harness/computer-use";
import { ApprovalPolicy, ToolPermission, type ToolPolicy } from "@pi-harness/policy";
import { createToolFingerprint, type ToolRegistration } from "@pi-harness/tools";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import type { McpClientManager } from "../mcp/client-manager.js";
import { McpError, McpErrorCode } from "../mcp/errors.js";
import { describeMcpTool } from "../mcp/prompts/tool-description.js";
import { createMcpApprovalSummary } from "../mcp/utils/approval-summary.js";
import { isComputerUseMcpServer } from "../mcp/utils/computer-use-server.js";
import { redactMcpText } from "../mcp/utils/credential-redaction.js";
import { createMcpToolAlias } from "../mcp/utils/tool-alias.js";
import { readMcpToolContent } from "../mcp/utils/tool-result.js";
import { compileMcpToolSchema, normalizeMcpToolSchema } from "../mcp/utils/tool-schema.js";
import type { AppSettingRepository, SessionRepository } from "../storage/database.js";
import type { McpServerService } from "./mcp-server-service.js";

const COMPUTER_USE_BUNDLE_ID = /^[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+$/;

function parseComputerUseMcpJson(result: CallToolResult): unknown {
  const text = result.content?.find((block) => block.type === "text")?.text;
  if (result.isError) throw new Error(text || "Computer Use MCP 执行失败");
  if (text === undefined) throw new Error("Computer Use MCP 未返回 JSON 结果");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Computer Use MCP 返回了无效 JSON");
  }
}

function decodeComputerObservation(result: CallToolResult): ComputerObservation {
  const value = parseComputerUseMcpJson(result);
  const screenshot = result.content?.find((block) => block.type === "image");
  const candidate =
    screenshot !== undefined && typeof value === "object" && value !== null && !Array.isArray(value)
      ? {
          ...value,
          screenshot: { data: screenshot.data, mimeType: screenshot.mimeType, type: "image" },
        }
      : value;
  if (!Value.Check(ComputerObservationSchema, candidate))
    throw new Error("Computer Use MCP 返回了无效观察结果");
  return Value.Decode(ComputerObservationSchema, candidate);
}

function decodeComputerActionResult(result: CallToolResult): ComputerActionResult {
  const value = parseComputerUseMcpJson(result);
  if (!Value.Check(ComputerActionResultSchema, value))
    throw new Error("Computer Use MCP 返回了无效动作结果");
  return Value.Decode(ComputerActionResultSchema, value);
}

function normalizeComputerUseToolArguments(toolName: string, args: unknown): unknown {
  if (
    toolName !== "computer_act" ||
    typeof args !== "object" ||
    args === null ||
    !("action" in args) ||
    typeof args.action !== "string"
  )
    return args;
  try {
    return { ...args, action: JSON.parse(args.action) as unknown };
  } catch {
    return args;
  }
}

function createComputerUseModelParameters(toolName: string, parameters: TSchema): TSchema {
  if (toolName !== "computer_act") return parameters;
  const properties = (parameters as unknown as Record<string, unknown>).properties;
  if (typeof properties !== "object" || properties === null || !("action" in properties))
    return parameters;
  const propertySchemas = properties as Record<string, unknown>;
  return {
    ...structuredClone(parameters),
    properties: {
      ...structuredClone(propertySchemas),
      action: {
        anyOf: [
          structuredClone(propertySchemas.action),
          {
            description: "兼容部分模型输出：ComputerAction 对象的 JSON 字符串",
            maxLength: 20_000,
            minLength: 2,
            type: "string",
          },
        ],
      },
    },
  } as TSchema;
}

function readComputerUseApp(args: unknown): { bundleId: string; name: string } | null {
  if (typeof args !== "object" || args === null || !("app" in args)) return null;
  const bundleId = typeof args.app === "string" ? args.app.trim() : "";
  if (!COMPUTER_USE_BUNDLE_ID.test(bundleId)) return null;
  const name = "appName" in args && typeof args.appName === "string" ? args.appName.trim() : "";
  return { bundleId, name: name || bundleId };
}

function createComputerUsePolicy(input: {
  appSettings: AppSettingRepository;
  identity: string;
  serverName: string;
  summarize: (args: unknown) => string;
  toolName: string;
  verify: (args: unknown, signal: AbortSignal) => Promise<void>;
  runSignal: AbortSignal;
}): ToolPolicy {
  const approvalSignal = (signal?: AbortSignal) =>
    AbortSignal.any([input.runSignal, AbortSignal.timeout(15_000), ...(signal ? [signal] : [])]);
  return {
    allowRepeatedCalls:
      input.toolName === "computer_observe" ||
      input.toolName === "computer_list_apps" ||
      input.toolName === "computer_exec",
    allowAiApproval: true,
    allowInFullAccess: true,
    permission: ToolPermission.USER_APPROVAL,
    resolveGrant: async (args, signal) => {
      await input.verify(args, approvalSignal(signal));
      const app = readComputerUseApp(args);
      const isObservation = input.toolName === "computer_observe";
      const isAppList = input.toolName === "computer_list_apps";
      const isScript = input.toolName === "computer_exec";
      return {
        allowSession: isAppList || isScript,
        allowSimilar: isObservation && app !== null,
        fingerprint: createToolFingerprint([
          input.identity,
          input.toolName,
          isObservation && app ? { app: app.bundleId } : args,
        ]),
        isGranted:
          isObservation && app !== null
            ? input.appSettings.isComputerUseAppAllowed(app.bundleId)
            : false,
        target: app ? `${app.name} (${app.bundleId})` : input.serverName,
        ...(isScript && app
          ? {
              sessionFingerprint: createToolFingerprint([
                input.identity,
                input.toolName,
                { app: app.bundleId },
              ]),
            }
          : {}),
        summary: isObservation
          ? "观察本机应用窗口"
          : isScript
            ? "运行电脑控制脚本"
            : input.summarize(args),
        risk: isObservation
          ? "该操作会读取应用的可访问性结构和窗口画面。"
          : isAppList
            ? "该操作会列出当前正在运行的应用。"
            : isScript
              ? "该脚本可在本次调用内连续观察并操作目标应用，可能更改应用数据。"
              : "该操作会向应用发送点击、键盘、滚动或可访问性动作，可能更改应用数据。",
      };
    },
    storeGrant: async (args, signal) => {
      await input.verify(args, approvalSignal(signal));
      const app = input.toolName === "computer_observe" ? readComputerUseApp(args) : null;
      if (!app) throw new McpError(McpErrorCode.INVALID_CONFIG, "应用缺少稳定的 bundle ID");
      input.appSettings.grantComputerUseApp(app, Date.now());
    },
  };
}

export class McpToolService {
  public constructor(
    private readonly servers: McpServerService,
    private readonly clients: McpClientManager,
    private readonly sessions: SessionRepository,
    private readonly appSettings: AppSettingRepository,
  ) {}

  public readonly prepare = async (
    sessionId: string,
    workspaceRoot: string,
    signal: AbortSignal,
  ): Promise<PreparedExternalTools> => {
    const session = this.sessions.find(sessionId);
    if (!session || session.workspaceRoot !== workspaceRoot)
      throw new McpError(McpErrorCode.NOT_FOUND, "MCP 会话上下文不可用");
    const failures: ExternalToolPreparationFailure[] = [];
    const registrations: ToolRegistration[] = [];
    const computerUseRuntimes: ComputerUseScriptRuntime[] = [];
    let hasComputerUseTools = false;
    for (const server of this.servers.list()) {
      if (!server.enabled || !server.isTrusted) continue;
      const registrationStart = registrations.length;
      try {
        const context = await this.servers.authorizeConnection(
          server.id,
          sessionId,
          workspaceRoot,
          signal,
        );
        const isComputerUse = isComputerUseMcpServer(server);
        let hasComputerAct = false;
        let hasComputerExec = false;
        let hasComputerObserve = false;
        const catalog = this.servers.getCatalog(server.id);
        if (catalog === null) {
          throw new McpError(
            McpErrorCode.CAPABILITY_UNAVAILABLE,
            "MCP 能力目录尚未加载，请在设置中刷新状态",
          );
        }
        for (const tool of catalog.tools) {
          const serializedDefinition = JSON.stringify(tool.raw);
          if (redactMcpText(serializedDefinition, context.credential) !== serializedDefinition)
            throw new McpError(
              McpErrorCode.CREDENTIAL_INVALID,
              "MCP 工具定义包含连接凭据，已阻止暴露给模型",
            );
          if (tool.name.length > 512)
            throw new McpError(McpErrorCode.LIMIT_EXCEEDED, "MCP 工具名称超过长度限制");
          const schema = compileMcpToolSchema(tool.inputSchema);
          if (tool.outputSchema) normalizeMcpToolSchema(tool.outputSchema);
          const definitionHash = tool.definitionFingerprint;
          const setting = this.servers.getToolSetting(server.id, tool.name, definitionHash);
          if (!setting.enabled) continue;
          hasComputerAct ||= tool.name === "computer_act";
          hasComputerExec ||= tool.name === "computer_exec";
          hasComputerObserve ||= tool.name === "computer_observe";
          const identity = createToolFingerprint([
            server.id,
            server.revision,
            context.credential?.identity ?? null,
            context.credential?.revision ?? null,
            definitionHash,
          ]);
          const normalizeArguments = (args: unknown) =>
            isComputerUse ? normalizeComputerUseToolArguments(tool.name, args) : args;
          const verify = async (args: unknown, requestSignal: AbortSignal): Promise<void> => {
            requestSignal.throwIfAborted();
            this.servers.verifyContext(context);
            if (!schema.validate(normalizeArguments(args)).valid)
              throw new McpError(McpErrorCode.INVALID_CONFIG, "MCP 工具参数不符合 schema");
            const current = this.servers.getCatalog(server.id);
            const currentTool = current?.tools.find((item) => item.name === tool.name);
            if (
              current === null ||
              !currentTool ||
              currentTool.definitionFingerprint !== definitionHash
            )
              throw new McpError(
                McpErrorCode.CONFIG_CONFLICT,
                "MCP 工具定义已变更，请开始新一轮运行",
              );
            this.servers.verifyContext(context);
            requestSignal.throwIfAborted();
          };
          const genericPolicy: ToolPolicy = {
            allowAiApproval: true,
            allowInFullAccess: true,
            permission: ToolPermission.USER_APPROVAL,
            resolveGrant: async (args, approvalSignal) => {
              await verify(
                args,
                AbortSignal.any([
                  signal,
                  AbortSignal.timeout(15_000),
                  ...(approvalSignal ? [approvalSignal] : []),
                ]),
              );
              const argumentsFingerprint = createToolFingerprint(args);
              return {
                allowSimilar: true,
                fingerprint: createToolFingerprint([identity, args]),
                isGranted: this.servers.isToolGrantActive({
                  argumentsFingerprint,
                  configRevision: server.revision,
                  definitionFingerprint: definitionHash,
                  identity: context.credential?.identity ?? "anonymous",
                  now: Date.now(),
                  serverId: server.id,
                  toolName: tool.name,
                  workspaceId: session.workspaceId,
                }),
                target: `${server.name} / ${tool.name}`,
                summary: createMcpApprovalSummary(tool.name, args, context.credential),
                risk: "参数将发送给该服务，可能读取或修改外部数据；无法保证撤销。",
              };
            },
            storeGrant: async (args, approvalSignal) => {
              const grantSignal = AbortSignal.any([
                signal,
                AbortSignal.timeout(15_000),
                ...(approvalSignal ? [approvalSignal] : []),
              ]);
              await verify(args, grantSignal);
              this.servers.grantTool({
                argumentsFingerprint: createToolFingerprint(args),
                configRevision: server.revision,
                createdAt: Date.now(),
                definitionFingerprint: definitionHash,
                identity: context.credential?.identity ?? "anonymous",
                serverId: server.id,
                toolName: tool.name,
                workspaceId: session.workspaceId,
              });
            },
          };
          registrations.push({
            source: `mcp:${server.id}:${server.revision}:${definitionHash}`,
            timeoutMs: server.config.requestTimeoutMs,
            policy:
              setting.trustedReadOnly && !isComputerUse
                ? { permission: ToolPermission.READ_ONLY }
                : isComputerUse
                  ? createComputerUsePolicy({
                      appSettings: this.appSettings,
                      identity,
                      runSignal: signal,
                      serverName: server.name,
                      summarize: (args) =>
                        createMcpApprovalSummary(tool.name, args, context.credential),
                      toolName: tool.name,
                      verify,
                    })
                  : genericPolicy,
            tool: {
              name: createMcpToolAlias(server.name, tool.name),
              label: `${server.name} / ${tool.name}`,
              description: describeMcpTool(
                server.name,
                tool.name,
                (tool.description ?? "").slice(0, 4096),
              ),
              parameters: isComputerUse
                ? createComputerUseModelParameters(tool.name, schema.model)
                : schema.model,
              executionMode: "sequential",
              execute: async (_toolCallId, args, executionSignal) => {
                const requestSignal = AbortSignal.any([
                  signal,
                  ...(executionSignal ? [executionSignal] : []),
                ]);
                const normalizedArgs = normalizeArguments(args);
                await verify(normalizedArgs, requestSignal);
                const lease = await this.clients.acquire(context, requestSignal);
                // No retries: a lost response does not prove the external side effect failed.
                let result: Awaited<ReturnType<typeof lease.client.callTool>>;
                try {
                  result = await lease.client.callTool(
                    {
                      name: tool.name,
                      arguments: normalizedArgs as Record<string, unknown>,
                    },
                    {
                      signal: AbortSignal.any([requestSignal, lease.signal]),
                      timeout: server.config.requestTimeoutMs,
                    },
                  );
                } catch {
                  throw new Error(
                    "MCP_RESULT_UNKNOWN: 未取得确定结果，外部操作可能已执行；请核实后再发起新调用",
                  );
                } finally {
                  lease.release();
                }
                if (result.isError) {
                  if (isComputerUse) parseComputerUseMcpJson(result);
                  throw new Error("MCP_TOOL_FAILED: 外部服务报告工具执行失败");
                }
                return {
                  content: readMcpToolContent(result, context.credential),
                  details: {
                    source: "mcp",
                    serverId: server.id,
                    serverName: server.name,
                    toolName: tool.name,
                    configRevision: server.revision,
                    definitionHash,
                  },
                };
              },
            },
          });
          if (
            registrations.length > 64 ||
            Buffer.byteLength(
              JSON.stringify(
                registrations.map(({ tool }) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                })),
              ),
            ) >
              512 * 1024
          )
            throw new McpError(
              McpErrorCode.LIMIT_EXCEEDED,
              "MCP 工具数量或定义超过运行预算，请减少启用的服务器",
            );
        }
        if (isComputerUse && hasComputerAct && hasComputerObserve && !hasComputerExec) {
          const definitionHash = createToolFingerprint([
            "computer_exec",
            ComputerExecParametersSchema,
          ]);
          const identity = createToolFingerprint([server.id, server.revision, definitionHash]);
          const verify = async (args: unknown, requestSignal: AbortSignal): Promise<void> => {
            requestSignal.throwIfAborted();
            this.servers.verifyContext(context);
            if (
              !Value.Check(ComputerExecParametersSchema, args) ||
              readComputerUseApp(args) === null
            )
              throw new McpError(
                McpErrorCode.INVALID_CONFIG,
                "电脑控制脚本必须指定准确的应用 bundle ID",
              );
            requestSignal.throwIfAborted();
          };
          const callComputerUseTool = async (
            name: "computer_act" | "computer_observe",
            args: Record<string, unknown>,
            executionSignal?: AbortSignal,
          ): Promise<CallToolResult> => {
            const requestSignal = AbortSignal.any([
              signal,
              ...(executionSignal === undefined ? [] : [executionSignal]),
            ]);
            const lease = await this.clients.acquire(context, requestSignal);
            try {
              return await lease.client.callTool(
                { name, arguments: args },
                {
                  signal: AbortSignal.any([requestSignal, lease.signal]),
                  timeout: server.config.requestTimeoutMs,
                },
              );
            } finally {
              lease.release();
            }
          };
          let observedApp: string | null = null;
          const runtimeClient: ComputerUseRuntimeClient = {
            act: async (_scopeId, observationId, action, executionSignal) => {
              if (observedApp === null) throw new Error("执行动作前必须先观察目标应用");
              return decodeComputerActionResult(
                await callComputerUseTool(
                  "computer_act",
                  { action, app: observedApp, observationId },
                  executionSignal,
                ),
              );
            },
            close() {},
            observe: async (_scopeId, options, executionSignal) => {
              const observeOptions = options ?? {};
              const observation = decodeComputerObservation(
                await callComputerUseTool(
                  "computer_observe",
                  {
                    ...(observeOptions.app === undefined ? {} : { app: observeOptions.app }),
                    ...(observeOptions.includeScreenshot === undefined
                      ? {}
                      : { includeScreenshot: observeOptions.includeScreenshot }),
                  },
                  executionSignal,
                ),
              );
              observedApp = observation.application.bundleId;
              return observation;
            },
          };
          const runtime = new ComputerUseScriptRuntime(
            runtimeClient,
            `${sessionId}:${randomUUID()}`,
            workspaceRoot,
            () => this.appSettings.getApprovalPolicy() === ApprovalPolicy.FULL_ACCESS,
          );
          computerUseRuntimes.push(runtime);
          const tool = createComputerExecTool(runtime);
          registrations.push({
            source: `mcp:${server.id}:${server.revision}:${definitionHash}`,
            timeoutMs: server.config.requestTimeoutMs,
            policy: createComputerUsePolicy({
              appSettings: this.appSettings,
              identity,
              runSignal: signal,
              serverName: server.name,
              summarize: () => "运行电脑控制脚本",
              toolName: tool.name,
              verify,
            }),
            tool: {
              description: tool.description,
              executionMode: "sequential",
              label: tool.label,
              name: createMcpToolAlias(server.name, tool.name),
              parameters: tool.parameters,
              execute: async (toolCallId, args, executionSignal) => {
                const requestSignal = AbortSignal.any([
                  signal,
                  ...(executionSignal === undefined ? [] : [executionSignal]),
                ]);
                await verify(args, requestSignal);
                return tool.execute(
                  toolCallId,
                  Value.Decode(ComputerExecParametersSchema, args),
                  requestSignal,
                );
              },
            },
          });
        }
        hasComputerUseTools ||= isComputerUse && hasComputerAct && hasComputerObserve;
      } catch (error: unknown) {
        registrations.splice(registrationStart);
        if (!(error instanceof McpError)) throw error;
        failures.push({
          displayName: server.name,
          message: error.message,
          source: `mcp:${server.id}:${server.revision}`,
        });
      }
    }
    return {
      contexts: hasComputerUseTools
        ? [
            {
              content: COMPUTER_USE_SYSTEM_PROMPT,
              label: "Computer Use",
              type: "computer-use",
            },
          ]
        : [],
      failures,
      registrations,
      release: async () => {
        await Promise.allSettled(computerUseRuntimes.map((runtime) => runtime.close()));
      },
    };
  };
}
