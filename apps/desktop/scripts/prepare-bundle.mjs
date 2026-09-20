import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const desktopRoot = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const tauriRoot = join(desktopRoot, "src-tauri");
const desktopPackage = JSON.parse(readFileSync(join(desktopRoot, "package.json"), "utf8"));
const daemonRoot = join(tauriRoot, "resources", "daemon");
const desktopOAuthPath = join(daemonRoot, "desktop-oauth.env");
const binariesRoot = join(tauriRoot, "binaries");
const computerUseManifest = join(workspaceRoot, "packages", "computer-use", "native", "Cargo.toml");
const computerUseBinary = join(
  workspaceRoot,
  "packages",
  "computer-use",
  "native",
  "target",
  "release",
  `pi-computer-use-helper${process.platform === "win32" ? ".exe" : ""}`,
);
const targetTriple = execFileSync("rustc", ["--print", "host-tuple"], {
  encoding: "utf8",
}).trim();
const extension = process.platform === "win32" ? ".exe" : "";
const sidecarPath = join(binariesRoot, `pi-harness-node-${targetTriple}${extension}`);
const computerUseSidecarPath = join(
  binariesRoot,
  `pi-computer-use-helper-${targetTriple}${extension}`,
);
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
  [
    "--config.node-linker=hoisted",
    "--filter",
    "@pi-harness/daemon",
    "deploy",
    daemonRoot,
    "--prod",
    "--legacy",
  ],
  { cwd: workspaceRoot, stdio: "inherit" },
);
const workspaceEnvironmentPath = join(workspaceRoot, ".env");
const workspaceEnvironment = existsSync(workspaceEnvironmentPath)
  ? parseEnv(readFileSync(workspaceEnvironmentPath, "utf8"))
  : {};
const githubClientId =
  process.env.PI_HARNESS_GITHUB_CLIENT_ID || workspaceEnvironment.PI_HARNESS_GITHUB_CLIENT_ID;
if (!githubClientId) {
  throw new Error("Desktop packaging requires PI_HARNESS_GITHUB_CLIENT_ID");
}
writeFileSync(desktopOAuthPath, `PI_HARNESS_GITHUB_CLIENT_ID=${JSON.stringify(githubClientId)}\n`, {
  mode: 0o600,
});
execFileSync("cargo", ["build", "--manifest-path", computerUseManifest, "--release"], {
  cwd: workspaceRoot,
  stdio: "inherit",
});
if (process.platform === "darwin") {
  execFileSync("node", [join(workspaceRoot, "packages/computer-use/scripts/prepare-app.mjs")], {
    cwd: workspaceRoot,
    env: { ...process.env, PI_HARNESS_APP_VERSION: desktopPackage.version },
    stdio: "inherit",
  });
}

mkdirSync(binariesRoot, { recursive: true });
for (const file of readdirSync(binariesRoot)) {
  if (file.startsWith("pi-harness-node-") || file.startsWith("pi-computer-use-helper-")) {
    rmSync(join(binariesRoot, file));
  }
}
copyFileSync(process.execPath, sidecarPath);
copyFileSync(computerUseBinary, computerUseSidecarPath);
if (process.platform !== "win32") {
  chmodSync(sidecarPath, 0o755);
  chmodSync(computerUseSidecarPath, 0o755);
}

for (const requiredPath of [
  join(daemonRoot, "src", "bootstrap.ts"),
  desktopOAuthPath,
  join(daemonRoot, "node_modules", "tsx"),
  join(workspaceRoot, "apps", "web", "dist", "index.html"),
  computerUseSidecarPath,
  sidecarPath,
]) {
  if (!existsSync(requiredPath))
    throw new Error(`Desktop bundle input is missing: ${requiredPath}`);
}
