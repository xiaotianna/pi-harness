import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = [];

async function isReachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(500) });
    return true;
  } catch {
    return false;
  }
}

function start(packageName) {
  const child = spawn(executable, ["--dir", workspaceRoot, "--filter", packageName, "dev"], {
    stdio: "inherit",
  });
  children.push(child);
  child.once("exit", (code) => {
    if (code) process.exitCode = code;
  });
}

if (!(await isReachable("http://127.0.0.1:4310/api/health"))) {
  start("@pi-harness/daemon");
}
if (!(await isReachable("http://127.0.0.1:5173"))) {
  start("@pi-harness/web");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    for (const child of children) child.kill(signal);
  });
}
