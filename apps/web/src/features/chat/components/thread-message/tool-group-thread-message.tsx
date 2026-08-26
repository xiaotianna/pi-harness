import { ChatMessage as ChatMessagePrimitive, TextShimmer } from "@agile-avocation/ui-pro";
import { Disclosure } from "@heroui/react";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { type ChatToolGroupMessage, ChatToolState } from "../../data/chat";
import { ToolCall } from "./tool-call";

export function ToolGroupThreadMessage({ message }: { message: ChatToolGroupMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const completedCount = message.tools.filter(
    (tool) =>
      tool.state === ChatToolState.OUTPUT_AVAILABLE || tool.state === ChatToolState.OUTPUT_ERROR,
  ).length;
  const activeTool = message.tools.find(
    (tool) =>
      tool.state === ChatToolState.INPUT_AVAILABLE || tool.state === ChatToolState.REQUIRES_ACTION,
  );
  const isActive = message.active ?? activeTool !== undefined;

  return (
    <ChatMessagePrimitive.Assistant className="!py-0">
      <ChatMessagePrimitive.Body>
        <Disclosure
          className="w-full max-w-sm"
          data-slot="tool-call-group"
          isExpanded={isOpen}
          onExpandedChange={setIsOpen}
        >
          <Disclosure.Heading>
            <Disclosure.Trigger className="group flex min-h-7 items-center gap-1.5 p-0 text-[13.5px] text-muted hover:text-foreground">
              {isActive ? null : <Check aria-hidden className="size-3.5 text-success" />}
              <span className="text-start">
                {isActive ? (
                  <TextShimmer className="leading-none">
                    {`正在调用工具 ${Math.min(completedCount + 1, message.tools.length)}/${message.tools.length}${activeTool ? ` ${activeTool.toolName}` : ""}`}
                  </TextShimmer>
                ) : (
                  message.label
                )}
              </span>
              <ChevronDown
                aria-hidden
                className="size-3.5 opacity-60 transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
              />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>
              <div className="flex flex-col gap-1 pt-1">
                {message.tools.map((tool, index) => (
                  <ToolCall key={tool.toolCallId ?? `${tool.toolName}-${index}`} tool={tool} />
                ))}
              </div>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </ChatMessagePrimitive.Body>
    </ChatMessagePrimitive.Assistant>
  );
}
