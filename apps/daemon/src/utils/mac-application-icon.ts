import { execFile } from "node:child_process";
import { glob, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ICON_TIMEOUT_MS = 10_000;
const MAX_ICON_BYTES = 256 * 1_024;
const APPLICATION_PATH_SCRIPT = `function run(argv) {
  ObjC.import("AppKit");
  const url = $.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier($(argv[0]));
  return url ? ObjC.unwrap(url.path) : "";
}`;

export async function readMacApplicationIconByBundleId(
  bundleId: string,
  signal: AbortSignal,
): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", APPLICATION_PATH_SCRIPT, bundleId],
      { encoding: "utf8", maxBuffer: 16_384, signal, timeout: ICON_TIMEOUT_MS },
    );
    const applicationPath = stdout.trim();
    return applicationPath ? readMacApplicationIcon(applicationPath, signal) : null;
  } catch {
    return null;
  }
}

export async function readMacApplicationIcon(
  applicationPath: string,
  signal: AbortSignal,
): Promise<Buffer | null> {
  const resourcesPath = join(applicationPath, "Contents", "Resources");
  let iconPath: string | null = null;
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/plutil",
      [
        "-extract",
        "CFBundleIconFile",
        "raw",
        "-o",
        "-",
        join(applicationPath, "Contents", "Info.plist"),
      ],
      { encoding: "utf8", maxBuffer: 16_384, signal, timeout: ICON_TIMEOUT_MS },
    );
    const iconName = basename(stdout.trim());
    if (iconName) {
      iconPath = join(resourcesPath, iconName.endsWith(".icns") ? iconName : `${iconName}.icns`);
    }
  } catch {
    // Some application bundles only provide an icon file without CFBundleIconFile.
  }
  if (!iconPath) {
    try {
      for await (const path of glob("*.icns", { cwd: resourcesPath })) {
        iconPath = join(resourcesPath, path);
        break;
      }
    } catch {
      return null;
    }
  }
  if (!iconPath) return null;

  const outputDirectory = await mkdtemp(join(tmpdir(), "pi-harness-app-icon-"));
  const outputPath = join(outputDirectory, "icon.png");
  try {
    await execFileAsync(
      "/usr/bin/sips",
      ["-z", "64", "64", "-s", "format", "png", iconPath, "--out", outputPath],
      { maxBuffer: 4_096, signal, timeout: ICON_TIMEOUT_MS },
    );
    const icon = await readFile(outputPath);
    return icon.byteLength <= MAX_ICON_BYTES ? icon : null;
  } catch {
    return null;
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
}
