import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw new Error("Computer Use requires macOS");

const releaseDir = fileURLToPath(new URL("../native/target/release/", import.meta.url));
const app = join(releaseDir, "PI Harness Computer Use.app");
const contents = join(app, "Contents");
const executable = join(contents, "MacOS", "pi-computer-use-helper");
const overlay = join(contents, "Helpers", "pi-computer-use-overlay");
const resources = join(contents, "Resources");
const localSigningName = "PI Harness Local Code Signing";
const isDistribution = process.env.PI_HARNESS_RELEASE === "1";
const appVersion = process.env.PI_HARNESS_APP_VERSION || "0.1.0";

function findLocalSigningIdentity() {
  try {
    const output = execFileSync(
      "/usr/bin/security",
      ["find-certificate", "-a", "-Z", "-c", localSigningName],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return output.match(/^SHA-1 hash: ([A-F0-9]{40})$/m)?.[1];
  } catch {
    return undefined;
  }
}

rmSync(app, { recursive: true, force: true });
mkdirSync(join(contents, "MacOS"), { recursive: true });
mkdirSync(join(contents, "Helpers"), { recursive: true });
mkdirSync(resources, { recursive: true });
copyFileSync(join(releaseDir, "pi-computer-use-helper"), executable);
execFileSync(
  "/usr/bin/swiftc",
  [
    "-O",
    "-target",
    `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-macosx14.0`,
    "-module-cache-path",
    join(tmpdir(), "pi-harness-computer-use-swift-modules"),
    "-framework",
    "AppKit",
    fileURLToPath(new URL("../native/computer-use-overlay.swift", import.meta.url)),
    "-o",
    overlay,
  ],
  { stdio: "inherit" },
);
copyFileSync(
  fileURLToPath(new URL("../native/assets/icon.icns", import.meta.url)),
  join(resources, "icon.icns"),
);
copyFileSync(
  fileURLToPath(new URL("../native/assets/cursor.svg", import.meta.url)),
  join(resources, "cursor.svg"),
);
chmodSync(executable, 0o755);
writeFileSync(
  join(contents, "Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.piharness.computer-use</string>
<key>CFBundleName</key><string>PI Harness Computer Use</string>
<key>CFBundleDisplayName</key><string>PI Harness Computer Use</string>
<key>CFBundleExecutable</key><string>pi-computer-use-helper</string>
<key>CFBundleIconFile</key><string>icon.icns</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>${appVersion}</string>
<key>CFBundleVersion</key><string>${appVersion}</string>
<key>LSUIElement</key><true/>
<key>NSScreenCaptureUsageDescription</key><string>PI Harness 需要截取当前目标窗口，以便在你确认后执行电脑操作。</string>
</dict></plist>
`,
);
const signingIdentity = isDistribution
  ? process.env.APPLE_SIGNING_IDENTITY
  : process.env.COMPUTER_USE_CODESIGN_IDENTITY ||
    process.env.APPLE_SIGNING_IDENTITY ||
    findLocalSigningIdentity();
if (isDistribution && (!signingIdentity || signingIdentity === "-")) {
  throw new Error("正式发布必须使用 APPLE_SIGNING_IDENTITY 签名 Computer Use");
}
if (!signingIdentity) {
  console.warn("Computer Use 使用临时签名；重建后 macOS 可能要求重置并重新授予权限。");
}
const signingArgs = isDistribution ? ["--options", "runtime", "--timestamp"] : [];
for (const target of [overlay, app]) {
  execFileSync(
    "/usr/bin/codesign",
    ["--force", ...signingArgs, "--sign", signingIdentity || "-", target],
    { stdio: "inherit" },
  );
}
