import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") throw new Error("Computer Use requires macOS");

const releaseDir = fileURLToPath(new URL("../native/target/release/", import.meta.url));
const app = join(releaseDir, "PI Harness Computer Use.app");
const contents = join(app, "Contents");
const executable = join(contents, "MacOS", "pi-computer-use-helper");
const resources = join(contents, "Resources");

rmSync(app, { recursive: true, force: true });
mkdirSync(join(contents, "MacOS"), { recursive: true });
mkdirSync(resources, { recursive: true });
copyFileSync(join(releaseDir, "pi-computer-use-helper"), executable);
copyFileSync(
  fileURLToPath(new URL("../native/assets/icon.icns", import.meta.url)),
  join(resources, "icon.icns"),
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
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSBackgroundOnly</key><true/>
<key>NSScreenCaptureUsageDescription</key><string>PI Harness 需要截取当前目标窗口，以便在你确认后执行电脑操作。</string>
</dict></plist>
`,
);
execFileSync(
  "/usr/bin/codesign",
  [
    "--force",
    "--sign",
    process.env.COMPUTER_USE_CODESIGN_IDENTITY || process.env.APPLE_SIGNING_IDENTITY || "-",
    app,
  ],
  { stdio: "inherit" },
);
