type ClassNameFn<T> = (value: T) => string | undefined;
export declare function composeTwRenderProps<T>(className: string | ClassNameFn<T> | undefined, tailwind?: string | ClassNameFn<T>): string | ((value: T) => string);
export declare function composeSlotClassName(slotFn: ((args?: {
    className?: string;
    [key: string]: unknown;
}) => string) | undefined, className?: string, variants?: Record<string, unknown>): string | undefined;
export {};
//# sourceMappingURL=compose.d.ts.map