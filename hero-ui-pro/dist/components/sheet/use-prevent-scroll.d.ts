import { useEffect } from 'react';
declare const useIsomorphicLayoutEffect: typeof useEffect;
export declare function isScrollable(node: Element): boolean;
export declare function getScrollParent(node: Element): Element;
export declare function isInput(target: Element): boolean;
interface PreventScrollOptions {
    isDisabled?: boolean;
}
export declare function usePreventScroll(options?: PreventScrollOptions): void;
export { useIsomorphicLayoutEffect };
//# sourceMappingURL=use-prevent-scroll.d.ts.map