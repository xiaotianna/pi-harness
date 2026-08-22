'use client';
import * as React from 'react';
export function useControlled({ controlled, default: defaultProp, onChange, }) {
    const { current: isControlled } = React.useRef(controlled !== undefined);
    const [internalValue, setInternalValue] = React.useState(defaultProp);
    const value = isControlled ? controlled : internalValue;
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;
    const setValue = React.useCallback((newValue) => {
        if (!isControlled) {
            setInternalValue(newValue);
        }
        onChangeRef.current?.(newValue);
    }, []);
    return [value, setValue];
}
//# sourceMappingURL=use-controlled.js.map