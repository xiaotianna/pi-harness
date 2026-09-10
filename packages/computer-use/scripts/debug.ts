import { constants } from "node:fs";
import { access, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  ComputerActionKind,
  ComputerUseClient,
  ComputerUseError,
  createComputerActTool,
  createComputerObserveTool,
  type ImageContent,
} from "../src/index.js";

const DEFAULT_HELPER_PATH = fileURLToPath(
  new URL("../native/target/release/pi-computer-use-helper", import.meta.url),
);
const helperPath = process.env.COMPUTER_USE_HELPER_PATH ?? DEFAULT_HELPER_PATH;
const delayMs = Number(process.env.COMPUTER_USE_DEBUG_DELAY_MS ?? 3_000);
const mode = process.argv[2];
const pressElementId = readPressElementId(process.argv);

if (mode !== "client" && mode !== "tools") {
  throw new Error("调试模式必须是 client 或 tools");
}
if (!Number.isFinite(delayMs) || delayMs < 0) {
  throw new Error("COMPUTER_USE_DEBUG_DELAY_MS 必须是非负数");
}

await access(helperPath, constants.X_OK).catch(() => {
  throw new Error(`找不到可执行 helper，请先运行 native:build：${helperPath}`);
});

console.log(`${delayMs}ms 后观察前台窗口，请切换到目标应用…`);
await setTimeout(delayMs);

const client = new ComputerUseClient({ helperPath, timeoutMs: 30_000 });
try {
  if (mode === "client") await debugClient(client, pressElementId);
  else await debugTools(client, pressElementId);
} catch (error: unknown) {
  if (error instanceof ComputerUseError) {
    console.error(`[${error.code}] ${error.message}`);
    process.exitCode = 1;
  } else if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  client.close();
}

async function debugClient(client: ComputerUseClient, elementId: number | null): Promise<void> {
  const scopeId = "debug-client";
  let observation = await client.observe(scopeId);
  await printObservation("Client observation", observation, "/tmp/pi-computer-use-client.png");

  if (elementId === null) return;
  await client.act(scopeId, observation.observationId, {
    elementId,
    kind: ComputerActionKind.PRESS,
  });
  observation = await client.observe(scopeId);
  await printObservation(
    "Client observation after action",
    observation,
    "/tmp/pi-computer-use-client-after.png",
  );
}

async function debugTools(client: ComputerUseClient, elementId: number | null): Promise<void> {
  const scopeId = "debug-tools";
  const observeTool = createComputerObserveTool(client, scopeId);
  const actTool = createComputerActTool(client, scopeId);
  const signal = AbortSignal.timeout(30_000);
  let result = await observeTool.execute("debug-observe-1", { includeScreenshot: true }, signal);
  await printToolResult("Tool observation", result, "/tmp/pi-computer-use-tool.png");

  if (elementId === null) return;
  await actTool.execute(
    "debug-act-1",
    {
      action: { elementId, kind: ComputerActionKind.PRESS },
      observationId: result.details.observationId,
    },
    signal,
  );
  result = await observeTool.execute("debug-observe-2", { includeScreenshot: true }, signal);
  await printToolResult(
    "Tool observation after action",
    result,
    "/tmp/pi-computer-use-tool-after.png",
  );
}

async function printObservation(
  label: string,
  observation: {
    accessibilityTree: string;
    application: { bundleId: string; name: string; pid: number };
    observationId: string;
    screenshot?: ImageContent;
  },
  screenshotPath: string,
): Promise<void> {
  console.log(`\n${label}`);
  console.log({
    application: observation.application,
    observationId: observation.observationId,
    screenshotBytes: observation.screenshot?.data.length ?? 0,
  });
  console.log(observation.accessibilityTree);
  if (observation.screenshot === undefined) return;
  await writeFile(screenshotPath, Buffer.from(observation.screenshot.data, "base64"));
  console.log(`截图已写入 ${screenshotPath}`);
}

async function printToolResult(
  label: string,
  result: Awaited<ReturnType<ReturnType<typeof createComputerObserveTool>["execute"]>>,
  screenshotPath: string,
): Promise<void> {
  const screenshot = result.content.find((block) => block.type === "image");
  console.log(`\n${label}`);
  console.log({
    application: result.details.application,
    contentTypes: result.content.map((block) => block.type),
    observationId: result.details.observationId,
    screenshotBytes: screenshot?.type === "image" ? screenshot.data.length : 0,
  });
  console.log(result.details.accessibilityTree);
  if (screenshot?.type !== "image") return;
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  console.log(`截图已写入 ${screenshotPath}`);
}

function readPressElementId(args: readonly string[]): number | null {
  const index = args.indexOf("--press");
  if (index < 0) return null;
  const elementId = Number(args[index + 1]);
  if (!Number.isInteger(elementId) || elementId < 0) {
    throw new Error("--press 后必须提供非负整数 elementId");
  }
  return elementId;
}
