import React, { type ComponentPropsWithRef, type ReactNode } from 'react';
import type { TimelineVariants } from './timeline.styles';
export type TimelineAxis = NonNullable<TimelineVariants['axis']>;
export type TimelineItemAlign = NonNullable<TimelineVariants['itemAlign']>;
export type TimelineSide = 'end' | 'start';
export type TimelinePlacement = TimelineSide | 'alternate';
export type TimelineStatus = 'current' | 'danger' | 'default' | 'muted' | 'success' | 'warning';
type TimelineItemContextValue = {
    align: TimelineItemAlign;
    index: number;
    isLast: boolean;
    side: TimelineSide;
    status: TimelineStatus;
};
export declare const useTimelineItem: () => TimelineItemContextValue;
export interface TimelineRootProps extends Omit<ComponentPropsWithRef<'ol'>, 'children'> {
    /** Position of the timeline axis. @default "start" */
    axis?: TimelineVariants['axis'];
    children: ReactNode;
    /** Vertical rhythm between events. @default "comfortable" */
    density?: TimelineVariants['density'];
    /** Default vertical alignment for item content. @default "start" */
    itemAlign?: TimelineVariants['itemAlign'];
    /** Default content side for items. `alternate` alternates start/end by index. @default "end" */
    placement?: TimelinePlacement;
    /** Size variant. @default "md" */
    size?: TimelineVariants['size'];
}
type TimelineItemInternalProps = {
    _index: number;
    _isLast: boolean;
    _side: TimelineSide;
};
export declare const TimelineRoot: ({ axis, children, className, density, itemAlign, placement, size, ...props }: TimelineRootProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface TimelineItemProps extends Omit<ComponentPropsWithRef<'li'>, 'align' | 'children'> {
    /** Vertical alignment for this item's content. @default inherited */
    align?: TimelineItemAlign;
    children?: ReactNode;
    /** Content side when the root axis is centered. */
    side?: TimelineSide;
    /** Marker tone for this item. @default "default" */
    status?: TimelineStatus;
}
export declare const TimelineItem: ({ _index: injectedIndex, _isLast: injectedIsLast, _side: injectedSide, align: alignProp, children, className, side: sideProp, status, ...props }: TimelineItemProps & Partial<TimelineItemInternalProps>) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface TimelineRailProps extends ComponentPropsWithRef<'span'> {
    children?: ReactNode;
}
export declare const TimelineRail: ({ children, className, ...props }: TimelineRailProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface TimelineMarkerProps extends ComponentPropsWithRef<'span'> {
    children?: ReactNode;
    /** Override the marker tone for this item. */
    status?: TimelineStatus;
}
export declare const TimelineMarker: ({ children, className, status: statusProp, ...props }: TimelineMarkerProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export interface TimelineConnectorProps extends ComponentPropsWithRef<'span'> {
    /** Force rendering even for the final item. */
    force?: boolean;
}
export declare const TimelineConnector: ({ className, force, ...props }: TimelineConnectorProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
export interface TimelineContentProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    /** Place content on the start or end side of a centered timeline. */
    side?: TimelineSide;
}
export declare const TimelineContent: ({ children, className, side: sideProp, ...props }: TimelineContentProps) => React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export {};
//# sourceMappingURL=timeline.d.ts.map