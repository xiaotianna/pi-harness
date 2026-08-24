import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";
import { AUTO_FOLLOW_UP_PROMPT } from "./prompts/auto-follow-up-prompt.js";
import { requestsAutoFollowUp } from "./utils/auto-follow-up.js";

// 最大自循环次数
const MAX_AUTO_FOLLOW_UP_COUNT = 8;

interface AutoFollowUpMessage {
  content: string;
  isInternal: true;
  role: "user";
  timestamp: number;
}

function createAutoFollowUpMessage(): AutoFollowUpMessage {
  return {
    content: AUTO_FOLLOW_UP_PROMPT,
    isInternal: true,
    role: "user",
    timestamp: Date.now(),
  };
}

/**
 * 自循环处理
 * 为每个 run 创建独立 handler，内部保存续轮次数。
 * 目的是当收到 message_end 时判断是否需要续轮，通过agent.followUp()触发
 */
export function createAutoFollowUpHandler(
  followUp: (message: AgentMessage) => void,
): (event: AgentEvent) => void {
  let count = 0;

  return (event) => {
    if (
      event.type !== "message_end" ||
      count >= MAX_AUTO_FOLLOW_UP_COUNT ||
      // 这个核心就是判断当tool为空，理应结束llm循环，但是通过标志位让ai继续
      // const AUTO_FOLLOW_UP_MARKER: "<!-- PI_HARNESS_CONTINUE -->"
      !requestsAutoFollowUp(event.message)
    ) {
      return;
    }

    count += 1;
    followUp(createAutoFollowUpMessage());
  };
}
