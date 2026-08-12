export const chatStrings = {
  actions: {
    copy: "Copy",
    menu: "More actions",
    menuTooltip: "More",
    regenerate: "Regenerate",
    thumbsDown: "Bad response",
    thumbsUp: "Good response",
  },
  assistant: {
    avatarAlt: "Assistant",
    avatarFallback: "AI",
  },
  composer: {
    attach: "Attach file",
    model: "Model",
    removeAttachment: "Remove attachment",
    send: "Send message",
    stop: "Stop generation",
  },
  conversation: {
    scrollToBottom: "Scroll to bottom",
  },
  disclaimer: "AI can make mistakes. Check important info.",
  loading: {
    pending: "Loading response",
    thinking: "Thinking...",
  },
  source: {
    sources: (count: number) => `${count} source${count === 1 ? "" : "s"}`,
  },
  tool: {
    approvalNeeded: "Approval needed:",
    approve: "Approve",
    args: "Parameters",
    failed: "Failed tool:",
    reject: "Reject",
    result: "Result",
    running: "Running tool:",
    toolCalls: (count: number) => `${count} tool ${count === 1 ? "call" : "calls"}`,
    used: "Used tool:",
  },
} as const;

export type ChatStrings = typeof chatStrings;
