import { Surface } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import type { FlowBlockData } from "./utils/visual-blocks";

export function FlowDiagram({ data }: { data: FlowBlockData }) {
  return (
    <figure className="mb-3">
      <figcaption className="mb-3 text-sm font-medium text-foreground">{data.title}</figcaption>
      <ol className="flex flex-col items-center gap-2 sm:flex-row">
        {data.steps.map((step, index) => (
          <li
            className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row"
            key={`${step}-${index}`}
          >
            <Surface
              className="flex min-h-10 w-full min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-center text-sm font-medium"
              variant="secondary"
            >
              {step}
            </Surface>
            {index < data.steps.length - 1 ? (
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 rotate-90 text-muted sm:rotate-0"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
