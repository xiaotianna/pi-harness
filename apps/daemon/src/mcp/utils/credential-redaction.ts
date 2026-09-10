import type { McpCredential } from "../credential.js";

export function redactMcpText(text: string, credential?: McpCredential): string {
  const material = credential?.material;
  const values =
    material?.mode === "static"
      ? [...Object.values(material.headers), ...Object.values(material.environment)]
      : material
        ? [material.accessToken, material.refreshToken, material.clientSecret]
        : [];
  const secrets = values
    .flatMap((value) => {
      if (!value) return [];
      const token = /^(?:Bearer|Basic)\s+(.+)$/i.exec(value)?.[1];
      return token ? [value, token] : [value];
    })
    .sort((left, right) => right.length - left.length);
  let result = text;
  for (const secret of secrets) result = result.replaceAll(secret, "[REDACTED]");
  return result;
}

export function redactMcpValue(value: unknown, credential?: McpCredential): unknown {
  if (typeof value === "string") return redactMcpText(value, credential);
  if (Array.isArray(value)) return value.map((item) => redactMcpValue(item, credential));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactMcpValue(item, credential)]),
    );
  }
  return value;
}
