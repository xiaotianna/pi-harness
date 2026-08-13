import type { AuthErrorCode } from "../features/auth/constants/auth-errors";
import { LoginPage as LoginView } from "../features/auth/views/login-page";

export interface LoginPageProps {
  authError?: AuthErrorCode | undefined;
}

export function LoginPage({ authError }: LoginPageProps) {
  return <LoginView authError={authError} />;
}
