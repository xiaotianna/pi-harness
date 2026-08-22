import type { ChatStatus } from './prompt-input.types';
export declare function resolvePromptInputStatus(status?: ChatStatus, isPending?: boolean): ChatStatus;
export declare function isPromptInputGenerating(status: ChatStatus): boolean;
/** Compact inline row height — fixed so expand detection does not depend on current layout. */
export declare const PROMPT_INPUT_INLINE_COMPACT_HEIGHT = 50;
export declare function getPromptInputSingleLineHeight(element: HTMLTextAreaElement): number;
export declare function getPromptInputLineHeight(element: HTMLTextAreaElement): number;
/** Content scroll height with box constraints cleared — avoids min-height skew on mobile. */
export declare function measurePromptInputScrollHeight(element: HTMLTextAreaElement): number;
export declare function resolvePromptInputTextAreaElement(element: HTMLTextAreaElement | null): HTMLTextAreaElement | null;
/** True when the textarea content needs at least two lines (wrap or newline). */
export declare function isPromptInputTextAreaExpanded(element: HTMLTextAreaElement): boolean;
//# sourceMappingURL=prompt-input.utils.d.ts.map