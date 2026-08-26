import { CodeBlock } from "@agile-avocation/ui-pro/code-block";
import { Surface } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

type MermaidState = { source: string; svg: string } | { isError: true; source: string } | null;

let mermaidPromise: Promise<typeof import("mermaid")["default"]> | undefined;
let renderSequence = 0;
const MERMAID_RENDER_DELAY_MS = 300;

function loadMermaid() {
  mermaidPromise ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      securityLevel: "strict",
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: "neutral",
    });
    return mermaid;
  });
  return mermaidPromise;
}

export function MermaidBlock({ source }: { source: string }) {
  const [state, setState] = useState<MermaidState>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null);
  const currentState = state?.source === source ? state : null;

  useEffect(() => {
    let isCurrent = true;

    if (!source.trim() || source.length > 20_000) {
      setState({ isError: true, source });
      return;
    }

    const renderContainer = renderContainerRef.current;
    if (!renderContainer) return;

    // ponytail: debounce infers stream completion; pass an explicit streaming flag if live previews matter.
    const renderTimeout = window.setTimeout(() => {
      void loadMermaid()
        .then((mermaid) => mermaid.render(`mermaid-${++renderSequence}`, source, renderContainer))
        .then(({ svg }) => {
          if (isCurrent) setState({ source, svg });
        })
        .catch(() => {
          if (isCurrent) setState({ isError: true, source });
        });
    }, MERMAID_RENDER_DELAY_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(renderTimeout);
    };
  }, [source]);

  if (currentState && "isError" in currentState) {
    return (
      <CodeBlock>
        <CodeBlock.Header>
          <span className="text-xs uppercase text-muted">mermaid</span>
          <CodeBlock.CopyButton code={source} />
        </CodeBlock.Header>
        <CodeBlock.Code code={source} language="mermaid" />
      </CodeBlock>
    );
  }

  return (
    <Surface className="relative mb-3 overflow-x-auto rounded-2xl p-4" variant="secondary">
      <div
        ref={renderContainerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-0"
      />
      {currentState && "svg" in currentState ? (
        <div
          aria-label="流程图"
          className="flex min-h-32 justify-center [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: currentState.svg }}
          role="img"
        />
      ) : (
        <div className="flex min-h-32 items-center justify-center text-sm text-muted">
          正在渲染流程图…
        </div>
      )}
    </Surface>
  );
}
