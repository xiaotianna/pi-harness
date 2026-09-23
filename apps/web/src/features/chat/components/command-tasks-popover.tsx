"use client";

import { Terminal } from "@gravity-ui/icons";
import { Button, Chip, Popover, ScrollShadow } from "@heroui/react";
import type { CommandProcessSnapshot } from "@pi-harness/agent-runtime/harness-event";
import { CommandStopButton } from "./command-stop-button";

function outputPreview(output: string): string {
  return output.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? "等待命令输出…";
}

export function CommandTasksPopover({ commands }: { commands: readonly CommandProcessSnapshot[] }) {
  if (commands.length === 0) return null;

  return (
    <Popover>
      <Button
        aria-label={`查看 ${commands.length} 个运行中的后台命令`}
        size="sm"
        variant="tertiary"
      >
        <Terminal aria-hidden className="size-4" />
        <span>{commands.length} 个运行中</span>
      </Button>
      <Popover.Content
        className="w-max min-w-[min(20rem,calc(100vw-2rem))] max-w-[min(36rem,calc(100vw-2rem))] overflow-hidden"
        offset={10}
        placement="bottom end"
      >
        <Popover.Dialog className="p-0">
          <div className="flex items-center justify-between gap-4 px-3.5 pb-2 pt-3">
            <Popover.Heading className="text-sm font-medium">后台命令</Popover.Heading>
            <Chip color="accent" size="sm" variant="soft">
              {commands.length} 个运行中
            </Chip>
          </div>
          <ScrollShadow className="max-h-[min(60dvh,24rem)] px-2 pb-2" orientation="vertical">
            <div className="flex flex-col gap-1">
              {commands.map((command) => (
                <div
                  className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-default"
                  key={command.processId}
                >
                  <Terminal aria-hidden className="size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-mono text-xs text-foreground"
                      title={command.command}
                    >
                      {command.command}
                    </p>
                    <p
                      className="truncate text-xs text-muted"
                      title={outputPreview(command.output)}
                    >
                      {outputPreview(command.output)}
                    </p>
                  </div>
                  <CommandStopButton command={command} isIconOnly />
                </div>
              ))}
            </div>
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
