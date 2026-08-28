"use client";

import { parsePatch } from "diff";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { type BundledLanguage, bundledLanguages, codeToTokens, type ThemedToken } from "shiki";
import { cn } from "../../shared/utils/cn";

export const DiffLineType = {
  ADDED: "added",
  CONTEXT: "context",
  REMOVED: "removed",
} as const;

export type DiffLineType = (typeof DiffLineType)[keyof typeof DiffLineType];

export interface DiffLine {
  content: string;
  newLineNumber: number | null;
  oldLineNumber: number | null;
  type: DiffLineType;
}

export interface ParsedDiff {
  additions: number;
  deletions: number;
  lines: readonly DiffLine[];
}

export function parseUnifiedDiff(diff: string): ParsedDiff {
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  for (const file of parsePatch(diff)) {
    for (const hunk of file.hunks) {
      let oldLineNumber = hunk.oldStart;
      let newLineNumber = hunk.newStart;

      for (const line of hunk.lines) {
        if (line.startsWith("+")) {
          additions += 1;
          lines.push({
            content: line.slice(1),
            newLineNumber,
            oldLineNumber: null,
            type: DiffLineType.ADDED,
          });
          newLineNumber += 1;
        } else if (line.startsWith("-")) {
          deletions += 1;
          lines.push({
            content: line.slice(1),
            newLineNumber: null,
            oldLineNumber,
            type: DiffLineType.REMOVED,
          });
          oldLineNumber += 1;
        } else if (line.startsWith(" ")) {
          lines.push({
            content: line.slice(1),
            newLineNumber,
            oldLineNumber,
            type: DiffLineType.CONTEXT,
          });
          newLineNumber += 1;
          oldLineNumber += 1;
        }
      }
    }
  }

  return { additions, deletions, lines };
}

const DIFF_LINE_CLASS_NAMES: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "bg-success-soft",
  [DiffLineType.CONTEXT]: "bg-surface-secondary",
  [DiffLineType.REMOVED]: "bg-danger-soft",
};

const DIFF_LINE_GUTTER_CLASS_NAMES: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "border-separator text-success-soft-foreground",
  [DiffLineType.CONTEXT]: "border-separator text-muted",
  [DiffLineType.REMOVED]: "border-separator text-danger-soft-foreground",
};

const DIFF_LINE_MARKERS: Record<DiffLineType, string> = {
  [DiffLineType.ADDED]: "+",
  [DiffLineType.CONTEXT]: " ",
  [DiffLineType.REMOVED]: "-",
};

export interface CodeDiffProps {
  ariaLabel: string;
  className?: string;
  lines: readonly DiffLine[];
  path: string;
}

interface HighlightedDiff {
  key: string;
  tokens: ThemedToken[][];
}

interface ScrollbarDrag {
  axis: "horizontal" | "vertical";
  pointerId: number;
  pointerStart: number;
  scrollStart: number;
}

const MAX_HIGHLIGHT_CHARACTERS = 64 * 1024;
const MAX_HIGHLIGHT_LINE_CHARACTERS = 4 * 1024;
const MAX_RENDERED_LINE_CHARACTERS = 10 * 1024;

function getHighlightCode(lines: readonly DiffLine[]): string | null {
  let length = 0;

  for (const line of lines) {
    if (line.content.length > MAX_HIGHLIGHT_LINE_CHARACTERS) return null;
    length += line.content.length + 1;
    if (length > MAX_HIGHLIGHT_CHARACTERS) return null;
  }

  return lines.map((line) => line.content).join("\n");
}

function getRenderedLineContent(content: string): string {
  if (content.length <= MAX_RENDERED_LINE_CHARACTERS) return content || " ";

  // ponytail: 超长单行只渲染有界预览；需要完整大文件 Diff 时再引入横向虚拟化。
  return `${content.slice(0, MAX_RENDERED_LINE_CHARACTERS)} …（该行过长，已截断）`;
}

function getLanguage(path: string): BundledLanguage | "plaintext" {
  const fileName = path.split(/[\\/]/).at(-1)?.toLowerCase() ?? "";
  const language = fileName.includes(".") ? fileName.split(".").at(-1) : fileName;
  return language && language in bundledLanguages ? (language as BundledLanguage) : "plaintext";
}

export function CodeDiff({ ariaLabel, className, lines, path }: CodeDiffProps) {
  const code = useMemo(() => getHighlightCode(lines), [lines]);
  const language = getLanguage(path);
  const highlightKey = code === null ? null : `${language}:${code}`;
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const horizontalScrollbarRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);
  const verticalScrollbarRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);
  const scrollbarDragRef = useRef<ScrollbarDrag | null>(null);
  const [highlighted, setHighlighted] = useState<HighlightedDiff | null>(null);

  const updateScrollbars = useCallback(() => {
    const viewport = viewportRef.current;
    const horizontalScrollbar = horizontalScrollbarRef.current;
    const horizontalThumb = horizontalThumbRef.current;
    const verticalScrollbar = verticalScrollbarRef.current;
    const verticalThumb = verticalThumbRef.current;
    if (
      !viewport ||
      !horizontalScrollbar ||
      !horizontalThumb ||
      !verticalScrollbar ||
      !verticalThumb
    ) {
      return;
    }

    const horizontalMax = viewport.scrollWidth - viewport.clientWidth;
    const horizontalTrackSize = horizontalScrollbar.clientWidth;
    const horizontalThumbSize = Math.min(
      horizontalTrackSize,
      Math.max(24, (viewport.clientWidth / viewport.scrollWidth) * horizontalTrackSize),
    );
    horizontalScrollbar.dataset.visible = String(horizontalMax > 1);
    horizontalScrollbar.setAttribute("aria-valuemax", String(Math.max(0, horizontalMax)));
    horizontalScrollbar.setAttribute("aria-valuenow", String(viewport.scrollLeft));
    horizontalThumb.style.width = `${horizontalThumbSize}px`;
    horizontalThumb.style.transform = `translateX(${
      horizontalMax > 0
        ? (viewport.scrollLeft / horizontalMax) * (horizontalTrackSize - horizontalThumbSize)
        : 0
    }px)`;

    const verticalMax = viewport.scrollHeight - viewport.clientHeight;
    const verticalTrackSize = verticalScrollbar.clientHeight;
    const verticalThumbSize = Math.min(
      verticalTrackSize,
      Math.max(24, (viewport.clientHeight / viewport.scrollHeight) * verticalTrackSize),
    );
    verticalScrollbar.dataset.visible = String(verticalMax > 1);
    verticalScrollbar.setAttribute("aria-valuemax", String(Math.max(0, verticalMax)));
    verticalScrollbar.setAttribute("aria-valuenow", String(viewport.scrollTop));
    verticalThumb.style.height = `${verticalThumbSize}px`;
    verticalThumb.style.transform = `translateY(${
      verticalMax > 0
        ? (viewport.scrollTop / verticalMax) * (verticalTrackSize - verticalThumbSize)
        : 0
    }px)`;
  }, []);

  useEffect(() => {
    if (code === null || highlightKey === null) return;

    let cancelled = false;

    void codeToTokens(code, {
      defaultColor: false,
      lang: language,
      themes: { dark: "github-dark", light: "github-light" },
    })
      .then(({ tokens }) => {
        if (!cancelled) setHighlighted({ key: highlightKey, tokens });
      })
      .catch(() => {
        if (!cancelled) setHighlighted(null);
      });

    return () => {
      cancelled = true;
    };
  }, [code, highlightKey, language]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = viewport?.firstElementChild;
    if (!viewport || !content) return;

    const resizeObserver = new ResizeObserver(updateScrollbars);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);
    viewport.addEventListener("scroll", updateScrollbars, { passive: true });
    updateScrollbars();

    return () => {
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", updateScrollbars);
    };
  }, [updateScrollbars]);

  useEffect(updateScrollbars, [highlighted, updateScrollbars]);

  function handleTrackPointerDown(
    axis: ScrollbarDrag["axis"],
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (event.target !== event.currentTarget) return;
    const viewport = viewportRef.current;
    const thumb = axis === "horizontal" ? horizontalThumbRef.current : verticalThumbRef.current;
    if (!viewport || !thumb) return;

    const trackBounds = event.currentTarget.getBoundingClientRect();
    const isHorizontal = axis === "horizontal";
    const trackSize = isHorizontal ? trackBounds.width : trackBounds.height;
    const thumbSize = isHorizontal ? thumb.clientWidth : thumb.clientHeight;
    const pointer = isHorizontal
      ? event.clientX - trackBounds.left
      : event.clientY - trackBounds.top;
    const maxScroll = isHorizontal
      ? viewport.scrollWidth - viewport.clientWidth
      : viewport.scrollHeight - viewport.clientHeight;
    const scroll = ((pointer - thumbSize / 2) / Math.max(1, trackSize - thumbSize)) * maxScroll;

    if (isHorizontal) viewport.scrollLeft = scroll;
    else viewport.scrollTop = scroll;
  }

  function handleThumbPointerDown(
    axis: ScrollbarDrag["axis"],
    event: PointerEvent<HTMLDivElement>,
  ) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollbarDragRef.current = {
      axis,
      pointerId: event.pointerId,
      pointerStart: axis === "horizontal" ? event.clientX : event.clientY,
      scrollStart: axis === "horizontal" ? viewport.scrollLeft : viewport.scrollTop,
    };
  }

  function handleThumbPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = scrollbarDragRef.current;
    const viewport = viewportRef.current;
    const track = event.currentTarget.parentElement;
    if (!drag || drag.pointerId !== event.pointerId || !viewport || !track) return;

    const isHorizontal = drag.axis === "horizontal";
    const pointer = isHorizontal ? event.clientX : event.clientY;
    const trackSize = isHorizontal ? track.clientWidth : track.clientHeight;
    const thumbSize = isHorizontal
      ? event.currentTarget.clientWidth
      : event.currentTarget.clientHeight;
    const maxScroll = isHorizontal
      ? viewport.scrollWidth - viewport.clientWidth
      : viewport.scrollHeight - viewport.clientHeight;
    const scroll =
      drag.scrollStart +
      ((pointer - drag.pointerStart) / Math.max(1, trackSize - thumbSize)) * maxScroll;

    if (isHorizontal) viewport.scrollLeft = scroll;
    else viewport.scrollTop = scroll;
  }

  function handleThumbPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (scrollbarDragRef.current?.pointerId !== event.pointerId) return;
    scrollbarDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleScrollbarKeyDown(
    axis: ScrollbarDrag["axis"],
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const isHorizontal = axis === "horizontal";
    const current = isHorizontal ? viewport.scrollLeft : viewport.scrollTop;
    const pageSize = isHorizontal ? viewport.clientWidth : viewport.clientHeight;
    const maxScroll = isHorizontal
      ? viewport.scrollWidth - viewport.clientWidth
      : viewport.scrollHeight - viewport.clientHeight;
    let direction: number | null = null;

    if (event.key === (isHorizontal ? "ArrowLeft" : "ArrowUp")) direction = -40;
    else if (event.key === (isHorizontal ? "ArrowRight" : "ArrowDown")) direction = 40;
    else if (event.key === "PageUp") direction = -pageSize;
    else if (event.key === "PageDown") direction = pageSize;
    else if (event.key === "Home") direction = -current;
    else if (event.key === "End") direction = maxScroll - current;
    if (direction === null) return;

    event.preventDefault();
    if (isHorizontal) viewport.scrollLeft = current + direction;
    else viewport.scrollTop = current + direction;
  }

  const highlightedLines =
    highlightKey !== null && highlighted?.key === highlightKey ? highlighted.tokens : null;

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "relative max-h-[min(60dvh,36rem)] overflow-hidden bg-surface-secondary text-[13px] text-surface-secondary-foreground",
        className,
      )}
      data-slot="code-diff"
    >
      <div
        className="code-diff__viewport max-h-[inherit] overflow-auto"
        id={viewportId}
        ref={viewportRef}
      >
        <div className="w-max min-w-full font-mono leading-6">
          {lines.map((line, index) => (
            <div
              className={cn(
                "grid grid-cols-[40px_40px_20px_minmax(520px,1fr)]",
                DIFF_LINE_CLASS_NAMES[line.type],
              )}
              key={`${index}-${line.oldLineNumber}-${line.newLineNumber}`}
            >
              <span
                className={cn(
                  "border-r px-2 text-right tabular-nums select-none",
                  DIFF_LINE_GUTTER_CLASS_NAMES[line.type],
                )}
              >
                {line.oldLineNumber}
              </span>
              <span
                className={cn(
                  "border-r px-2 text-right tabular-nums select-none",
                  DIFF_LINE_GUTTER_CLASS_NAMES[line.type],
                )}
              >
                {line.newLineNumber}
              </span>
              <span
                className={cn("text-center select-none", DIFF_LINE_GUTTER_CLASS_NAMES[line.type])}
              >
                {DIFF_LINE_MARKERS[line.type]}
              </span>
              <code className="pr-3 whitespace-pre text-surface-secondary-foreground">
                {highlightedLines?.[index]?.length
                  ? highlightedLines[index].map((token, tokenIndex) => (
                      <span
                        className="code-diff__token"
                        key={`${token.offset}-${tokenIndex}`}
                        style={token.htmlStyle as CSSProperties}
                      >
                        {token.content}
                      </span>
                    ))
                  : getRenderedLineContent(line.content)}
              </code>
            </div>
          ))}
        </div>
      </div>
      <div
        aria-controls={viewportId}
        aria-label={`${ariaLabel}，横向滚动`}
        aria-orientation="horizontal"
        aria-valuemax={0}
        aria-valuemin={0}
        aria-valuenow={0}
        className="code-diff__scrollbar code-diff__scrollbar--horizontal"
        ref={horizontalScrollbarRef}
        role="scrollbar"
        tabIndex={0}
        onKeyDown={(event) => handleScrollbarKeyDown("horizontal", event)}
        onPointerDown={(event) => handleTrackPointerDown("horizontal", event)}
      >
        <div
          className="code-diff__scrollbar-thumb"
          ref={horizontalThumbRef}
          onPointerCancel={handleThumbPointerEnd}
          onPointerDown={(event) => handleThumbPointerDown("horizontal", event)}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerEnd}
        />
      </div>
      <div
        aria-controls={viewportId}
        aria-label={`${ariaLabel}，纵向滚动`}
        aria-orientation="vertical"
        aria-valuemax={0}
        aria-valuemin={0}
        aria-valuenow={0}
        className="code-diff__scrollbar code-diff__scrollbar--vertical"
        ref={verticalScrollbarRef}
        role="scrollbar"
        tabIndex={0}
        onKeyDown={(event) => handleScrollbarKeyDown("vertical", event)}
        onPointerDown={(event) => handleTrackPointerDown("vertical", event)}
      >
        <div
          className="code-diff__scrollbar-thumb"
          ref={verticalThumbRef}
          onPointerCancel={handleThumbPointerEnd}
          onPointerDown={(event) => handleThumbPointerDown("vertical", event)}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerEnd}
        />
      </div>
    </section>
  );
}
