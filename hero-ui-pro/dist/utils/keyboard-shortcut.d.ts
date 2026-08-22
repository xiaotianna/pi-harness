export interface ParsedShortcut {
    alt: boolean;
    ctrl: boolean;
    key: string;
    meta: boolean;
    mod: boolean;
    shift: boolean;
}
export declare function parseToggleShortcut(shortcut: string): ParsedShortcut | null;
export declare function matchesShortcut(event: KeyboardEvent, shortcut: ParsedShortcut): boolean;
//# sourceMappingURL=keyboard-shortcut.d.ts.map