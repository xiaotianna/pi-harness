import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { SandboxManager, SandboxRuntimeConfigSchema } from "@anthropic-ai/sandbox-runtime";
import { getOneMessage, sendMessage } from "execa";

/**
 * @typedef {{
 *   args?: string[],
 *   command: string,
 *   commandId: string,
 *   config: unknown,
 *   credentials: unknown[],
 *   environment?: Record<string, string>,
 *   mode: "command" | "process",
 *   type: "start"
 * }} SandboxWorkerInput
 */

/** @param {readonly string[]} values */
const quote = (values) =>
  values.map((value) => (value === "" ? "''" : `'${value.replaceAll("'", `'"'"'`)}'`)).join(" ");

// 配置通过父进程管道传入，不读取 workspace 或用户的 SRT 配置。
let stage = "input";
try {
  /** @type {unknown} */
  const input = await getOneMessage();
  if (
    typeof input !== "object" ||
    input === null ||
    !("type" in input) ||
    input.type !== "start" ||
    !("command" in input) ||
    typeof input.command !== "string" ||
    !input.command ||
    !("commandId" in input) ||
    typeof input.commandId !== "string" ||
    !input.commandId ||
    !("config" in input) ||
    !("credentials" in input) ||
    !Array.isArray(input.credentials) ||
    !("mode" in input) ||
    (input.mode !== "command" && input.mode !== "process") ||
    (input.mode === "process" &&
      (!("args" in input) ||
        !Array.isArray(input.args) ||
        !input.args.every((value) => typeof value === "string" && !value.includes("\0")) ||
        !("environment" in input) ||
        typeof input.environment !== "object" ||
        input.environment === null ||
        !Object.entries(input.environment).every(
          ([name, value]) =>
            /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name) &&
            typeof value === "string" &&
            !value.includes("\0"),
        )))
  ) {
    throw new Error("沙箱输入无效");
  }
  const sandboxInput = /** @type {SandboxWorkerInput} */ (input);
  const config = SandboxRuntimeConfigSchema.parse(sandboxInput.config);
  if (sandboxInput.mode === "process") {
    for (const [name, value] of Object.entries(sandboxInput.environment ?? {}))
      process.env[name] = value;
  }
  for (const credential of sandboxInput.credentials) {
    if (
      typeof credential !== "object" ||
      credential === null ||
      !("name" in credential) ||
      typeof credential.name !== "string" ||
      !("value" in credential) ||
      typeof credential.value !== "string"
    ) {
      throw new Error("沙箱凭据配置无效");
    }
  }
  const credentials = /** @type {{name: string, value: string}[]} */ (sandboxInput.credentials);
  for (const credential of credentials) {
    process.env[credential.name] = credential.value;
  }
  stage = "initialization";
  /** @param {{host: string, port: number | undefined}} request */
  const askNetwork = async ({ host, port }) => {
    const requestId = randomUUID();
    await sendMessage({ host, port, requestId, type: "network-approval" });
    const response = await getOneMessage({
      filter: (message) =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "network-approval-result" &&
        "requestId" in message &&
        message.requestId === requestId,
    });
    return (
      typeof response === "object" &&
      response !== null &&
      "allowed" in response &&
      response.allowed === true
    );
  };
  await SandboxManager.initialize(config, askNetwork, true);
  stage = "configuration";
  const command =
    sandboxInput.mode === "process"
      ? quote([sandboxInput.command, ...(sandboxInput.args ?? [])])
      : sandboxInput.command;
  const { argv, env } = await SandboxManager.wrapWithSandboxArgv(
    command,
    undefined,
    undefined,
    undefined,
    process.cwd(),
    { commandId: sandboxInput.commandId, commandText: sandboxInput.command },
  );
  // SRT 已把真实值保存在宿主代理的哨兵注册表中；启动目标前清除 worker 与外层 runner 环境副本。
  for (const credential of credentials) {
    delete process.env[credential.name];
    delete env[credential.name];
  }
  const executable = argv[0];
  if (executable === undefined) throw new Error("沙箱未返回可执行命令");
  stage = "execution";
  const child = spawn(executable, argv.slice(1), {
    cwd: process.cwd(),
    env,
    shell: false,
    stdio:
      sandboxInput.mode === "process" ? ["pipe", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
  });
  if (sandboxInput.mode === "process") {
    if (child.stdin === null || child.stdout === null || child.stderr === null) {
      throw new Error("沙箱进程管道不可用");
    }
    process.stdin.pipe(child.stdin);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }
  await sendMessage({ pid: child.pid, type: "sandbox-process" });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  await sendMessage({
    lines: SandboxManager.getSandboxViolationStore()
      .getViolationsForCommand(sandboxInput.commandId)
      .map(({ line }) => line),
    type: "violations",
  });
} catch (error) {
  const code =
    stage === "input"
      ? "SANDBOX_INPUT_INVALID"
      : stage === "initialization"
        ? "SANDBOX_INITIALIZATION_FAILED"
        : stage === "configuration"
          ? "SANDBOX_CONFIGURATION_FAILED"
          : "SANDBOX_COMMAND_START_FAILED";
  const causeCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]+$/.test(error.code)
      ? ` (${error.code})`
      : "";
  process.stderr.write(`${code}${causeCode}: 沙箱在 ${stage} 阶段失败。\n`);
  process.exitCode = 1;
} finally {
  try {
    await SandboxManager.reset();
  } catch {
    process.stderr.write("SANDBOX_CLEANUP_FAILED: 沙箱资源清理失败。\n");
    process.exitCode = 1;
  }
}
// 后台命令可能持有 stdout；父进程在收到 worker 退出后清理整个进程组。
process.exit(process.exitCode ?? 1);
