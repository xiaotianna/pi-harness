import type { FastifyReply, FastifyRequest } from "fastify";
import type { HarnessConfig } from "../config/index.js";
import type {
  CreateMcpServerDto,
  ImportMcpServersDto,
  McpJsonDto,
  McpOAuthCallbackDto,
  McpRevisionDto,
  McpServerParamsDto,
  PutMcpCredentialDto,
  TestMcpConnectionDto,
  UpdateMcpServerDto,
  UpdateMcpToolDto,
} from "../dto/mcp-dto.js";
import { MCP_ERROR_STATUS, McpError, McpErrorCode } from "../mcp/errors.js";
import type { McpDiagnosticsService } from "../services/mcp-diagnostics-service.js";
import type { McpOAuthService } from "../services/mcp-oauth-service.js";
import type { McpServerService } from "../services/mcp-server-service.js";
import { isMutationRequestAllowed, rejectMutation } from "../utils/request-security.js";

export class McpController {
  public constructor(
    private readonly config: HarnessConfig,
    private readonly servers: McpServerService,
    private readonly diagnostics: McpDiagnosticsService,
    private readonly oauth: McpOAuthService,
  ) {}

  public list = (request: FastifyRequest, reply: FastifyReply) =>
    this.respond(request, reply, () => this.servers.list());
  public get = (request: FastifyRequest<{ Params: McpServerParamsDto }>, reply: FastifyReply) =>
    this.respond(request, reply, () => this.servers.get(request.params.serverId));
  public getCatalog = (
    request: FastifyRequest<{ Params: McpServerParamsDto }>,
    reply: FastifyReply,
  ) => this.respond(request, reply, () => this.diagnostics.get(request.params.serverId));
  public create = (request: FastifyRequest<{ Body: CreateMcpServerDto }>, reply: FastifyReply) =>
    this.respond(request, reply, () => this.servers.create(request.body));
  public update = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: UpdateMcpServerDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () => this.servers.update(request.params.serverId, request.body));
  public remove = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: McpRevisionDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.servers.delete(request.params.serverId, request.body.expectedRevision),
    );
  public trust = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: McpRevisionDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.servers.trust(request.params.serverId, request.body.expectedRevision),
    );
  public revokeTrust = (
    request: FastifyRequest<{ Params: McpServerParamsDto }>,
    reply: FastifyReply,
  ) => this.respond(request, reply, () => this.servers.revokeTrust(request.params.serverId));
  public putCredential = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: PutMcpCredentialDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.servers.putCredential(request.params.serverId, request.body),
    );
  public deleteCredential = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: McpRevisionDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.servers.deleteCredential(request.params.serverId, request.body.expectedRevision),
    );
  public startOAuth = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: McpRevisionDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, async () => ({
      authorizationUrl: await this.oauth.start(
        request.params.serverId,
        request.body.expectedRevision,
      ),
    }));
  public completeOAuth = async (
    request: FastifyRequest<{
      Params: McpServerParamsDto;
      Querystring: McpOAuthCallbackDto;
    }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { code, error, iss, state } = request.query;
    if (error !== undefined || code === undefined || state === undefined) {
      request.log.warn({ code: McpErrorCode.OAUTH_FAILED }, "MCP OAuth callback failed");
      return this.redirectToOAuthResult(
        reply,
        request.params.serverId,
        false,
        "OAuth 提供方拒绝、取消或返回了无效结果。",
      );
    }
    try {
      const server = await this.oauth.complete(request.params.serverId, code, state, iss);
      if (server.enabled && server.isTrusted) {
        void this.diagnostics
          .test(server.id, { expectedRevision: server.revision }, AbortSignal.timeout(30_000))
          .catch((error: unknown) => {
            request.log.warn(
              { err: error, serverId: server.id },
              "MCP OAuth catalog refresh failed",
            );
          });
      }
      return this.redirectToOAuthResult(reply, request.params.serverId, true);
    } catch (cause: unknown) {
      const oauthError =
        cause instanceof McpError
          ? cause
          : new McpError(McpErrorCode.OAUTH_FAILED, "MCP OAuth 授权失败，请重新授权");
      request.log.warn({ code: oauthError.code }, "MCP OAuth callback failed");
      return this.redirectToOAuthResult(reply, request.params.serverId, false, oauthError.message);
    }
  };
  public previewImport = (
    request: FastifyRequest<{ Body: ImportMcpServersDto }>,
    reply: FastifyReply,
  ): Promise<McpJsonDto | FastifyReply> =>
    this.respond(request, reply, () => this.servers.previewImport(request.body));
  public importServers = (
    request: FastifyRequest<{ Body: ImportMcpServersDto }>,
    reply: FastifyReply,
  ) => this.respond(request, reply, () => this.servers.importServers(request.body));
  public exportServer = (
    request: FastifyRequest<{ Params: McpServerParamsDto }>,
    reply: FastifyReply,
  ): Promise<McpJsonDto | FastifyReply> =>
    this.respond(request, reply, () => this.servers.exportServer(request.params.serverId));
  public test = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: TestMcpConnectionDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.withDiagnosticSignal(reply, (signal) =>
        this.diagnostics.test(request.params.serverId, request.body, signal),
      ),
    );
  public updateTool = (
    request: FastifyRequest<{ Params: McpServerParamsDto; Body: UpdateMcpToolDto }>,
    reply: FastifyReply,
  ) =>
    this.respond(request, reply, () =>
      this.servers.updateToolSetting(request.params.serverId, request.body),
    );
  private async withDiagnosticSignal<T>(
    reply: FastifyReply,
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => {
      if (!reply.raw.writableEnded) controller.abort();
    };
    reply.raw.once("close", abort);
    try {
      return await operation(AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]));
    } finally {
      reply.raw.off("close", abort);
    }
  }

  private redirectToOAuthResult(
    reply: FastifyReply,
    serverId: string,
    isSuccessful: boolean,
    failureMessage?: string,
  ): FastifyReply {
    let name = "MCP 服务器";
    try {
      name = this.servers.get(serverId).name;
    } catch {
      name = "MCP 服务器";
    }
    const resultUrl = new URL("/mcp-oauth/result", this.config.webUrl);
    resultUrl.searchParams.set("name", name);
    resultUrl.searchParams.set("status", isSuccessful ? "success" : "error");
    if (failureMessage !== undefined) resultUrl.searchParams.set("message", failureMessage);
    return reply.redirect(resultUrl.toString());
  }

  private async respond<T>(
    request: FastifyRequest,
    reply: FastifyReply,
    operation: () => T | Promise<T>,
  ): Promise<T | FastifyReply> {
    reply.header("Cache-Control", "no-store");
    if (request.method !== "GET" && !isMutationRequestAllowed(this.config, request))
      return rejectMutation(reply);
    try {
      const result = await operation();
      return result === undefined ? reply.status(204).send() : result;
    } catch (error: unknown) {
      const safe =
        error instanceof McpError
          ? error
          : new McpError(McpErrorCode.STORAGE_FAILED, "MCP 操作失败，请检查本地服务状态");
      request.log.warn({ code: safe.code, requestId: request.id }, "MCP operation failed");
      return reply
        .status(MCP_ERROR_STATUS[safe.code])
        .send({ code: safe.code, message: safe.message });
    }
  }
}
