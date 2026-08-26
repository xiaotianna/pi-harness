import { TextShimmer } from "@agile-avocation/ui-pro";
import { cn } from "../../shared/utils/cn";

const IMAGE_DOTS = Array.from({ length: 64 }, (_, index) => index);

export interface ImageGenerationProps {
  alt?: string;
  className?: string;
  generating?: boolean;
  imageUrl?: string;
  prompt: string;
}

export function ImageGeneration({
  alt = "AI 生成图片",
  className,
  generating = false,
  imageUrl,
  prompt,
}: ImageGenerationProps) {
  return (
    <figure aria-busy={generating} className={cn("flex w-52 flex-col gap-2.5", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-secondary">
        <div aria-hidden className="absolute inset-0 grid grid-cols-8 place-items-center p-6">
          {IMAGE_DOTS.map((dot) => (
            <span
              className={cn(
                "size-1 rounded-full bg-foreground opacity-20",
                generating && "animate-pulse motion-reduce:animate-none",
                !generating && "opacity-0",
              )}
              key={dot}
              style={{ animationDelay: `${(Math.floor(dot / 8) + (dot % 8)) * 90}ms` }}
            />
          ))}
        </div>
        {imageUrl !== undefined && !generating ? (
          <img alt={alt} className="size-full object-cover" src={imageUrl} />
        ) : !generating ? (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_100%,oklch(0.45_0.09_265)_0%,transparent_55%),radial-gradient(110%_80%_at_85%_90%,oklch(0.62_0.1_300/0.8)_0%,transparent_60%),linear-gradient(to_top,oklch(0.35_0.06_275),oklch(0.82_0.07_50))]"
          />
        ) : null}
      </div>
      <figcaption className="min-w-0 truncate text-xs text-muted">
        {generating ? <TextShimmer>正在生成图片</TextShimmer> : prompt}
      </figcaption>
    </figure>
  );
}
