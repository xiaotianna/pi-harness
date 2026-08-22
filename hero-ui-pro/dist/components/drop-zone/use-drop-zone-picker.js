'use client';
import { useContext } from 'react';
import { DropZoneContext } from './drop-zone.context';
export function useDropZonePickerContext() {
    const { openFilePicker } = useContext(DropZoneContext);
    return { openFilePicker };
}
//# sourceMappingURL=use-drop-zone-picker.js.map