import { TimelineConnector, TimelineContent, TimelineItem, TimelineMarker, TimelineRail, TimelineRoot, useTimelineItem, } from './timeline';
export const Timeline = Object.assign(TimelineRoot, {
    Connector: TimelineConnector,
    Content: TimelineContent,
    Item: TimelineItem,
    Marker: TimelineMarker,
    Rail: TimelineRail,
    Root: TimelineRoot,
    useItem: useTimelineItem,
});
export { TimelineConnector, TimelineContent, TimelineItem, TimelineMarker, TimelineRail, TimelineRoot, useTimelineItem, };
export { timelineVariants } from './timeline.styles';
//# sourceMappingURL=index.js.map