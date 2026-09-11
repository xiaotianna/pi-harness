import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { SandboxProfile, type SandboxProfile as SandboxProfileValue } from "./sandbox-profile.js";

export interface SandboxNetworkPolicy {
  allowedDomains: string[];
  deniedDomains: string[];
}

export interface SandboxCredential {
  injectHosts: readonly string[];
  name: string;
  value: string;
}

export interface SandboxPolicy {
  network: SandboxNetworkPolicy;
  profile: SandboxProfileValue;
}

const SandboxPolicySchema = Type.Object(
  {
    allowedDomains: Type.Array(Type.String({ minLength: 1, maxLength: 260 }), {
      maxItems: 100,
      uniqueItems: true,
    }),
    deniedDomains: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 260 }), {
        maxItems: 100,
        uniqueItems: true,
      }),
    ),
    profile: Type.Optional(
      Type.Union([
        Type.Literal(SandboxProfile.READ_ONLY),
        Type.Literal(SandboxProfile.WORKSPACE_WRITE),
      ]),
    ),
  },
  { additionalProperties: false },
);

function parseSandboxPolicy(value: unknown): SandboxPolicy {
  if (!Value.Check(SandboxPolicySchema, value)) throw new Error("策略格式无效");
  return {
    network: {
      allowedDomains: value.allowedDomains,
      deniedDomains: value.deniedDomains ?? [],
    },
    profile: value.profile ?? SandboxProfile.WORKSPACE_WRITE,
  };
}

async function readSandboxPolicyFile(path: string, signal?: AbortSignal): Promise<SandboxPolicy> {
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(16_385);
    const { bytesRead } = await file.read(buffer);
    signal?.throwIfAborted();
    if (bytesRead > 16_384) throw new Error("策略文件过大");
    return parseSandboxPolicy(JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")));
  } finally {
    await file.close();
  }
}

/** 只读取 daemon 私有目录中的用户策略；工作区和模型参数不能扩大权限。 */
export async function readSandboxPolicy(
  globalRoot: string,
  signal?: AbortSignal,
): Promise<SandboxPolicy> {
  signal?.throwIfAborted();
  try {
    return await readSandboxPolicyFile(join(globalRoot, "sandbox-policy.json"), signal);
  } catch (error: unknown) {
    signal?.throwIfAborted();
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {
        network: { allowedDomains: [], deniedDomains: [] },
        profile: SandboxProfile.WORKSPACE_WRITE,
      };
    }
    throw new Error("SANDBOX_POLICY_INVALID: 无法读取沙箱策略，请检查 sandbox-policy.json");
  }
}

/** 原子更新 daemon 私有沙箱策略；模型和 workspace 不能调用此入口。 */
export async function writeSandboxPolicy(
  globalRoot: string,
  policy: SandboxPolicy,
  signal?: AbortSignal,
): Promise<SandboxPolicy> {
  signal?.throwIfAborted();
  const normalized = parseSandboxPolicy({
    allowedDomains: policy.network.allowedDomains,
    deniedDomains: policy.network.deniedDomains,
    profile: policy.profile,
  });
  await mkdir(globalRoot, { mode: 0o700, recursive: true });
  const path = join(globalRoot, "sandbox-policy.json");
  const temporaryPath = join(globalRoot, `.sandbox-policy-${randomUUID()}.tmp`);
  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify({ ...normalized.network, profile: normalized.profile }, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, signal },
    );
    signal?.throwIfAborted();
    await rename(temporaryPath, path);
    return normalized;
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
