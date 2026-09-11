"use client";

import { Alert, Avatar, Button, Card } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { startDesktopGitHubLogin } from "../api/auth-api";
import { type AuthErrorCode, getAuthErrorMessage } from "../constants/auth-errors";

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .7C5.7.7.7 5.8.7 12.1c0 5 3.2 9.3 7.7 10.8.6.1.8-.2.8-.5v-2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.8 1.2 1.8 1.2 1 1.7 2.7 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.6 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.1 1.2a10.6 10.6 0 0 1 5.7 0c2.2-1.5 3.1-1.2 3.1-1.2.6 1.5.2 2.7.1 3 .7.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.3-5.2 5.6.4.4.8 1.1.8 2.2v3.1c0 .3.2.7.8.5a11.4 11.4 0 0 0 7.7-10.8C23.3 5.8 18.3.7 12 .7Z" />
    </svg>
  );
}

export interface LoginPageProps {
  authError?: AuthErrorCode | undefined;
  desktopAuthResult?: "error" | "success" | undefined;
}

export function LoginPage({ authError, desktopAuthResult }: LoginPageProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const errorMessage = getAuthErrorMessage(authError);
  const isDesktopShell = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  useEffect(() => () => requestController.current?.abort(), []);

  const startGitHubLogin = () => {
    setIsRedirecting(true);
    setRequestError(null);
    if (!isDesktopShell) {
      window.location.assign("/api/auth/github");
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    void startDesktopGitHubLogin(controller.signal)
      .then(() => window.location.assign("/"))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsRedirecting(false);
        setRequestError(error instanceof Error ? error.message : "GitHub 授权未完成，请重试");
      });
  };

  if (desktopAuthResult) {
    const isSuccess = desktopAuthResult === "success";
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <Card.Header className="items-center gap-2 text-center">
            <Avatar>
              <Avatar.Image alt="PI Harness" src="/images/blue-avatar.jpg" />
              <Avatar.Fallback>PI</Avatar.Fallback>
            </Avatar>
            <Card.Title className="text-lg">{isSuccess ? "授权完成" : "授权失败"}</Card.Title>
            <Card.Description>
              {isSuccess
                ? "可以关闭此页面并返回 PI Harness"
                : (errorMessage ?? "请返回 PI Harness 后重试")}
            </Card.Description>
          </Card.Header>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <Card.Header className="items-center gap-2 text-center">
          <Avatar>
            <Avatar.Image alt="PI Harness" src="/images/blue-avatar.jpg" />
            <Avatar.Fallback>PI</Avatar.Fallback>
          </Avatar>
          <Card.Title className="text-lg">登录</Card.Title>
          <Card.Description>使用 GitHub 账号登录进入</Card.Description>
        </Card.Header>

        <Card.Content>
          <Button fullWidth isPending={isRedirecting} variant="outline" onPress={startGitHubLogin}>
            <GitHubMark />
            {isRedirecting
              ? isDesktopShell
                ? "等待浏览器授权…"
                : "正在前往 GitHub…"
              : "使用 GitHub 登录"}
          </Button>

          {requestError || errorMessage ? (
            <Alert className="mt-3 bg-danger-soft" role="alert" status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{requestError ?? errorMessage}</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : null}
        </Card.Content>
      </Card>
    </main>
  );
}
