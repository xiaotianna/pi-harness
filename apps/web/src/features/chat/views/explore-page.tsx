import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { workspaceListQueryOptions } from "../api/workspace-queries";
import { ThreadMessageList } from "../components/thread-message-list";
import { type ChatMessage, ChatMessageType, ChatToolState } from "../data/chat";
import mockSessionJsonl from "../data/explore-session.jsonl?raw";

const MOCK_TICK_MS = 40;
const MOCK_TICKS_PER_MESSAGE = 48;
const MARKDOWN_CHARS_PER_TICK = 4;
const MOCK_TURN_ID = "explore-turn";
const LOCAL_PATH_MOCKS = [
  { label: "项目清单", path: "package.json" },
  { label: "Web 全局样式", path: "apps/web/src/styles.css" },
  {
    label: "apps/web/src/features/chat/data/explore-session.jsonl",
    path: "apps/web/src/features/chat/data/explore-session.jsonl",
  },
] as const;

const MOCK_MESSAGES = mockSessionJsonl
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as ChatMessage);
const MOCK_ASSISTANT_MESSAGE = (() => {
  const message = MOCK_MESSAGES.at(-1);
  if (message?.type !== ChatMessageType.ASSISTANT) {
    throw new Error("探索页 mock 必须以助手消息结束");
  }
  return message;
})();

const MOCK_PROCESS_MESSAGES = MOCK_MESSAGES.slice(0, -1);
const PROCESS_TICKS = MOCK_PROCESS_MESSAGES.length * MOCK_TICKS_PER_MESSAGE;

function addLocalPathMocks(workspaceRoot?: string): typeof MOCK_ASSISTANT_MESSAGE {
  if (!workspaceRoot) return MOCK_ASSISTANT_MESSAGE;
  const root = workspaceRoot === "/" ? "" : workspaceRoot.replace(/[\\/]$/, "");
  const links = LOCAL_PATH_MOCKS.map(({ label, path }) => {
    const absolutePath = `${root}/${path}`;
    return `- [${label}](<${absolutePath}> "local-path")`;
  }).join("\n");
  return {
    ...MOCK_ASSISTANT_MESSAGE,
    content: `${MOCK_ASSISTANT_MESSAGE.content}\n\n## 本地文件\n\n${links}`,
  };
}

function setActiveProcessState(
  message: ChatMessage,
  active: boolean,
  progress: number,
): ChatMessage {
  if (!active) return message;
  if (message.type === ChatMessageType.REASONING) {
    return {
      ...message,
      isStreaming: true,
      steps: message.steps.map((step) => ({
        ...step,
        content: step.content.slice(0, Math.max(1, Math.ceil(step.content.length * progress))),
      })),
    };
  }
  if (message.type === ChatMessageType.ASSISTANT) {
    return {
      ...message,
      content: message.content.slice(0, Math.max(1, Math.ceil(message.content.length * progress))),
    };
  }
  if (message.type === ChatMessageType.TOOL) {
    return { ...message, tool: { ...message.tool, state: ChatToolState.INPUT_AVAILABLE } };
  }
  if (message.type === ChatMessageType.TOOL_GROUP) {
    const activeToolIndex = Math.min(
      message.tools.length - 1,
      Math.floor(progress * message.tools.length),
    );
    return {
      ...message,
      active: true,
      tools: message.tools.map((tool, index) => ({
        ...tool,
        state:
          index < activeToolIndex ? ChatToolState.OUTPUT_AVAILABLE : ChatToolState.INPUT_AVAILABLE,
      })),
    };
  }
  return message;
}

function setCompletedTurnState(
  message: ChatMessage,
  completed: boolean,
  totalTicks: number,
): ChatMessage {
  return completed && message.type !== ChatMessageType.USER
    ? {
        ...message,
        isIntermediate: true,
        turnDurationMs: totalTicks * MOCK_TICK_MS,
        turnId: MOCK_TURN_ID,
      }
    : message;
}

export function ExplorePage() {
  const [tick, setTick] = useState(0);
  const workspace = useQuery(workspaceListQueryOptions()).data?.[0];
  const mockAssistantMessage = addLocalPathMocks(workspace?.path);
  const totalTicks =
    PROCESS_TICKS + Math.ceil(mockAssistantMessage.content.length / MARKDOWN_CHARS_PER_TICK);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((currentTick) => {
        if (currentTick >= totalTicks) {
          window.clearInterval(interval);
          return currentTick;
        }

        return currentTick + 1;
      });
    }, MOCK_TICK_MS);

    return () => window.clearInterval(interval);
  }, [totalTicks]);

  const visibleProcessCount = Math.min(
    MOCK_PROCESS_MESSAGES.length,
    Math.floor(tick / MOCK_TICKS_PER_MESSAGE) + 1,
  );
  const isProcessing = tick < PROCESS_TICKS;
  const replyLength = Math.max(0, tick - PROCESS_TICKS) * MARKDOWN_CHARS_PER_TICK;
  const isReplyComplete = replyLength >= mockAssistantMessage.content.length;
  const messageProgress = ((tick % MOCK_TICKS_PER_MESSAGE) + 1) / MOCK_TICKS_PER_MESSAGE;
  const processMessages = MOCK_PROCESS_MESSAGES.slice(0, visibleProcessCount).map(
    (message, index) =>
      setCompletedTurnState(
        setActiveProcessState(
          message,
          isProcessing && index === visibleProcessCount - 1,
          messageProgress,
        ),
        isReplyComplete,
        totalTicks,
      ),
  );
  const messages: ChatMessage[] = [
    ...processMessages,
    ...(replyLength > 0
      ? [
          {
            ...mockAssistantMessage,
            content: mockAssistantMessage.content.slice(0, replyLength),
            turnId: MOCK_TURN_ID,
            ...(isReplyComplete ? { actions: "minimal" as const } : {}),
          },
        ]
      : []),
  ];

  return (
    <div className="session-scrollbar session-scrollbars h-full min-h-0 overflow-y-auto">
      <ThreadMessageList
        messages={messages}
        {...(workspace === undefined
          ? {}
          : { workspaceId: workspace.id, workspaceRoot: workspace.path })}
      />
    </div>
  );
}
