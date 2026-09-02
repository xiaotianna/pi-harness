import { isPlainObject } from "es-toolkit";
import { useState } from "react";
import { ToolCall as ToolCallElement } from "../../../../components/ai/tool-call";
import { WebSearch, type WebSearchResult } from "../../../../components/ai/web-search";
import { type ChatMessageTool, ChatToolState } from "../../data/chat";
import { ToolIcon } from "./tool-icon";

const TOOL_LABEL_BY_NAME: Readonly<Record<string, string>> = {
  edit_file: "修改文件",
  find_skill: "查找技能",
  get_skill: "获取技能",
  list_files: "浏览文件",
  load_skill: "加载技能",
  read_document: "读取文档",
  read_file: "读取文件",
  reset_working_state: "重置工作状态",
  restore_context_checkpoint: "恢复上下文",
  run_command: "执行命令",
  search_session_history: "搜索会话历史",
  search_text: "搜索文本",
  skill_creator: "创建技能",
  view_image: "查看图片",
  view_pdf_page: "查看 PDF",
  web_fetch: "网页读取",
  web_search: "网页搜索",
  write_file: "写入文件",
};

export function toolDisplayName(toolName: string): string {
  return TOOL_LABEL_BY_NAME[toolName] ?? toolName;
}

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
    case "web_fetch":
      return {
        active: "正在读取网页",
        done: "已读取网页",
        failed: "网页读取失败",
        query: typeof input.url === "string" ? input.url : tool.toolName,
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

function readWebSearchResults(value: unknown): WebSearchResult[] {
  if (!isPlainObject(value) || !Array.isArray(value.results)) return [];
  return value.results.flatMap((result) => {
    if (
      !isPlainObject(result) ||
      typeof result.title !== "string" ||
      typeof result.url !== "string"
    ) {
      return [];
    }
    try {
      const url = new URL(result.url);
      return [
        {
          ...(typeof result.content === "string" && result.content
            ? { description: result.content }
            : {}),
          domain: url.hostname.replace(/^www\./, ""),
          status: "resolved" as const,
          title: result.title,
          url: url.href,
        },
      ];
    } catch {
      return [];
    }
  });
}

function WebSearchToolCall({ tool }: { tool: ChatMessageTool }) {
  const input = isPlainObject(tool.input) ? tool.input : {};
  const query = typeof input.query === "string" ? input.query : "网页搜索";
  const isRunning =
    tool.state === ChatToolState.INPUT_AVAILABLE || tool.state === ChatToolState.REQUIRES_ACTION;
  return (
    <WebSearch
      query={query}
      results={readWebSearchResults(tool.details)}
      searching={isRunning}
      {...(tool.state === ChatToolState.OUTPUT_ERROR
        ? { error: tool.errorText ?? "搜索服务不可用" }
        : {})}
    />
  );
}

function formatToolValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? {}, null, 2) ?? "";
}

function GenericToolCall({ tool }: { tool: ChatMessageTool }) {
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

export function ToolCall({ tool }: { tool: ChatMessageTool }) {
  return tool.toolName === "web_search" ? (
    <WebSearchToolCall tool={tool} />
  ) : (
    <GenericToolCall tool={tool} />
  );
}
