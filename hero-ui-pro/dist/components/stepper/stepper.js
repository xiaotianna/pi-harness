'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useMemo, useState, } from 'react';
import { composeSlotClassName } from '../../utils/compose';
import { stepperVariants } from './stepper.styles';
const StepperContext = createContext({
    currentStep: 0,
    slots: {},
});
const StepperStepContext = createContext({
    index: 0,
    isLast: false,
    status: 'inactive',
});
/**
 * Hook to access per-step context (index, status, isLast) from any descendant
 * of `<Stepper.Step>`.
 */
const useStepperStep = () => useContext(StepperStepContext);
const StepperRoot = ({ children, className, currentStep: currentStepProp, defaultStep = 0, onStepChange, orientation = 'horizontal', size = 'md', ...props }) => {
    const [internalStep, setInternalStep] = useState(defaultStep);
    const currentStep = currentStepProp ?? internalStep;
    const slots = useMemo(() => stepperVariants({ orientation, size }), [orientation, size]);
    const childArray = React.Children.toArray(children);
    let stepCount = 0;
    childArray.forEach((child) => {
        if (React.isValidElement(child) && child.type === StepperStep)
            stepCount++;
    });
    let stepIndex = 0;
    const clonedChildren = childArray.map((child) => {
        if (React.isValidElement(child) && child.type === StepperStep) {
            const idx = stepIndex++;
            return React.cloneElement(child, {
                _index: idx,
                _isLast: idx === stepCount - 1,
                key: child.key ?? `step-${idx}`,
            });
        }
        return child;
    });
    return (_jsx(StepperContext.Provider, { value: {
            currentStep,
            onStepChange: onStepChange
                ? (step) => {
                    if (currentStepProp === undefined)
                        setInternalStep(step);
                    onStepChange?.(step);
                }
                : undefined,
            slots,
        }, children: _jsx("ol", { "aria-label": "Progress", className: composeSlotClassName(slots?.base, className), "data-slot": "stepper", ...props, children: clonedChildren }) }));
};
const StepperIndicator = ({ children, className, ...props }) => {
    const { slots } = useContext(StepperContext);
    const { index, status } = useContext(StepperStepContext);
    const defaultContent = status === 'complete' ? (_jsx(StepperIcon, { children: _jsx("svg", { "aria-hidden": "true", "data-slot": "stepper-default-checkmark", fill: "none", role: "presentation", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, viewBox: "0 0 17 18", children: _jsx("polyline", { points: "1 9 7 14 15 4" }) }) })) : (_jsx("span", { children: index + 1 }));
    return (_jsx("span", { className: composeSlotClassName(slots?.indicator, className), "data-slot": "stepper-indicator", "data-status": status, ...props, children: children ?? defaultContent }));
};
const StepperContent = ({ children, className, ...props }) => {
    const { slots } = useContext(StepperContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.content, className), "data-slot": "stepper-content", ...props, children: children }));
};
const StepperTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(StepperContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.title, className), "data-slot": "stepper-title", ...props, children: children }));
};
const StepperDescription = ({ children, className, ...props }) => {
    const { slots } = useContext(StepperContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.description, className), "data-slot": "stepper-description", ...props, children: children }));
};
const StepperIcon = ({ children, className, ...props }) => {
    const { slots } = useContext(StepperContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.icon, className), "data-slot": "stepper-icon", ...props, children: children }));
};
const StepperSeparator = ({ className, force, progress: progressProp, ...props }) => {
    const { currentStep, slots } = useContext(StepperContext);
    const { index, isLast } = useContext(StepperStepContext);
    if (isLast && !force)
        return null;
    const currentFloor = Math.floor(currentStep);
    const progress = Math.min(1, Math.max(0, progressProp ??
        (currentFloor > index
            ? 1
            : currentFloor === index
                ? currentStep - currentFloor
                : 0)));
    return (_jsx("div", { "aria-hidden": "true", className: composeSlotClassName(slots?.separator, className), "data-slot": "stepper-separator", ...props, children: _jsx("div", { className: slots?.separatorTrack(), "data-complete": progress >= 1 || undefined, "data-slot": "stepper-separator-track", children: _jsx("div", { className: slots?.separatorFill(), "data-slot": "stepper-separator-fill", style: { '--stepper-separator-progress': progress } }) }) }));
};
const StepperStep = ({ _index: injectedIndex, _isLast: injectedIsLast, children, className, ...restProps }) => {
    const { currentStep, onStepChange, slots } = useContext(StepperContext);
    const index = injectedIndex ?? 0;
    const isLast = injectedIsLast ?? false;
    const currentFloor = Math.floor(currentStep);
    const status = currentFloor === index
        ? 'active'
        : currentFloor > index
            ? 'complete'
            : 'inactive';
    const ctxValue = useMemo(() => ({ index, isLast, status }), [index, isLast, status]);
    const regularChildren = [];
    let separator = null;
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === StepperSeparator) {
            separator = child;
        }
        else {
            regularChildren.push(child);
        }
    });
    return (_jsx(StepperStepContext.Provider, { value: ctxValue, children: _jsxs("li", { className: composeSlotClassName(slots?.step, className), "data-index": index, "data-slot": "stepper-step", "data-status": status, ...restProps, children: [_jsx("button", { "aria-current": status === 'active' ? 'step' : undefined, className: slots?.stepButton(), "data-clickable": !!onStepChange || undefined, "data-slot": "stepper-step-button", tabIndex: onStepChange ? undefined : -1, type: "button", onClick: onStepChange ? () => onStepChange(index) : undefined, children: regularChildren }), separator] }) }));
};
export { StepperContent, StepperDescription, StepperIcon, StepperIndicator, StepperRoot, StepperSeparator, StepperStep, StepperTitle, useStepperStep, };
//# sourceMappingURL=stepper.js.map