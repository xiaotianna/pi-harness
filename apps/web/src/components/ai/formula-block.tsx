import { Surface } from "@heroui/react";
import katex from "katex";

export function FormulaBlock({ source }: { source: string }) {
  const html = katex.renderToString(source, {
    displayMode: true,
    throwOnError: false,
  });

  return (
    <Surface className="mb-3 overflow-x-auto rounded-2xl px-4 py-5" variant="secondary">
      <div data-slot="formula-block" dangerouslySetInnerHTML={{ __html: html }} />
    </Surface>
  );
}
