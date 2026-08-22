'use client';
import React, { createContext, useContext, useMemo, } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { composeSlotClassName } from '../../utils/compose';
import { timelineVariants } from './timeline.styles';
const TimelineContext = createContext({
    axis: 'start',
    itemAlign: 'start',
    placement: 'end',
    slots: timelineVariants(),
});
const TimelineItemContext = createContext({
    align: 'start',
    index: 0,
    isLast: false,
    side: 'end',
    status: 'default',
});
export const useTimelineItem = () => useContext(TimelineItemContext);
function isTimelineItem(child) {
    return React.isValidElement(child) && child.type === TimelineItem;
}
function resolveSide(index, placement, side) {
    if (side)
        return side;
    if (placement === 'alternate')
        return index % 2 === 0 ? 'end' : 'start';
    return placement;
}
export const TimelineRoot = ({ axis = 'start', children, className, density = 'comfortable', itemAlign = 'start', placement = 'end', size = 'md', ...props }) => {
    const slots = useMemo(() => timelineVariants({ axis, density, itemAlign, size }), [axis, density, itemAlign, size]);
    const contextValue = useMemo(() => ({
        axis: axis ?? 'start',
        itemAlign: itemAlign ?? 'start',
        placement,
        slots,
    }), [axis, itemAlign, placement, slots]);
    const childrenArray = React.Children.toArray(children);
    const itemCount = childrenArray.filter(isTimelineItem).length;
    let itemIndex = 0;
    const mappedChildren = childrenArray.map((child) => {
        if (!isTimelineItem(child))
            return child;
        const index = itemIndex++;
        const side = resolveSide(index, placement, child.props.side);
        return React.cloneElement(child, {
            _index: index,
            _isLast: index === itemCount - 1,
            _side: side,
            key: child.key ?? `timeline-item-${index}`,
        });
    });
    return jsx(TimelineContext, {
        value: contextValue,
        children: jsx('ol', {
            className: composeSlotClassName(slots?.base, className),
            'data-axis': axis,
            'data-placement': placement,
            'data-slot': 'timeline',
            ...props,
            children: mappedChildren,
        }),
    });
};
export const TimelineItem = ({ _index: injectedIndex, _isLast: injectedIsLast, _side: injectedSide, align: alignProp, children, className, side: sideProp, status = 'default', ...props }) => {
    const { itemAlign, placement, slots } = useContext(TimelineContext);
    const index = injectedIndex ?? 0;
    const isLast = injectedIsLast ?? false;
    const align = alignProp ?? itemAlign;
    const side = injectedSide ?? resolveSide(index, placement, sideProp);
    const contextValue = useMemo(() => ({ align, index, isLast, side, status }), [align, index, isLast, side, status]);
    const railChildren = [];
    const contentChildren = [];
    let railElement = null;
    let railChildrenProp = null;
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) &&
            child.type === TimelineRail) {
            railElement = child;
            railChildrenProp = child.props.children;
        }
        else if (!React.isValidElement(child) ||
            (child.type !== TimelineMarker && child.type !== TimelineConnector)) {
            railChildren.push(child);
        }
        else {
            contentChildren.push(child);
        }
    });
    const resolvedRail = railElement && contentChildren.length > 0
        ? React.cloneElement(railElement, {
            children: jsxs(Fragment, {
                children: [railChildrenProp, contentChildren],
            }),
        })
        : (railElement ?? jsx(TimelineRail, { children: contentChildren }));
    return jsx(TimelineItemContext, {
        value: contextValue,
        children: jsxs('li', {
            'aria-current': status === 'current' ? 'true' : undefined,
            className: composeSlotClassName(slots?.item, className, {
                itemAlign: align,
            }),
            'data-align': align,
            'data-index': index,
            'data-last': isLast || undefined,
            'data-side': side,
            'data-slot': 'timeline-item',
            'data-status': status,
            ...props,
            children: [railChildren, resolvedRail],
        }),
    });
};
export const TimelineRail = ({ children, className, ...props }) => {
    const { slots } = useContext(TimelineContext);
    const childrenArray = React.Children.toArray(children);
    const hasMarker = childrenArray.some((child) => React.isValidElement(child) && child.type === TimelineMarker);
    const hasConnector = childrenArray.some((child) => React.isValidElement(child) && child.type === TimelineConnector);
    return jsxs('span', {
        className: composeSlotClassName(slots?.rail, className),
        'data-slot': 'timeline-rail',
        ...props,
        children: [
            !hasMarker ? jsx(TimelineMarker, {}) : null,
            children,
            !hasConnector ? jsx(TimelineConnector, {}) : null,
        ],
    });
};
export const TimelineMarker = ({ children, className, status: statusProp, ...props }) => {
    const { slots } = useContext(TimelineContext);
    const { status } = useTimelineItem();
    const resolvedStatus = statusProp ?? status;
    const ariaProps = {
        'aria-hidden': children
            ? props['aria-hidden']
            : (props['aria-hidden'] ?? true),
        ...props,
    };
    return jsx('span', {
        className: composeSlotClassName(slots?.marker, className),
        'data-slot': 'timeline-marker',
        'data-status': resolvedStatus,
        ...ariaProps,
        children,
    });
};
export const TimelineConnector = ({ className, force, ...props }) => {
    const { slots } = useContext(TimelineContext);
    const { isLast } = useTimelineItem();
    if (isLast && !force)
        return null;
    return jsx('span', {
        'aria-hidden': 'true',
        className: composeSlotClassName(slots?.connector, className),
        'data-force': force || undefined,
        'data-slot': 'timeline-connector',
        ...props,
    });
};
export const TimelineContent = ({ children, className, side: sideProp, ...props }) => {
    const { slots } = useContext(TimelineContext);
    const { side } = useTimelineItem();
    const resolvedSide = sideProp ?? side;
    return jsx('div', {
        className: composeSlotClassName(slots?.content, className),
        'data-side': resolvedSide,
        'data-slot': 'timeline-content',
        ...props,
        children,
    });
};
//# sourceMappingURL=timeline.js.map