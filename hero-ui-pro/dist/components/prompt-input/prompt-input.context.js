'use client';
import { createContext, useContext } from 'react';
export const PromptInputContext = createContext(null);
export const usePromptInputContext = () => {
    const ctx = useContext(PromptInputContext);
    if (!ctx)
        throw new Error('PromptInput subcomponents must be used within PromptInput');
    return ctx;
};
//# sourceMappingURL=prompt-input.context.js.map