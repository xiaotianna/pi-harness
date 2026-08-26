import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import {
  Markdown as MarkdownPrimitive,
  type MarkdownProps,
} from "@agile-avocation/ui-pro/markdown";
import { Checkbox, Link, Table } from "@heroui/react";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import type { Components } from "react-markdown";
import { cn } from "../../shared/utils/cn";
import { ChartBlock } from "./chart-block";
import { FlowDiagram } from "./flow-diagram";
import { FormulaBlock } from "./formula-block";
import { MermaidBlock } from "./mermaid-block";
import { parseChartBlock, parseFlowBlock } from "./utils/visual-blocks";

function getLanguage(className?: string): string {
  return className?.match(/language-(\w+)/)?.[1] ?? "plaintext";
}

const ASSISTANT_MARKDOWN_COMPONENTS = {
  a: ({ children, className, href, node: _node, title, ...props }) =>
    href && /^https?:\/\//i.test(href) ? (
      <Link
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        {...(className === undefined ? {} : { className })}
        {...(title === undefined ? {} : { title })}
      >
        {children}
        <Link.Icon />
      </Link>
    ) : (
      <a className={className} href={href} title={title} {...props}>
        {children}
      </a>
    ),
  code: ({ children, className, node, ...props }) => {
    const isInline =
      !node?.position?.start.line || node.position.start.line === node.position.end.line;
    const code = String(children ?? "").replace(/\n$/, "");
    const language = getLanguage(className);

    if (!isInline && language === "chart") {
      const data = parseChartBlock(code);
      if (data) return <ChartBlock data={data} />;
    }
    if (
      !isInline &&
      code.length > 0 &&
      code.length <= 2_000 &&
      ["formula", "latex", "math"].includes(language)
    ) {
      return <FormulaBlock source={code} />;
    }
    if (!isInline && language === "flow") {
      const data = parseFlowBlock(code);
      if (data) return <FlowDiagram data={data} />;
    }
    if (!isInline && ["flowchart", "mermaid"].includes(language)) {
      return <MermaidBlock source={code} />;
    }
    if (isInline) {
      return (
        <code
          className={cn("markdown__inline-code", className)}
          data-slot="markdown-inline-code"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock>
        <CodeBlock.Header>
          <span className="text-xs uppercase text-muted">{language}</span>
          <CodeBlock.CopyButton code={code} />
        </CodeBlock.Header>
        <CodeBlock.Code code={code} language={language} />
      </CodeBlock>
    );
  },
  pre: ({ children }) => <Fragment>{children}</Fragment>,
  table: ({ children }) => (
    <Table className="mb-3">
      <Table.ScrollContainer>
        <Table.Content aria-label="消息表格" className="!mb-0 !border-separate">
          {children}
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  ),
  thead: ({ children }) => {
    const row = Children.toArray(children)[0];
    const columns = isValidElement<{ children?: ReactNode }>(row) ? row.props.children : children;

    return <Table.Header>{columns}</Table.Header>;
  },
  tbody: ({ children }) => <Table.Body>{children}</Table.Body>,
  tr: ({ children }) => <Table.Row>{children}</Table.Row>,
  th: ({ children, style }) => (
    <Table.Column className="!border-0 !px-4 !py-2.5" {...(style === undefined ? {} : { style })}>
      {children}
    </Table.Column>
  ),
  td: ({ children, style }) => (
    <Table.Cell
      className="!border-x-0 !border-t-0 !border-b !border-separator-tertiary/50 !px-4 !py-3"
      {...(style === undefined ? {} : { style })}
    >
      {children}
    </Table.Cell>
  ),
  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <Checkbox
        aria-label={checked ? "已完成" : "未完成"}
        className="me-1 inline-flex align-middle"
        isDisabled
        isSelected={Boolean(checked)}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
    ) : null,
} satisfies Components;

export function AssistantMarkdown(props: Omit<MarkdownProps, "components">) {
  return <MarkdownPrimitive components={ASSISTANT_MARKDOWN_COMPONENTS} {...props} />;
}
