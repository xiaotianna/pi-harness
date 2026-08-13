const AUTH_ERROR_MESSAGES = {
  access_denied: "你取消了 GitHub 授权，请重新尝试。",
  invalid_state: "登录请求已过期或校验失败，请重新发起登录。",
  not_configured: "daemon 尚未配置 GitHub OAuth。",
  oauth_failed: "GitHub 登录失败，请稍后重试。",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && value in AUTH_ERROR_MESSAGES;
}

export function getAuthErrorMessage(code: AuthErrorCode | undefined): string | null {
  return code ? AUTH_ERROR_MESSAGES[code] : null;
}
