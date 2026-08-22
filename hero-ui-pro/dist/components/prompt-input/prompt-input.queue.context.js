'use client';
import { createContext, useContext } from 'react';
export const PromptInputQueueListContext = createContext({
    reorderEnabled: false,
});
export const PromptInputQueueItemContext = createContext({});
export const usePromptInputQueueListContext = () => useContext(PromptInputQueueListContext);
export const usePromptInputQueueItemContext = () => useContext(PromptInputQueueItemContext);
//# sourceMappingURL=prompt-input.queue.context.js.map