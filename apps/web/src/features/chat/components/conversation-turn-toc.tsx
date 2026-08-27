import { FloatingToc } from "@agile-avocation/ui-pro";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, type RefObject, useEffect, useMemo, useState } from "react";
import { CHAT_RESPONSE_PENDING_LABEL } from "../constants/chat-response";
import type { ChatMessage } from "../data/chat";
import { getConversationTurnAnchorId, getConversationTurns } from "../utils/conversation-turns";

const TURN_TOC_THRESHOLD = 3;
const TURN_TOC_BAR_STEP_PX = 14;
const TURN_PREVIEW_TRANSITION = { duration: 0.15, ease: [0.22, 1, 0.36, 1] } as const;

export interface ConversationTurnTocProps {
  messages: readonly ChatMessage[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function ConversationTurnToc({ messages, scrollContainerRef }: ConversationTurnTocProps) {
  const turns = useMemo(() => getConversationTurns(messages), [messages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || turns.length <= TURN_TOC_THRESHOLD) return;

    const updateActiveTurn = () => {
      const marker = container.getBoundingClientRect().top + container.clientHeight * 0.25;
      let nextIndex = 0;

      for (const [index, turn] of turns.entries()) {
        const element = document.getElementById(getConversationTurnAnchorId(turn.id));
        if (!element || element.getBoundingClientRect().top > marker) break;
        nextIndex = index;
      }

      setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
    };

    updateActiveTurn();
    container.addEventListener("scroll", updateActiveTurn, { passive: true });
    const resizeObserver = new ResizeObserver(updateActiveTurn);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateActiveTurn);
      resizeObserver.disconnect();
    };
  }, [scrollContainerRef, turns]);

  if (turns.length <= TURN_TOC_THRESHOLD) return null;

  const currentIndex = Math.min(activeIndex, turns.length - 1);
  const peakIndex = hoveredIndex ?? currentIndex;
  const previewTurn = turns[peakIndex] ?? turns[0];
  if (!previewTurn) return null;

  const scrollToTurn = (turnId: string) => {
    document.getElementById(getConversationTurnAnchorId(turnId))?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="absolute top-1/2 left-3 z-20 hidden -translate-y-1/2 md:block">
      <FloatingToc
        closeDelay={120}
        open={isPreviewOpen}
        openDelay={0}
        placement="left"
        triggerMode="hover"
        onOpenChange={(isOpen) => {
          if (isOpen) return;
          setIsPreviewOpen(false);
          setHoveredIndex(null);
        }}
      >
        <FloatingToc.Trigger
          aria-label={`会话目录，当前第 ${currentIndex + 1} 轮，共 ${turns.length} 轮`}
          style={
            {
              "--floating-toc-bar-active-width": hoveredIndex === null ? "8px" : "20px",
              "--floating-toc-bar-level-step": "3px",
              "--floating-toc-bar-width": hoveredIndex === null ? "8px" : "16px",
              gap: 0,
            } as CSSProperties
          }
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) setIsPreviewOpen(true);
          }}
        >
          {turns.map((turn, index) => (
            <FloatingToc.Bar
              active={index === peakIndex}
              className="motion-reduce:after:transition-none"
              key={turn.id}
              level={hoveredIndex === null ? 1 : Math.min(Math.abs(index - hoveredIndex) + 1, 4)}
              style={{ height: TURN_TOC_BAR_STEP_PX }}
              onClick={(event) => {
                event.stopPropagation();
                scrollToTurn(turn.id);
              }}
              onPointerEnter={() => {
                setHoveredIndex(index);
                setIsPreviewOpen(true);
              }}
            />
          ))}
        </FloatingToc.Trigger>
        <FloatingToc.Content
          className="w-80 max-w-[calc(100vw-4rem)] p-0 transition-[top] duration-150 motion-reduce:transition-none"
          crossOffset={(peakIndex - (turns.length - 1) / 2) * TURN_TOC_BAR_STEP_PX}
          style={{ overflow: "hidden" }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={previewTurn.id}
              transition={shouldReduceMotion ? { duration: 0 } : TURN_PREVIEW_TRANSITION}
            >
              <FloatingToc.Item
                active
                aria-label={`跳转到第 ${peakIndex + 1} 轮`}
                className="flex-col items-start gap-1.5 p-3"
                style={{ whiteSpace: "normal" }}
                onClick={() => scrollToTurn(previewTurn.id)}
              >
                <span className="line-clamp-1 w-full text-sm font-medium text-foreground">
                  {previewTurn.userContent}
                </span>
                <span className="line-clamp-3 w-full text-sm leading-5 text-muted">
                  {previewTurn.assistantPreview || CHAT_RESPONSE_PENDING_LABEL}
                </span>
              </FloatingToc.Item>
            </motion.div>
          </AnimatePresence>
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
}
