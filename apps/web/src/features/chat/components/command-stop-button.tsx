"use client";

import { Stop } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import type { CommandProcessSnapshot } from "@pi-harness/agent-runtime/harness-event";
import { useMutation } from "@tanstack/react-query";
import { stopSessionCommand } from "../api/session-api";

export function CommandStopButton({
  command,
  isIconOnly = false,
}: {
  command: CommandProcessSnapshot;
  isIconOnly?: boolean;
}) {
  const mutation = useMutation({
    mutationFn: () => stopSessionCommand(command.sessionId, command.processId),
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : "无法停止后台命令");
    },
  });

  return (
    <Button
      isIconOnly={isIconOnly}
      aria-label={`停止命令 ${command.command}`}
      isPending={mutation.isPending}
      size="sm"
      variant="danger"
      onPress={() => mutation.mutate()}
    >
      <Stop aria-hidden className="size-3.5" />
      {isIconOnly ? null : "停止"}
    </Button>
  );
}
