import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { ToolCall as ToolCallElement } from "../../../../components/ai/tool-call";
import { type ChatMessageTool, ChatToolState } from "../../data/chat";
import { ToolIcon } from "./tool-icon";

function fileName(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function toolPresentation(tool: ChatMessageTool) {
  const input = isPlainObject(tool.input) ? tool.input : {};
  const path = typeof input.path === "string" ? fileName(input.path) : tool.toolName;

  switch (tool.toolName) {
    case "read_file":
      return { active: "正在读取", done: "已读取", failed: "读取失败", query: path };
    case "edit_file":
      return { active: "正在修改", done: "已修改", failed: "修改失败", query: path };
    case "write_file":
      return { active: "正在写入", done: "已写入", failed: "写入失败", query: path };
    case "run_command":
      return {
        active: "正在执行命令",
        done: "已执行命令",
        failed: "命令执行失败",
        query: typeof input.command === "string" ? input.command : tool.toolName,
      };
    default:
      return {
        active: "正在使用工具",
        done: "已使用工具",
        failed: "工具调用失败",
        query: tool.toolName,
      };
  }
}

function formatToolValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? {}, null, 2) ?? "";
}

export function ToolCall({ tool }: { tool: ChatMessageTool }) {
  const isAwaitingApproval = tool.state === ChatToolState.REQUIRES_ACTION;
  const isFailed = tool.state === ChatToolState.OUTPUT_ERROR;
  const isRunning = tool.state === ChatToolState.INPUT_AVAILABLE || isAwaitingApproval;
  const [isOpen, setIsOpen] = useState(false);
  const presentation = toolPresentation(tool);

  return (
    <ToolCallElement
      activeLabel={isAwaitingApproval ? "等待审批" : (tool.activeLabel ?? presentation.active)}
      failed={isFailed}
      icon={<ToolIcon className="size-4" toolName={tool.toolName} />}
      label={isFailed ? presentation.failed : presentation.done}
      onOpenChange={setIsOpen}
      open={isOpen}
      query={presentation.query}
      request={tool.argsText ?? formatToolValue(tool.input)}
      result={tool.errorText ?? formatToolValue(tool.output)}
      running={isRunning}
    />
  );
}
