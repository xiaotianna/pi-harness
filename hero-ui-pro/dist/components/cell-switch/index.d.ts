import type { ComponentProps } from 'react';
import { CellSwitchControl, CellSwitchLabel, CellSwitchRoot, CellSwitchTrigger } from './cell-switch';
export { cellSwitchVariants } from './cell-switch.styles';
export declare const CellSwitch: (({ children, className, variant, ...props }: import("./cell-switch").CellSwitchRootProps) => import("react/jsx-runtime").JSX.Element) & {
    Control: ({ children, className, ...props }: import("./cell-switch").CellSwitchControlProps) => import("react/jsx-runtime").JSX.Element;
    Label: ({ children, className, ...props }: import("./cell-switch").CellSwitchLabelProps) => import("react/jsx-runtime").JSX.Element;
    Root: ({ children, className, variant, ...props }: import("./cell-switch").CellSwitchRootProps) => import("react/jsx-runtime").JSX.Element;
    Trigger: ({ children, className, ...props }: import("./cell-switch").CellSwitchTriggerProps) => import("react/jsx-runtime").JSX.Element;
};
export { CellSwitchControl, CellSwitchLabel, CellSwitchRoot, CellSwitchTrigger, };
export type { CellSwitchControlProps, CellSwitchLabelProps, CellSwitchRootProps as CellSwitchProps, CellSwitchRootProps, CellSwitchTriggerProps, } from './cell-switch';
export type { CellSwitchVariants } from './cell-switch.styles';
export type CellSwitch = {
    ControlProps: ComponentProps<typeof CellSwitchControl>;
    LabelProps: ComponentProps<typeof CellSwitchLabel>;
    Props: ComponentProps<typeof CellSwitchRoot>;
    RootProps: ComponentProps<typeof CellSwitchRoot>;
    TriggerProps: ComponentProps<typeof CellSwitchTrigger>;
};
//# sourceMappingURL=index.d.ts.map