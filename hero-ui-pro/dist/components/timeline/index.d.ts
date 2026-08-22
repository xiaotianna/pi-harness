import type { ComponentProps } from 'react';
import { TimelineConnector, TimelineContent, TimelineItem, TimelineMarker, TimelineRail, TimelineRoot, useTimelineItem } from './timeline';
export declare const Timeline: (({ axis, children, className, density, itemAlign, placement, size, ...props }: import("./timeline").TimelineRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Connector: ({ className, force, ...props }: import("./timeline").TimelineConnectorProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
    Content: ({ children, className, side: sideProp, ...props }: import("./timeline").TimelineContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Item: ({ _index: injectedIndex, _isLast: injectedIsLast, _side: injectedSide, align: alignProp, children, className, side: sideProp, status, ...props }: import("./timeline").TimelineItemProps & Partial<{
        _index: number;
        _isLast: boolean;
        _side: import("./timeline").TimelineSide;
    }>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Marker: ({ children, className, status: statusProp, ...props }: import("./timeline").TimelineMarkerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Rail: ({ children, className, ...props }: import("./timeline").TimelineRailProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Root: ({ axis, children, className, density, itemAlign, placement, size, ...props }: import("./timeline").TimelineRootProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    useItem: () => {
        align: import("./timeline").TimelineItemAlign;
        index: number;
        isLast: boolean;
        side: import("./timeline").TimelineSide;
        status: import("./timeline").TimelineStatus;
    };
};
export type Timeline = {
    ConnectorProps: ComponentProps<typeof TimelineConnector>;
    ContentProps: ComponentProps<typeof TimelineContent>;
    ItemProps: ComponentProps<typeof TimelineItem>;
    MarkerProps: ComponentProps<typeof TimelineMarker>;
    Props: ComponentProps<typeof TimelineRoot>;
    RailProps: ComponentProps<typeof TimelineRail>;
    RootProps: ComponentProps<typeof TimelineRoot>;
};
export { TimelineConnector, TimelineContent, TimelineItem, TimelineMarker, TimelineRail, TimelineRoot, useTimelineItem, };
export type { TimelineAxis, TimelineConnectorProps, TimelineContentProps, TimelineItemAlign, TimelineItemProps, TimelineMarkerProps, TimelinePlacement, TimelineRootProps as TimelineProps, TimelineRailProps, TimelineRootProps, TimelineSide, TimelineStatus, } from './timeline';
export type { TimelineVariants } from './timeline.styles';
export { timelineVariants } from './timeline.styles';
//# sourceMappingURL=index.d.ts.map