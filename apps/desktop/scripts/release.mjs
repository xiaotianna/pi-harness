import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(readFileSync(join(desktopRoot, "package.json"), "utf8"));
const environment = process.env;

if (process.platform !== "darwin") {
  throw new Error("PI Harness 的正式 DMG 必须在 macOS 上构建");
}
if (Number(process.versions.node.split(".")[0]) < 24) {
  throw new Error("PI Harness 的正式发布需要 Node.js 24 或更高版本");
}
if (!environment.APPLE_SIGNING_IDENTITY || environment.APPLE_SIGNING_IDENTITY === "-") {
  throw new Error("缺少正式发布用的 APPLE_SIGNING_IDENTITY");
}

const hasAppleIdCredentials = ["APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"].every(
  (name) => environment[name],
);
const hasApiCredentials = ["APPLE_API_ISSUER", "APPLE_API_KEY", "APPLE_API_KEY_PATH"].every(
  (name) => environment[name],
);
if (!hasAppleIdCredentials && !hasApiCredentials) {
  throw new Error(
    "缺少 Apple 公证凭据；配置 APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID，或 APPLE_API_ISSUER/APPLE_API_KEY/APPLE_API_KEY_PATH",
  );
}

execFileSync(
  "pnpm",
  [
    "exec",
    "tauri",
    "build",
    "--config",
    "src-tauri/tauri.bundle.conf.json",
    "--bundles",
    "app,dmg",
  ],
  {
    cwd: desktopRoot,
    env: {
      ...environment,
      PI_HARNESS_APP_VERSION: packageJson.version,
      PI_HARNESS_RELEASE: "1",
    },
    stdio: "inherit",
  },
);

const app = join(
  desktopRoot,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "macos",
  "PI Harness.app",
);
const dmgDirectory = join(desktopRoot, "src-tauri", "target", "release", "bundle", "dmg");
const dmg = existsSync(dmgDirectory)
  ? readdirSync(dmgDirectory)
      .filter((file) => file.endsWith(".dmg") && file.includes(`_${packageJson.version}_`))
      .map((file) => join(dmgDirectory, file))[0]
  : undefined;

if (!existsSync(app) || !dmg) {
  throw new Error("Tauri 未生成预期的 App 和 DMG 发布产物");
}

execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], {
  stdio: "inherit",
});
execFileSync("/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=4", app], {
  stdio: "inherit",
});
execFileSync("/usr/bin/xcrun", ["stapler", "validate", app], { stdio: "inherit" });
execFileSync("/usr/bin/hdiutil", ["verify", dmg], { stdio: "inherit" });

console.log(`正式安装包已生成并通过签名、公证校验：${dmg}`);
