import { Lock } from "@gravity-ui/icons";
import { Card } from "@heroui/react";
import type { ReactNode } from "react";

export function OAuthStatusCard({
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
    <main
      aria-live="polite"
      className="flex min-h-svh items-center justify-center bg-background px-4 py-10"
    >
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
