import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const envPath = new URL(".env", root);
const keyPath = new URL(".env.key", root);
const encryptedPath = new URL(".env.enc", root);
const header = Buffer.from("PIENV1");

function encrypt(plaintext, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(header);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([header, nonce, cipher.getAuthTag(), ciphertext]);
}

function decrypt(payload, key) {
  if (payload.length < 34 || !payload.subarray(0, 6).equals(header)) {
    throw new Error("Invalid encrypted file format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(6, 18));
  decipher.setAAD(header);
  decipher.setAuthTag(payload.subarray(18, 34));
  // Authentication must succeed before any plaintext is written.
  return Buffer.concat([decipher.update(payload.subarray(34)), decipher.final()]);
}

function check() {
  const key = randomBytes(32);
  const plaintext = Buffer.from("API_KEY=example\n");
  const payload = encrypt(plaintext, key);
  assert.deepEqual(decrypt(payload, key), plaintext);
  assert.deepEqual(decrypt(encrypt(Buffer.alloc(0), key), key), Buffer.alloc(0));
  assert.throws(() => decrypt(payload, randomBytes(32)));
  for (let index = 0; index < payload.length; index += 1) {
    const damaged = Buffer.from(payload);
    damaged[index] ^= 1;
    assert.throws(() => decrypt(damaged, key));
  }
  assert.throws(() => decrypt(payload.subarray(0, 33), key));
  console.log("Encryption round-trip, wrong-key and tampering checks passed.");
}

function main() {
  const [mode, ...extra] = process.argv.slice(2);
  if (extra.length || !["encrypt", "decrypt", "check"].includes(mode)) {
    throw new Error("Usage: node scripts/env-crypt.mjs <encrypt|decrypt|check>");
  }
  if (mode === "check") return check();

  const input = readFileSync(mode === "encrypt" ? envPath : encryptedPath);
  if (mode === "encrypt" && !existsSync(keyPath)) {
    if (existsSync(encryptedPath)) {
      throw new Error("Restore .env.key before replacing existing .env.enc.");
    }
    writeFileSync(keyPath, `${randomBytes(32).toString("hex")}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  const encodedKey = readFileSync(keyPath, "utf8").trim();
  if (!/^[a-fA-F0-9]{64}$/.test(encodedKey)) throw new Error("Invalid .env.key.");
  const key = Buffer.from(encodedKey, "hex");

  if (mode === "encrypt") {
    const payload = encrypt(input, key);
    assert.deepEqual(decrypt(payload, key), input);
    const temporaryPath = new URL(`.env.enc.${randomBytes(8).toString("hex")}.tmp`, root);
    writeFileSync(temporaryPath, payload, { flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, encryptedPath);
    console.log("Created .env.enc. Back up .env.key separately; never commit it.");
  } else {
    writeFileSync(envPath, decrypt(input, key), { flag: "wx", mode: 0o600 });
    console.log("Restored .env.");
  }
}

try {
  main();
} catch {
  console.error(
    "Operation failed. Check command, input files, .env.key and permissions. Decryption requires .env to be absent and an intact .env.enc.",
  );
  process.exitCode = 1;
}
