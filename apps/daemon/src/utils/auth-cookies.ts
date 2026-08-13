import { timingSafeEqual } from "node:crypto";

const AUTH_SESSION_COOKIE = "pi_workbench_session";
const GITHUB_OAUTH_COOKIE = "pi_workbench_github_oauth";
const GITHUB_CALLBACK_PATH = "/api/auth/github/callback";
const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface CookieOptions {
  maxAgeSeconds: number;
  path: string;
  secure: boolean;
}

export interface GitHubOAuthCookie {
  codeVerifier: string;
  state: string;
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearCookie(name: string, path: string, isSecure: boolean): string {
  return serializeCookie(name, "", { maxAgeSeconds: 0, path, secure: isSecure });
}

export function createGitHubOAuthCookie(value: GitHubOAuthCookie, isSecure: boolean): string {
  return serializeCookie(GITHUB_OAUTH_COOKIE, `${value.state}.${value.codeVerifier}`, {
    maxAgeSeconds: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: GITHUB_CALLBACK_PATH,
    secure: isSecure,
  });
}

export function readGitHubOAuthCookie(
  header: string | undefined,
  callbackState: string,
): GitHubOAuthCookie | null {
  const cookie = parseCookie(header, GITHUB_OAUTH_COOKIE);
  if (cookie === null) {
    return null;
  }

  const separator = cookie.indexOf(".");
  if (separator < 1) {
    return null;
  }

  const state = cookie.slice(0, separator);
  const codeVerifier = cookie.slice(separator + 1);
  const actualState = Buffer.from(state);
  const expectedState = Buffer.from(callbackState);

  // 检查长度后，以恒定时间比较 state，防止伪造回调创建本地会话。
  const stateMatches =
    actualState.length === expectedState.length && timingSafeEqual(actualState, expectedState);
  return codeVerifier.length > 0 && stateMatches ? { codeVerifier, state } : null;
}

export function clearGitHubOAuthCookie(isSecure: boolean): string {
  return clearCookie(GITHUB_OAUTH_COOKIE, GITHUB_CALLBACK_PATH, isSecure);
}

export function createSessionCookie(token: string, isSecure: boolean): string {
  return serializeCookie(AUTH_SESSION_COOKIE, token, {
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    path: "/",
    secure: isSecure,
  });
}

export function readSessionCookie(header: string | undefined): string | null {
  return parseCookie(header, AUTH_SESSION_COOKIE);
}

export function clearSessionCookie(isSecure: boolean): string {
  return clearCookie(AUTH_SESSION_COOKIE, "/", isSecure);
}
