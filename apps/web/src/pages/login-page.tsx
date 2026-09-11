import type { AuthErrorCode } from "../features/auth/constants/auth-errors";
import { LoginPage as LoginView } from "../features/auth/views/login-page";

export interface LoginPageProps {
  authError?: AuthErrorCode | undefined;
  desktopAuthResult?: "error" | "success" | undefined;
}

export function LoginPage({ authError, desktopAuthResult }: LoginPageProps) {
  return <LoginView authError={authError} desktopAuthResult={desktopAuthResult} />;
}
