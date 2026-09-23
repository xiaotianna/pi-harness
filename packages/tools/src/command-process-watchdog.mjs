import { spawn } from "node:child_process";

const targetPid = Number(process.argv[2]);
if (!Number.isSafeInteger(targetPid) || targetPid <= 0) process.exit(2);

let isArmed = true;

function terminateTarget() {
  if (!isArmed) return;
  isArmed = false;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(targetPid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      }).unref();
    } else {
      process.kill(-targetPid, "SIGKILL");
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) {
      process.exitCode = 1;
    }
  }
  process.exit();
}

process.once("disconnect", terminateTarget);
process.on("message", (message) => {
  if (typeof message !== "object" || message === null || !("type" in message)) return;
  if (message.type !== "release") return;
  isArmed = false;
  process.exit();
});

if (!process.connected) terminateTarget();
else process.send?.({ type: "ready" }, (error) => error && terminateTarget());
