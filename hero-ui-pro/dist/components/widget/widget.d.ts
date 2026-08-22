import type { ComponentPropsWithRef } from 'react';
import React from 'react';
import { type ReactNode } from 'react';
import type { DOMRenderProps } from '@heroui/react';
interface WidgetRootProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
}
declare const WidgetRoot: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: WidgetRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof WidgetRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
interface WidgetHeaderProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const WidgetHeader: ({ children, className, ...props }: WidgetHeaderProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetTitleProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const WidgetTitle: ({ children, className, ...props }: WidgetTitleProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetDescriptionProps extends ComponentPropsWithRef<'span'> {
    children: ReactNode;
}
declare const WidgetDescription: ({ children, className, ...props }: WidgetDescriptionProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const WidgetContent: ({ children, className, ...props }: WidgetContentProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetFooterProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const WidgetFooter: ({ children, className, ...props }: WidgetFooterProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetLegendProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
declare const WidgetLegend: ({ children, className, ...props }: WidgetLegendProps) => import("react/jsx-runtime").JSX.Element;
interface WidgetLegendItemProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Dot color. Pass a CSS color string or variable. */
    color: string;
}
declare const WidgetLegendItem: ({ children, className, color, ...props }: WidgetLegendItemProps) => import("react/jsx-runtime").JSX.Element;
export { WidgetContent, WidgetDescription, WidgetFooter, WidgetHeader, WidgetLegend, WidgetLegendItem, WidgetRoot, WidgetTitle, };
export type { WidgetContentProps, WidgetDescriptionProps, WidgetFooterProps, WidgetHeaderProps, WidgetLegendItemProps, WidgetLegendProps, WidgetRootProps, WidgetTitleProps, };
//# sourceMappingURL=widget.d.ts.map