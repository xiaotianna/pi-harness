import { ChatMessage as ChatMessagePrimitive } from "@agile-avocation/ui-pro";
import { Button, Surface } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { CodeDiff, parseUnifiedDiff } from "../../../../components/ai/code-diff";
import type { ChatFileChangeMessage } from "../../data/chat";

const DIFF_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const;

function fileName(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path;
}

export function FileChangeThreadMessage({ message }: { message: ChatFileChangeMessage }) {
  const [openChangeId, setOpenChangeId] = useState<string | null>(null);
  const panelId = useId();
  const shouldReduceMotion = useReducedMotion();
  const changes = useMemo(
    () =>
      message.changes.map((change) => ({
        ...change,
        filename: fileName(change.path),
        parsed: parseUnifiedDiff(change.diff),
      })),
    [message.changes],
  );
  const openChange = changes.find((change) => change.id === openChangeId);
  const transition = shouldReduceMotion ? { duration: 0 } : DIFF_TRANSITION;

  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <div className="w-full max-w-full">
          <div className="session-scrollbars overflow-x-auto pb-1">
            <div className="flex w-max gap-2">
              {changes.map((change) => {
                const isOpen = change.id === openChangeId;
                return (
                  <Button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    className="h-8 min-w-0 shrink-0 gap-1.5 px-2.5 font-mono text-xs"
                    key={change.id}
                    size="sm"
                    variant="secondary"
                    onPress={() => setOpenChangeId(isOpen ? null : change.id)}
                  >
                    <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={transition}>
                      <ChevronRight aria-hidden className="size-3 opacity-60" strokeWidth={2.5} />
                    </motion.span>
                    <span title={change.path}>{change.filename}</span>
                    <span className="tabular-nums text-success">+{change.parsed.additions}</span>
                    <span className="tabular-nums text-danger">-{change.parsed.deletions}</span>
                  </Button>
                );
              })}
            </div>
          </div>
          <AnimatePresence initial={false} mode="wait">
            {openChange ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                id={panelId}
                initial={{ opacity: 0, y: 4 }}
                key={openChange.id}
                transition={transition}
              >
                <Surface className="mt-2 overflow-hidden rounded-2xl p-1" variant="secondary">
                  <CodeDiff
                    ariaLabel={`${openChange.path} 变更内容`}
                    className="rounded-xl"
                    lines={openChange.parsed.lines}
                    path={openChange.path}
                  />
                </Surface>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
