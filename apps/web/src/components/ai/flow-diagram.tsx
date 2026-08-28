import { ArrowRight } from "@gravity-ui/icons";
import { Surface } from "@heroui/react";
import type { FlowBlockData } from "./utils/visual-blocks";

export function FlowDiagram({ data }: { data: FlowBlockData }) {
  return (
    <figure className="mb-3">
      <figcaption className="mb-3 text-sm font-medium text-foreground">{data.title}</figcaption>
      <ol className="session-scrollbar session-scrollbars flex max-w-full items-center gap-2 overflow-x-auto">
        {data.steps.map((step, index) => (
          <li className="flex shrink-0 items-center gap-2" key={`${step}-${index}`}>
            <Surface
              className="flex min-h-16 w-max min-w-48 max-w-64 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-medium"
              variant="secondary"
            >
              {step}
            </Surface>
            {index < data.steps.length - 1 ? (
              <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
