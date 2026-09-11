import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const tauriRoot = join(desktopRoot, "src-tauri");
const daemonRoot = join(tauriRoot, "resources", "daemon");
const binariesRoot = join(tauriRoot, "binaries");
const targetTriple = execFileSync("rustc", ["--print", "host-tuple"], {
  encoding: "utf8",
}).trim();
const extension = process.platform === "win32" ? ".exe" : "";
const sidecarPath = join(binariesRoot, `pi-harness-node-${targetTriple}${extension}`);
const targetArchitecture = targetTriple.startsWith("aarch64")
  ? "arm64"
  : targetTriple.startsWith("x86_64")
    ? "x64"
    : targetTriple.startsWith("i686")
      ? "ia32"
      : null;

if (Number(process.versions.node.split(".")[0]) < 24) {
  throw new Error("PI Harness desktop packaging requires Node.js 24 or newer");
}
if (targetArchitecture !== process.arch) {
  throw new Error(
    `Node architecture ${process.arch} does not match the Rust target ${targetTriple}`,
  );
}

rmSync(daemonRoot, { force: true, recursive: true });
mkdirSync(daemonRoot, { recursive: true });
execFileSync(
  "pnpm",
  ["--filter", "@pi-harness/daemon", "deploy", daemonRoot, "--prod", "--legacy"],
  { cwd: workspaceRoot, stdio: "inherit" },
);

mkdirSync(binariesRoot, { recursive: true });
for (const file of readdirSync(binariesRoot)) {
  if (file.startsWith("pi-harness-node-")) rmSync(join(binariesRoot, file));
}
copyFileSync(process.execPath, sidecarPath);
if (process.platform !== "win32") chmodSync(sidecarPath, 0o755);

for (const requiredPath of [
  join(daemonRoot, "src", "bootstrap.ts"),
  join(daemonRoot, "node_modules", "tsx"),
  join(workspaceRoot, "apps", "web", "dist", "index.html"),
  sidecarPath,
]) {
  if (!existsSync(requiredPath))
    throw new Error(`Desktop bundle input is missing: ${requiredPath}`);
}
