import type { VariantProps } from 'tailwind-variants';
export declare const chatToolVariants: import("tailwind-variants").TVReturnType<{
    state: {
        complete: "chat-tool--complete";
        error: "chat-tool--error";
        requiresAction: "chat-tool--requires-action";
        running: "chat-tool--running";
        streaming: "chat-tool--streaming";
    };
}, {
    approval: string;
    approvalActions: string;
    args: string;
    argsLabel: string;
    base: string;
    content: string;
    contentBody: string;
    error: string;
    errorLabel: string;
    meta: string;
    result: string;
    resultLabel: string;
    status: string;
    trigger: string;
    triggerLabel: string;
}, undefined, {
    state: {
        complete: "chat-tool--complete";
        error: "chat-tool--error";
        requiresAction: "chat-tool--requires-action";
        running: "chat-tool--running";
        streaming: "chat-tool--streaming";
    };
}, {
    approval: string;
    approvalActions: string;
    args: string;
    argsLabel: string;
    base: string;
    content: string;
    contentBody: string;
    error: string;
    errorLabel: string;
    meta: string;
    result: string;
    resultLabel: string;
    status: string;
    trigger: string;
    triggerLabel: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    state: {
        complete: "chat-tool--complete";
        error: "chat-tool--error";
        requiresAction: "chat-tool--requires-action";
        running: "chat-tool--running";
        streaming: "chat-tool--streaming";
    };
}, {
    approval: string;
    approvalActions: string;
    args: string;
    argsLabel: string;
    base: string;
    content: string;
    contentBody: string;
    error: string;
    errorLabel: string;
    meta: string;
    result: string;
    resultLabel: string;
    status: string;
    trigger: string;
    triggerLabel: string;
}>>;
export type ChatToolVariants = VariantProps<typeof chatToolVariants>;
export declare const chatToolGroupVariants: import("tailwind-variants").TVReturnType<{
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            contentBody?: import("tailwind-variants").ClassValue;
            triggerLabel?: import("tailwind-variants").ClassValue;
        };
    };
} | {
    [x: string]: {
        [x: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            contentBody?: import("tailwind-variants").ClassValue;
            triggerLabel?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    base: string;
    content: string;
    contentBody: string;
    trigger: string;
    triggerLabel: string;
}, undefined, {
    [key: string]: {
        [key: string]: import("tailwind-variants").ClassValue | {
            base?: import("tailwind-variants").ClassValue;
            content?: import("tailwind-variants").ClassValue;
            trigger?: import("tailwind-variants").ClassValue;
            contentBody?: import("tailwind-variants").ClassValue;
            triggerLabel?: import("tailwind-variants").ClassValue;
        };
    };
} | {}, {
    base: string;
    content: string;
    contentBody: string;
    trigger: string;
    triggerLabel: string;
}, import("tailwind-variants").TVReturnTypeLike<unknown, {
    base: string;
    content: string;
    contentBody: string;
    trigger: string;
    triggerLabel: string;
}>>;
export type ChatToolGroupVariants = typeof chatToolGroupVariants;
//# sourceMappingURL=chat-tool.styles.d.ts.map