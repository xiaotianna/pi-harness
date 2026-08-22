import type { DragControls } from 'motion/react';
type PromptInputQueueListContextValue = {
    reorderEnabled: boolean;
};
type PromptInputQueueItemContextValue = {
    dragControls?: DragControls;
};
export declare const PromptInputQueueListContext: import("react").Context<PromptInputQueueListContextValue>;
export declare const PromptInputQueueItemContext: import("react").Context<PromptInputQueueItemContextValue>;
export declare const usePromptInputQueueListContext: () => PromptInputQueueListContextValue;
export declare const usePromptInputQueueItemContext: () => PromptInputQueueItemContextValue;
export {};
//# sourceMappingURL=prompt-input.queue.context.d.ts.map