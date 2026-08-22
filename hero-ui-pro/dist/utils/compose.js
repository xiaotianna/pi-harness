'use client';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { cx } from 'tailwind-variants';
export function composeTwRenderProps(className, tailwind) {
    const wrapped = composeRenderProps(className, (renderClassName, renderValues) => {
        const base = typeof tailwind === 'function'
            ? (tailwind(renderValues) ?? '')
            : (tailwind ?? '');
        return (cx(base, renderClassName ?? '') ?? '');
    });
    return wrapped;
}
export function composeSlotClassName(slotFn, className, variants) {
    if (typeof slotFn === 'function') {
        return slotFn({ ...variants, className });
    }
    return className;
}
//# sourceMappingURL=compose.js.map