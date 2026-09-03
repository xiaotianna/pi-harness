import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import type { CSSProperties, ReactNode } from "react";
import { AssistantMarkdown } from "../../../../components/ai/assistant-markdown";

const TRACE_MARKDOWN_STYLE = {
  "--text-lg": "14px",
  "--text-sm": "13px",
  "--text-xl": "16px",
} as CSSProperties;

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    return "无法展示该数据";
  }
}

export function TraceDetailCode({
  ariaLabel,
  code,
  isHeaderHidden = false,
  name,
}: {
  ariaLabel: string;
  code: unknown;
  isHeaderHidden?: boolean;
  name: string;
}) {
  const value = stringify(code);
  return (
    <CodeBlock className="my-0! rounded-md! border-0!">
      {isHeaderHidden ? null : (
        <CodeBlock.Header className="text-[13px]">
          <span>{name}</span>
          <CodeBlock.CopyButton aria-label={ariaLabel} code={value} />
        </CodeBlock.Header>
      )}
      <CodeBlock.Code className="text-[13px]! leading-5!" code={value} language="json" />
    </CodeBlock>
  );
}

export function TraceDetailText({ children }: { children: ReactNode }) {
  return (
    <div className="whitespace-pre-wrap text-[13px] leading-5 text-foreground">{children}</div>
  );
}

export function TraceDetailMarkdown({ children }: { children: string }) {
  return (
    <AssistantMarkdown className="min-w-0 [overflow-wrap:anywhere]" style={TRACE_MARKDOWN_STYLE}>
      {children}
    </AssistantMarkdown>
  );
}
