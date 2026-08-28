import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4310;
const DEFAULT_WEB_URL = "http://127.0.0.1:5173";

const EnvironmentSchema = Type.Object({
  PI_HARNESS_DATABASE_PATH: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_GITHUB_CALLBACK_URL: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_GITHUB_CLIENT_ID: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_GITHUB_CLIENT_SECRET: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_HOST: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_LOG_LEVEL: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_PORT: Type.Optional(Type.String({ minLength: 1 })),
  PI_HARNESS_WEB_URL: Type.Optional(Type.String({ minLength: 1 })),
});

type HarnessEnvironment = Static<typeof EnvironmentSchema>;

export interface GitHubOAuthConfig {
  callbackUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface HarnessConfig {
  credentialsPath: string;
  databasePath: string;
  globalRoot: string;
  githubOAuth: GitHubOAuthConfig | null;
  host: string;
  logLevel: string;
  port: number;
  sessionsPath: string;
  webUrl: string;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PI_HARNESS_PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parseLoopbackUrl(name: string, value: string): string {
  const url = new URL(value);
  const isLoopback =
    url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";

  // daemon 仅供本机访问。拒绝非回环地址，避免误配置远程绑定后，
  // OAuth 回调和本地凭据意外暴露为网络服务。
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !isLoopback) {
    throw new Error(`${name} must be an HTTP(S) loopback URL`);
  }

  return url.toString().replace(/\/$/, "");
}

function resolveGitHubOAuth(env: HarnessEnvironment, port: number): GitHubOAuthConfig | null {
  const clientId = env.PI_HARNESS_GITHUB_CLIENT_ID;
  const clientSecret = env.PI_HARNESS_GITHUB_CLIENT_SECRET;

  if (clientId === undefined && clientSecret === undefined) {
    return null;
  }

  if (clientId === undefined || clientSecret === undefined) {
    throw new Error(
      "PI_HARNESS_GITHUB_CLIENT_ID and PI_HARNESS_GITHUB_CLIENT_SECRET must be configured together",
    );
  }

  const callbackUrl = parseLoopbackUrl(
    "PI_HARNESS_GITHUB_CALLBACK_URL",
    env.PI_HARNESS_GITHUB_CALLBACK_URL ?? `http://127.0.0.1:${port}/api/auth/github/callback`,
  );

  return { callbackUrl, clientId, clientSecret };
}

/** 加载 daemon 专用配置，OAuth 密钥不会传递到 Web。 */
export function loadHarnessConfig(input: NodeJS.ProcessEnv = process.env): HarnessConfig {
  if (!Value.Check(EnvironmentSchema, input)) {
    throw new Error("PI Harness environment configuration is invalid");
  }

  const env = input as HarnessEnvironment;
  const port = parsePort(env.PI_HARNESS_PORT);

  const databasePath =
    env.PI_HARNESS_DATABASE_PATH ?? join(homedir(), ".pi-harness", "harness.sqlite");
  const globalRoot = dirname(databasePath);

  return {
    credentialsPath: join(globalRoot, "credentials.json"),
    databasePath,
    globalRoot,
    githubOAuth: resolveGitHubOAuth(env, port),
    host: env.PI_HARNESS_HOST ?? DEFAULT_HOST,
    logLevel: env.PI_HARNESS_LOG_LEVEL ?? "info",
    port,
    sessionsPath: join(globalRoot, "sessions"),
    webUrl: parseLoopbackUrl("PI_HARNESS_WEB_URL", env.PI_HARNESS_WEB_URL ?? DEFAULT_WEB_URL),
  };
}
