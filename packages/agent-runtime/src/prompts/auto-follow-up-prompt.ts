// 自循环结束标志位
export const AUTO_FOLLOW_UP_MARKER = "<!-- PI_HARNESS_CONTINUE -->";

/**
 * 注入 System Prompt 的自动续轮规则，用来告诉模型：
    - 仅当用户明确要求跨多个模型轮次自主迭代时启用。
    - 每个响应只执行一轮。
    - 如果任务还没完成，在响应末尾输出固定标记 <!-- PI_HARNESS_CONTINUE -->。
    - 完成任务或普通对话时不输出该标记。
    Runtime 检测到该标记后，才会调用 agent.followUp() 开启下一轮。
 */
export const AUTO_FOLLOW_UP_SYSTEM_INSTRUCTION = `When the user explicitly requests autonomous iteration across multiple model turns, perform exactly one iteration in each response. If another turn is required, end with the exact standalone line ${AUTO_FOLLOW_UP_MARKER}. Do not emit this marker when the task is complete or for ordinary responses.`;

// 实际发给下一轮的内部消息
export const AUTO_FOLLOW_UP_PROMPT = `Continue the autonomous task from the previous assistant response. Treat its latest state or result as the input to this turn and perform exactly one next iteration. If another iteration is still required, end with the exact standalone line ${AUTO_FOLLOW_UP_MARKER}. Otherwise, finish without that marker.`;
