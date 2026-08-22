import React from 'react';
import type { SheetPlacement } from './types';
export declare function useSnapPoints({ activeSnapPointProp, container, direction, fadeFromIndex, isOpen, onSnapPointChange, overlayRef, setActiveSnapPointProp, sheetRef, snapPoints, snapToSequentialPoint, }: {
    activeSnapPointProp?: number | string | null;
    setActiveSnapPointProp?: (snapPoint: number | null | string) => void;
    snapPoints?: (number | string)[];
    fadeFromIndex?: number;
    isOpen?: boolean;
    sheetRef: React.RefObject<HTMLDivElement | null>;
    overlayRef: React.RefObject<HTMLDivElement | null>;
    onSnapPointChange: (activeSnapPointIndex: number) => void;
    direction?: SheetPlacement;
    container?: HTMLElement | null;
    snapToSequentialPoint?: boolean;
}): {
    activeSnapPoint: string | number | null;
    activeSnapPointIndex: number | null;
    getPercentageDragged: (absDraggedDistance: number, isDraggingDown: boolean) => number | null;
    isLastSnapPoint: true | null;
    onDrag: ({ draggedDistance }: {
        draggedDistance: number;
    }) => void;
    onRelease: ({ closeDrawer, dismissible, draggedDistance, velocity, }: {
        draggedDistance: number;
        closeDrawer: () => void;
        velocity: number;
        dismissible: boolean;
    }) => void;
    setActiveSnapPoint: (newValue: string | number | ((prevValue: string | number | null) => string | number | null) | null) => void;
    shouldFade: boolean;
    snapPointsOffset: number[];
};
//# sourceMappingURL=use-snap-points.d.ts.map