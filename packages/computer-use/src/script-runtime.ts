import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { type SandboxedProcess, spawnSandboxedProcess } from "@pi-harness/sandbox";
import { Value } from "typebox/value";
import type { ComputerUseClient } from "./client.js";
import { type ComputerAction, ComputerActionSchema, type ComputerObservation } from "./protocol.js";

const MAX_ACTIONS = 25;
const MAX_CODE_LENGTH = 20_000;
const MAX_EXECUTION_MS = 30_000;
const MAX_OUTPUT_BYTES = 200_000;
const MAX_STEPS = 50;

const SANDBOX_BOOTSTRAP_SOURCE = `
(() => {
  "use strict";
  const callHost = globalThis.__hostRpc;
  const writeHost = globalThis.__hostLog;
  delete globalThis.__hostRpc;
  delete globalThis.__hostLog;
  let lastState = null;
  const printable = (value) => {
    if (typeof value === "string") return value;
    if (value === undefined) return "undefined";
    try { return JSON.stringify(value); } catch { return String(value); }
  };
  const rpc = (method, args = {}) => new Promise((resolve, reject) => {
    callHost(method, args, (payload) => {
      try {
        const message = JSON.parse(payload);
        if (message.ok) resolve(message.result);
        else reject(new Error(message.error || "Computer operation failed"));
      } catch (error) {
        reject(error);
      }
    });
  });
  const observe = async () => {
    lastState = await rpc("observe");
    return lastState;
  };
  const act = async (action) => {
    lastState = await rpc("act", { action });
    return lastState;
  };
  const cua = {
    act,
    click: (args) => act({ button: args?.button, kind: "click", point: args?.point }),
    drag: (args) => act({ durationMs: args?.durationMs, from: args?.from, kind: "drag", to: args?.to }),
    observe,
    performAction: (args) => act({ action: args?.action, elementId: args?.elementId, kind: "perform_action" }),
    press: (args) => act({ elementId: args?.elementId, kind: "press" }),
    pressKey: (args) => act({ key: args?.key, kind: "press_key", modifiers: args?.modifiers }),
    scroll: (args) => act({ deltaX: args?.deltaX, deltaY: args?.deltaY, kind: "scroll", point: args?.point }),
    setValue: (args) => act({ elementId: args?.elementId, kind: "set_value", value: args?.value }),
    typeText: (text) => act({ kind: "type_text", text }),
    wait: (ms) => rpc("wait", { ms }),
  };
  Object.defineProperty(cua, "state", { enumerable: true, get: () => lastState });
  Object.freeze(cua);
  Object.defineProperties(globalThis, {
    console: {
      enumerable: true,
      value: Object.freeze({ log: (...values) => writeHost(values.map(printable).join(" ")) }),
      writable: false,
    },
    cua: { enumerable: true, value: cua, writable: false },
  });
})();
`;

const WORKER_SOURCE = String.raw`
import vm from "node:vm";

let inputBuffer = "";
let currentExecutionId = null;
let nextCallId = 0;
const pending = new Map();
const logs = [];

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function hostRpc(method, args, complete) {
  if (currentExecutionId === null) {
    complete(JSON.stringify({ error: "No active execution", ok: false }));
    return;
  }
  const callId = String(++nextCallId);
  send({ args, callId, executionId: currentExecutionId, method, type: "call" });
  pending.set(callId, complete);
}
Object.setPrototypeOf(hostRpc, null);

function hostLog(value) {
  logs.push(String(value));
}
Object.setPrototypeOf(hostLog, null);

const sandbox = Object.create(null);
Object.defineProperties(sandbox, {
  __hostLog: { configurable: true, value: hostLog, writable: false },
  __hostRpc: { configurable: true, value: hostRpc, writable: false },
});
const context = vm.createContext(sandbox, {
  codeGeneration: { strings: false, wasm: false },
  name: "pi-harness-computer-use",
});
new vm.Script(${JSON.stringify(SANDBOX_BOOTSTRAP_SOURCE)}).runInContext(context, { timeout: 1000 });

async function execute(message) {
  currentExecutionId = message.id;
  logs.length = 0;
  try {
    const source = "(async () => {\n\"use strict\";\n" + message.code + "\n})()";
    const script = new vm.Script(source, { filename: "computer-exec.js" });
    const result = await script.runInContext(context, { timeout: 1000 });
    if (pending.size > 0) {
      throw new Error(
        "COMPUTER_SCRIPT_UNAWAITED_CALL: 脚本结束时仍有电脑操作未完成；所有 cua 调用都必须 await",
      );
    }
    send({ id: message.id, logs: [...logs], result, type: "completed" });
  } catch (error) {
    send({
      error: error instanceof Error ? error.message : String(error),
      id: message.id,
      type: "failed",
    });
  } finally {
    currentExecutionId = null;
  }
}

function consume(line) {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message?.type === "rpc_result") {
    const complete = pending.get(message.callId);
    if (!complete) return;
    pending.delete(message.callId);
    complete(JSON.stringify({
      error: message.error,
      ok: message.ok === true,
      result: message.result,
    }));
    return;
  }
  if (message?.type === "execute" && typeof message.id === "string" && typeof message.code === "string") {
    void execute(message);
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
  for (;;) {
    const newline = inputBuffer.indexOf("\n");
    if (newline < 0) break;
    const line = inputBuffer.slice(0, newline);
    inputBuffer = inputBuffer.slice(newline + 1);
    if (line.trim()) consume(line);
  }
});
`;

export interface ComputerScriptResult {
  logs: readonly string[];
  observation?: ComputerObservation;
  result: unknown;
}

export interface ComputerUseRuntimeClient {
  act: ComputerUseClient["act"];
  close(): void;
  observe: ComputerUseClient["observe"];
}

interface ActiveExecution {
  actionCount: number;
  app: string;
  cleanup: () => void;
  id: string;
  latestObservation?: ComputerObservation;
  reject: (error: Error) => void;
  resolve: (result: ComputerScriptResult) => void;
  signal: AbortSignal;
  stepCount: number;
}

interface WorkerMessage {
  args?: unknown;
  callId?: unknown;
  error?: unknown;
  executionId?: unknown;
  id?: unknown;
  logs?: unknown;
  method?: unknown;
  result?: unknown;
  type?: unknown;
}

function publicObservation(observation: ComputerObservation) {
  const { screenshot, ...details } = observation;
  return { ...details, hasScreenshot: screenshot !== undefined };
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
}

export class ComputerUseScriptRuntime {
  private active: ActiveExecution | null = null;
  private buffer = "";
  private process: SandboxedProcess | null = null;
  private stderr = "";

  public constructor(
    private readonly client: ComputerUseRuntimeClient,
    private readonly scopeId: string,
    private readonly workspaceRoot: string,
  ) {}

  public async execute(
    app: string,
    code: string,
    signal?: AbortSignal,
  ): Promise<ComputerScriptResult> {
    if (!code.trim() || code.length > MAX_CODE_LENGTH) {
      throw new Error("COMPUTER_SCRIPT_INVALID: code 必须为 1 到 20000 个字符");
    }
    if (this.active !== null) throw new Error("COMPUTER_SCRIPT_BUSY: 已有脚本正在执行");
    const executionSignal = AbortSignal.any([
      AbortSignal.timeout(MAX_EXECUTION_MS),
      ...(signal === undefined ? [] : [signal]),
    ]);
    executionSignal.throwIfAborted();
    const sandboxed = await this.ensureProcess(executionSignal);
    const id = randomUUID();
    return new Promise<ComputerScriptResult>((resolve, reject) => {
      const abort = () => {
        this.finish(new Error("COMPUTER_SCRIPT_ABORTED: 脚本执行已中止"));
        void this.close();
      };
      this.active = {
        actionCount: 0,
        app,
        cleanup: () => executionSignal.removeEventListener("abort", abort),
        id,
        reject,
        resolve,
        signal: executionSignal,
        stepCount: 0,
      };
      executionSignal.addEventListener("abort", abort, { once: true });
      sandboxed.process.stdin.write(
        `${JSON.stringify({ code, id, type: "execute" })}\n`,
        (error) => {
          if (error) {
            this.finish(error);
          }
        },
      );
    });
  }

  public async close(): Promise<void> {
    const sandboxed = this.process;
    this.process = null;
    this.buffer = "";
    if (sandboxed !== null) await sandboxed.close();
    this.client.close();
  }

  private async ensureProcess(signal: AbortSignal): Promise<SandboxedProcess> {
    if (this.process !== null) return this.process;
    const sandboxed = await spawnSandboxedProcess({
      allowedDomains: ["localhost.invalid"],
      args: ["--input-type=module", "-e", WORKER_SOURCE],
      command: process.execPath,
      commandId: `computer-exec:${this.scopeId}`,
      deniedDomains: ["*"],
      environment: {},
      isWorkspaceWritable: false,
      protectedPaths: [],
      readPaths: [dirname(process.execPath)],
      signal,
      workspaceRoot: this.workspaceRoot,
    });
    this.process = sandboxed;
    sandboxed.process.stdout.setEncoding("utf8");
    sandboxed.process.stderr.setEncoding("utf8");
    sandboxed.process.stdout.on("data", (chunk: string) => this.consume(chunk));
    sandboxed.process.stderr.on("data", (chunk: string) => {
      this.stderr = `${this.stderr}${chunk}`.slice(-2_000);
    });
    sandboxed.process.once("exit", () => {
      if (this.process === sandboxed) this.process = null;
      this.finish(
        new Error(
          `COMPUTER_SCRIPT_RUNTIME_EXITED${this.stderr.trim() ? `: ${this.stderr.trim()}` : ""}`,
        ),
      );
    });
    return sandboxed;
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer) > MAX_OUTPUT_BYTES) {
      this.finish(new Error("COMPUTER_SCRIPT_OUTPUT_TOO_LARGE: 脚本输出超过限制"));
      void this.close();
      return;
    }
    for (;;) {
      const newline = this.buffer.indexOf("\n");
      if (newline < 0) return;
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message: WorkerMessage;
      try {
        message = JSON.parse(line) as WorkerMessage;
      } catch {
        this.finish(new Error("COMPUTER_SCRIPT_PROTOCOL_ERROR: 脚本运行时返回无效 JSON"));
        void this.close();
        return;
      }
      this.handleMessage(message);
    }
  }

  private handleMessage(message: WorkerMessage): void {
    const active = this.active;
    if (active === null) return;
    if (message.type === "call") {
      if (
        message.executionId !== active.id ||
        typeof message.callId !== "string" ||
        typeof message.method !== "string"
      ) {
        this.finish(new Error("COMPUTER_SCRIPT_PROTOCOL_ERROR: 无效的能力调用"));
        return;
      }
      void this.handleCall(active, message.callId, message.method, message.args);
      return;
    }
    if (message.id !== active.id) return;
    if (message.type === "failed") {
      const workerError = String(message.error).slice(0, 2_000);
      this.finish(new Error(`COMPUTER_SCRIPT_FAILED: ${workerError}`));
      if (workerError.startsWith("COMPUTER_SCRIPT_UNAWAITED_CALL:")) void this.close();
      return;
    }
    if (message.type !== "completed" || !Array.isArray(message.logs)) {
      this.finish(new Error("COMPUTER_SCRIPT_PROTOCOL_ERROR: 无效的脚本结果"));
      return;
    }
    const logs = message.logs.filter((value): value is string => typeof value === "string");
    this.finish(undefined, {
      logs,
      ...(active.latestObservation === undefined ? {} : { observation: active.latestObservation }),
      result: message.result,
    });
  }

  private async handleCall(
    active: ActiveExecution,
    callId: string,
    method: string,
    args: unknown,
  ): Promise<void> {
    if (this.active !== active) return;
    active.stepCount += 1;
    try {
      if (active.stepCount > MAX_STEPS) {
        throw new Error(`脚本最多执行 ${MAX_STEPS} 个电脑控制步骤`);
      }
      let result: unknown;
      if (method === "observe") {
        active.latestObservation = await this.client.observe(
          this.scopeId,
          { app: active.app, includeScreenshot: true },
          active.signal,
        );
        result = publicObservation(active.latestObservation);
      } else if (method === "act") {
        if (active.latestObservation === undefined) {
          throw new Error("执行动作前必须先调用 cua.observe()");
        }
        const action =
          typeof args === "object" && args !== null && "action" in args
            ? (args as { action: unknown }).action
            : undefined;
        if (!Value.Check(ComputerActionSchema, action)) throw new Error("动作参数无效");
        active.actionCount += 1;
        if (active.actionCount > MAX_ACTIONS) {
          throw new Error(`脚本最多执行 ${MAX_ACTIONS} 个输入动作`);
        }
        await this.client.act(
          this.scopeId,
          active.latestObservation.observationId,
          action as ComputerAction,
          active.signal,
        );
        active.latestObservation = await this.client.observe(
          this.scopeId,
          { app: active.app, includeScreenshot: true },
          active.signal,
        );
        result = publicObservation(active.latestObservation);
      } else if (method === "wait") {
        const ms =
          typeof args === "object" && args !== null && "ms" in args
            ? (args as { ms: unknown }).ms
            : undefined;
        if (!Number.isInteger(ms) || (ms as number) < 0 || (ms as number) > 5_000) {
          throw new Error("cua.wait() 只接受 0 到 5000 毫秒的整数");
        }
        await delay(ms as number, undefined, { signal: active.signal });
        result = null;
      } else {
        throw new Error("脚本请求了未授权的能力");
      }
      this.reply(callId, { ok: true, result });
    } catch (error: unknown) {
      this.reply(callId, { error: errorMessage(error), ok: false });
    }
  }

  private reply(callId: string, result: { error?: string; ok: boolean; result?: unknown }): void {
    this.process?.process.stdin.write(
      `${JSON.stringify({ callId, type: "rpc_result", ...result })}\n`,
    );
  }

  private finish(error?: Error, result?: ComputerScriptResult): void {
    const active = this.active;
    if (active === null) return;
    this.active = null;
    active.cleanup();
    if (error !== undefined) active.reject(error);
    else if (result !== undefined) active.resolve(result);
  }
}
