import { ThinkingLevel } from "@pi-harness/agent-runtime/thinking-level";

export const THINKING_LEVEL_OPTIONS = [
  { description: "关闭扩展推理", label: "关闭", value: ThinkingLevel.OFF },
  { description: "最少推理，响应最快", label: "最少", value: ThinkingLevel.MINIMAL },
  { description: "响应更快、成本更低", label: "低", value: ThinkingLevel.LOW },
  { description: "默认均衡", label: "中", value: ThinkingLevel.MEDIUM },
  { description: "质量更好，但更慢、更贵", label: "高", value: ThinkingLevel.HIGH },
  { description: "更深入地分析复杂任务", label: "极高", value: ThinkingLevel.XHIGH },
  { description: "使用模型支持的最高强度", label: "最高", value: ThinkingLevel.MAX },
] as const;

export const MODEL_MENU_LAYOUT_OPTIONS = { gap: 2, padding: 6, rowSize: 36 } as const;
