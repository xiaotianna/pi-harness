import type { dropZoneVariants } from './drop-zone.styles';
export type DropZoneContextValue = {
    slots?: ReturnType<typeof dropZoneVariants>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    openFilePicker: () => void;
};
export declare const DropZoneContext: import("react").Context<DropZoneContextValue>;
export type DropZoneFileItemContextValue = {
    status?: 'complete' | 'failed' | 'uploading';
};
export declare const DropZoneFileItemContext: import("react").Context<DropZoneFileItemContextValue>;
//# sourceMappingURL=drop-zone.context.d.ts.map