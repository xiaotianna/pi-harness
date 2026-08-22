'use client';
import { createContext } from 'react';
export const DropZoneContext = createContext({
    inputRef: { current: null },
    openFilePicker: () => { },
});
export const DropZoneFileItemContext = createContext({});
//# sourceMappingURL=drop-zone.context.js.map