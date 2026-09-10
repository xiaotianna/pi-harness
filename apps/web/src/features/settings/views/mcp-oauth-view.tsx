"use client";

import { CircleCheckFill, CircleXmarkFill } from "@gravity-ui/icons";
import { Button, ProgressCircle } from "@heroui/react";
import { MCP } from "@lobehub/icons";
import { useEffect, useRef, useState } from "react";
import { OAuthStatusCard } from "../../../components/ui/oauth-status-card";
import { startMcpOAuth } from "../api/mcp-api";

type OAuthPhase = "error" | "loading" | "success";

function McpOAuthLogo({ phase }: { phase: OAuthPhase }) {
  return (
    <span className="relative flex size-12 items-center justify-center rounded-2xl bg-surface-secondary">
      <MCP aria-hidden className="text-foreground" size={28} />
      <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-surface">
        {phase === "loading" ? (
          <ProgressCircle aria-label="正在打开授权页面" isIndeterminate size="sm">
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
        ) : phase === "success" ? (
          <CircleCheckFill aria-hidden className="size-5 text-success" />
        ) : (
          <CircleXmarkFill aria-hidden className="size-5 text-danger" />
        )}
      </span>
    </span>
  );
}

export function McpOAuthLaunchView({
  expectedRevision,
  name,
  serverId,
}: {
  expectedRevision: number | null;
  name: string;
  serverId: string;
}) {
  const hasStarted = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    expectedRevision === null ? "授权请求已失效，请返回 MCP 设置后重试。" : null,
  );

  useEffect(() => {
    document.title = errorMessage === null ? `正在连接 ${name}` : `${name} 授权启动失败`;
  }, [errorMessage, name]);

  useEffect(() => {
    if (hasStarted.current || expectedRevision === null) return;
    hasStarted.current = true;
    void startMcpOAuth(serverId, expectedRevision)
      .then((authorizationUrl) => window.location.replace(authorizationUrl))
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "无法创建 OAuth 授权请求"),
      );
  }, [expectedRevision, serverId]);

  if (errorMessage !== null) {
    return (
      <OAuthStatusCard
        action={
          <Button variant="primary" onPress={() => window.close()}>
            关闭窗口
          </Button>
        }
        description={errorMessage}
        icon={<McpOAuthLogo phase="error" />}
        title={`${name} 授权启动失败`}
      />
    );
  }

  return (
    <OAuthStatusCard
      description={`即将前往 ${name} 完成授权，请稍候。`}
      icon={<McpOAuthLogo phase="loading" />}
      title="正在打开授权页面"
    />
  );
}

export function McpOAuthResultView({
  message,
  name,
  status,
}: {
  message?: string | undefined;
  name: string;
  status: "error" | "success";
}) {
  const isSuccessful = status === "success";
  const title = isSuccessful ? `${name} 已授权` : `${name} 授权失败`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <OAuthStatusCard
      action={
        <Button variant="primary" onPress={() => window.close()}>
          关闭窗口
        </Button>
      }
      description={
        isSuccessful
          ? "授权已完成，服务器保持开启。"
          : (message ?? "授权没有完成，请关闭此窗口后从 MCP 设置重试。")
      }
      icon={<McpOAuthLogo phase={isSuccessful ? "success" : "error"} />}
      title={title}
    />
  );
}
