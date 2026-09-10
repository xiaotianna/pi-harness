"use client";

import { CircleCheckFill, CircleXmarkFill, Lock } from "@gravity-ui/icons";
import { Button, Card, ProgressCircle } from "@heroui/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { startSkillOAuth } from "../api/skill-api";

function SkillOAuthCard({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <Card.Header className="items-center gap-3 text-center">
          {icon}
          <Card.Title className="text-xl">{title}</Card.Title>
          <Card.Description className="max-w-sm">{description}</Card.Description>
        </Card.Header>
        {action ? <Card.Content className="items-center">{action}</Card.Content> : null}
        <Card.Footer className="justify-center gap-1.5 text-xs text-muted">
          <Lock aria-hidden className="size-3.5" />
          授权凭据仅保存在本机 daemon
        </Card.Footer>
      </Card>
    </main>
  );
}

export function SkillOAuthLaunchView({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}) {
  const hasStarted = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = errorMessage === null ? `正在连接 ${name}` : `${name} 授权启动失败`;
  }, [errorMessage, name]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void startSkillOAuth(collectionId)
      .then((authorizationUrl) => window.location.replace(authorizationUrl))
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "无法创建 OAuth 授权请求"),
      );
  }, [collectionId]);

  if (errorMessage !== null) {
    return (
      <SkillOAuthCard
        action={
          <Button variant="primary" onPress={() => window.close()}>
            关闭窗口
          </Button>
        }
        description={errorMessage}
        icon={<CircleXmarkFill aria-hidden className="size-10 text-danger" />}
        title={`${name} 授权启动失败`}
      />
    );
  }

  return (
    <SkillOAuthCard
      description={`即将前往 ${name} 完成授权，请稍候。`}
      icon={
        <ProgressCircle aria-label="正在打开授权页面" isIndeterminate size="lg">
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
      }
      title="正在打开授权页面"
    />
  );
}

export function SkillOAuthResultView({
  message,
  name,
  status,
}: {
  message?: string | undefined;
  name: string;
  status: "error" | "success";
}) {
  const isSuccessful = status === "success";
  const title = isSuccessful ? `${name} 已连接` : `${name} 连接失败`;
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <SkillOAuthCard
      action={
        <Button variant="primary" onPress={() => window.close()}>
          关闭窗口
        </Button>
      }
      description={
        isSuccessful
          ? "授权已完成，返回插件市场即可继续使用。"
          : (message ?? "授权没有完成，请关闭此窗口后从插件市场重试。")
      }
      icon={
        isSuccessful ? (
          <CircleCheckFill aria-hidden className="size-10 text-success" />
        ) : (
          <CircleXmarkFill aria-hidden className="size-10 text-danger" />
        )
      }
      title={title}
    />
  );
}
