import { spawnSync } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { platform } from "node:os";

const ENV_PATH = ".env";
const ENCRYPTED_PATH = ".env.enc";
const KEY_ENV_NAME = "PI_HARNESS_ENV_ENCRYPTION_KEY";
const KEYCHAIN_SERVICE = "pi-harness.env-encryption";
const KEYCHAIN_ACCOUNT = "pi-harness";
const FORMAT_VERSION = 1;
const ALGORITHM = "aes-256-gcm";

function fail(message) {
  throw new Error(message);
}

function parseKey(value) {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    fail(`${KEY_ENV_NAME} 必须是 64 位十六进制字符串`);
  }
  return Buffer.from(value, "hex");
}

function readKeychainKey() {
  if (platform() !== "darwin") return undefined;
  const result = spawnSync(
    "/usr/bin/security",
    ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
    { encoding: "utf8" },
  );
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function storeKeychainKey(value) {
  if (platform() !== "darwin") {
    fail(`当前系统不支持 Mac 钥匙串，请通过 ${KEY_ENV_NAME} 提供密钥`);
  }
  const result = spawnSync(
    "/usr/bin/security",
    ["add-generic-password", "-U", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w", value],
    { encoding: "utf8" },
  );
  if (result.status !== 0) fail(result.stderr.trim() || "无法写入 Mac 钥匙串");
}

function getKey({ create = false } = {}) {
  const configured = process.env[KEY_ENV_NAME]?.trim() || readKeychainKey();
  if (configured) return parseKey(configured);
  if (!create) {
    fail(`未找到解密密钥，请设置 ${KEY_ENV_NAME} 后运行 pnpm env:key:store`);
  }
  const generated = randomBytes(32).toString("hex");
  storeKeychainKey(generated);
  return parseKey(generated);
}

function encrypt(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return `${JSON.stringify({
    algorithm: ALGORITHM,
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    version: FORMAT_VERSION,
  })}\n`;
}

function decrypt(source, key) {
  let payload;
  try {
    payload = JSON.parse(source);
  } catch {
    fail(`${ENCRYPTED_PATH} 不是有效的加密文件`);
  }
  if (
    payload?.version !== FORMAT_VERSION ||
    payload.algorithm !== ALGORITHM ||
    typeof payload.iv !== "string" ||
    typeof payload.tag !== "string" ||
    typeof payload.ciphertext !== "string"
  ) {
    fail(`${ENCRYPTED_PATH} 的格式或算法不受支持`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  try {
    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]);
  } catch {
    fail("解密失败：密钥错误或加密文件已损坏");
  }
}

function atomicWrite(path, contents, mode) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, contents, { mode });
  renameSync(temporaryPath, path);
}

function run(command) {
  if (command === "encrypt") {
    atomicWrite(ENCRYPTED_PATH, encrypt(readFileSync(ENV_PATH), getKey({ create: true })), 0o600);
    console.log(`${ENCRYPTED_PATH} 已更新`);
    return;
  }
  if (command === "decrypt") {
    atomicWrite(ENV_PATH, decrypt(readFileSync(ENCRYPTED_PATH, "utf8"), getKey()), 0o600);
    console.log(`${ENV_PATH} 已恢复`);
    return;
  }
  if (command === "check") {
    const expected = readFileSync(ENV_PATH);
    const actual = decrypt(readFileSync(ENCRYPTED_PATH, "utf8"), getKey());
    if (!expected.equals(actual)) fail(`${ENV_PATH} 与 ${ENCRYPTED_PATH} 内容不一致`);
    console.log(`${ENCRYPTED_PATH} 校验通过`);
    return;
  }
  if (command === "copy-key") {
    if (platform() !== "darwin") fail("当前系统不支持 pbcopy");
    const result = spawnSync("/usr/bin/pbcopy", { input: getKey().toString("hex") });
    if (result.status !== 0) fail("无法复制恢复密钥");
    console.log("恢复密钥已复制到剪贴板，请保存到密码管理器");
    return;
  }
  if (command === "store-key") {
    const value = process.env[KEY_ENV_NAME]?.trim();
    if (!value) fail(`请通过 ${KEY_ENV_NAME} 提供恢复密钥`);
    parseKey(value);
    storeKeychainKey(value);
    console.log("恢复密钥已写入 Mac 钥匙串");
    return;
  }
  fail("用法：pnpm env:encrypt|env:decrypt|env:check|env:key:copy|env:key:store");
}

try {
  run(process.argv[2]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
