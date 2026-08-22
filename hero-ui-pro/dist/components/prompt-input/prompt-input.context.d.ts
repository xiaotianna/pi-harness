import { type RefObject } from 'react';
import type { PromptInputVariants, promptInputVariants } from './prompt-input.styles';
import type { ChatStatus } from './prompt-input.types';
export type PromptInputContextValue = {
    allowSubmitWhileRunning: boolean;
    disabled?: boolean;
    isExpanded: boolean;
    isPending?: boolean;
    layout: PromptInputVariants['layout'];
    lockInputOnRun: boolean;
    maxHeight: number | string;
    onStop?: () => void;
    onSubmit?: () => void;
    setExpanded: (expanded: boolean) => void;
    setValue: (value: string) => void;
    slots?: ReturnType<typeof promptInputVariants>;
    status: ChatStatus;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    variant: PromptInputVariants['variant'];
    value: string;
};
export declare const PromptInputContext: import("react").Context<PromptInputContextValue | null>;
export declare const usePromptInputContext: () => PromptInputContextValue;
//# sourceMappingURL=prompt-input.context.d.ts.map