import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import {
  Markdown as MarkdownPrimitive,
  type MarkdownProps,
} from "@agile-avocation/ui-pro/markdown";
import { Checkbox, Table } from "@heroui/react";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import type { Components } from "react-markdown";
import { cn } from "../../shared/utils/cn";
import { SearchHighlightedText } from "../ui/search-highlighted-text";
import { AssistantMarkdownLink, isAssistantMarkdownLinkTarget } from "./assistant-markdown-link";
import { ChartBlock } from "./chart-block";
import { FlowDiagram } from "./flow-diagram";
import { FormulaBlock } from "./formula-block";
import { MermaidBlock } from "./mermaid-block";
import { readSkillMentionName, renderSkillMentions, SkillMention } from "./skill-mention";
import { parseChartBlock, parseFlowBlock } from "./utils/visual-blocks";

function getLanguage(className?: string): string {
  return className?.match(/language-(\w+)/)?.[1] ?? "plaintext";
}

function renderMarkdownText(children: ReactNode): ReactNode {
  return <SearchHighlightedText>{renderSkillMentions(children)}</SearchHighlightedText>;
}

const ASSISTANT_MARKDOWN_COMPONENTS = {
  a: AssistantMarkdownLink,
  blockquote: ({ children }) => <blockquote>{renderMarkdownText(children)}</blockquote>,
  code: ({ children, className, node, ...props }) => {
    const isInline =
      !node?.position?.start.line || node.position.start.line === node.position.end.line;
    const code = String(children ?? "").replace(/\n$/, "");
    const language = getLanguage(className);
    const skillName = isInline ? readSkillMentionName(code) : null;

    if (skillName) return <SkillMention name={skillName} />;

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
    if (isInline && isAssistantMarkdownLinkTarget(code)) {
      return <AssistantMarkdownLink href={code}>{code}</AssistantMarkdownLink>;
    }
    if (isInline) {
      return (
        <code
          className={cn("markdown__inline-code", className)}
          data-slot="markdown-inline-code"
          {...props}
        >
          <SearchHighlightedText>{children}</SearchHighlightedText>
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
      <SearchHighlightedText>{children}</SearchHighlightedText>
    </Table.Column>
  ),
  td: ({ children, style }) => (
    <Table.Cell
      className="!border-x-0 !border-t-0 !border-b !border-separator-tertiary/50 !px-4 !py-3"
      {...(style === undefined ? {} : { style })}
    >
      <SearchHighlightedText>{children}</SearchHighlightedText>
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
  h1: ({ children }) => <h1>{renderMarkdownText(children)}</h1>,
  h2: ({ children }) => <h2>{renderMarkdownText(children)}</h2>,
  h3: ({ children }) => <h3>{renderMarkdownText(children)}</h3>,
  h4: ({ children }) => <h4>{renderMarkdownText(children)}</h4>,
  h5: ({ children }) => <h5>{renderMarkdownText(children)}</h5>,
  h6: ({ children }) => <h6>{renderMarkdownText(children)}</h6>,
  li: ({ children }) => <li>{renderMarkdownText(children)}</li>,
  p: ({ children }) => <p>{renderMarkdownText(children)}</p>,
} satisfies Components;

export function AssistantMarkdown(props: Omit<MarkdownProps, "components">) {
  return <MarkdownPrimitive components={ASSISTANT_MARKDOWN_COMPONENTS} {...props} />;
}
