import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { memo } from "react";

const MAX_HIGHLIGHT_CHARACTERS = 20_000;

export const AssistantCodeBlock = memo(function AssistantCodeBlock({
  code,
  language,
  isStreaming = false,
}: {
  code: string;
  language: string;
  isStreaming?: boolean;
}) {
  return (
    <CodeBlock>
      <CodeBlock.Header>
        <span className="text-xs uppercase text-muted">{language}</span>
        <CodeBlock.CopyButton code={code} />
      </CodeBlock.Header>
      {isStreaming || code.length > MAX_HIGHLIGHT_CHARACTERS ? (
        <div
          className="code-block__code"
          data-slot="code-block-code"
          data-highlight={isStreaming ? "deferred" : "disabled"}
        >
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      ) : (
        <CodeBlock.Code code={code} language={language} />
      )}
    </CodeBlock>
  );
});
