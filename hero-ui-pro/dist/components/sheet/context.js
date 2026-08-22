'use client';
import React from 'react';
export const SheetContext = React.createContext({
    onDrag: () => { },
    isDismissable: false,
    onNestedDrag: () => { },
    isDragging: false,
    onNestedOpenChange: () => { },
    isOpen: false,
    onPress: () => { },
    keyboardIsOpen: { current: false },
    overlayRef: { current: null },
    isHandleOnly: false,
    sheetRef: { current: null },
    activeSnapPoint: null,
    isModal: false,
    onRelease: () => { },
    closeSheet: () => { },
    onNestedRelease: () => { },
    onOpenChange: () => { },
    openProp: undefined,
    container: null,
    placement: 'bottom',
    isDetached: false,
    snapPoints: null,
    noBodyStyles: false,
    snapPointsOffset: null,
    setActiveSnapPoint: () => { },
    setBackgroundColorOnScale: true,
    setIsOpen: () => { },
    shouldFade: false,
    shouldAnimate: { current: true },
    shouldAutoFocus: false,
    shouldScaleBackground: false,
});
export const useSheetContext = () => {
    const ctx = React.useContext(SheetContext);
    if (!ctx) {
        throw new Error('useSheetContext must be used within a Sheet.Root');
    }
    return ctx;
};
//# sourceMappingURL=context.js.map