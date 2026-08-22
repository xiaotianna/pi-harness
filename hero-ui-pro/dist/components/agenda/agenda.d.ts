import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';
import React from 'react';
import { CalendarDate, CalendarDateTime } from '@internationalized/date';
import type { agendaVariants } from './agenda.styles';
import type { AgendaEvent as AgendaEventData, AgendaView, AllDayLayoutItem, DragState, DropPreview, MonthRowLayout } from './use-agenda';
export interface AgendaRootProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
    view: AgendaView;
    date: CalendarDate;
    selectedEventId: string | null;
    events: AgendaEventData[];
    startHour: number;
    endHour: number;
    slotDuration: number;
    goToNext: () => void;
    goToPrevious: () => void;
    goToToday: () => void;
    setView: (view: AgendaView) => void;
    setDate: (date: CalendarDate) => void;
    selectEvent: (id: string | null) => void;
    visibleDays: CalendarDate[];
    visibleWeeks: CalendarDate[][];
    allDayEvents: AgendaEventData[];
    allDayLayout: AllDayLayoutItem[];
    allDayCountPerDay: number[];
    isAllDayExpanded: boolean;
    toggleAllDayExpanded: () => void;
    getEventLayout: (eventId: string) => {
        columnIndex: number;
        totalColumns: number;
    };
    getEventsForDay: (date: CalendarDate) => AgendaEventData[];
    getMonthRowLayout: (week: CalendarDate[]) => MonthRowLayout;
    getPerCellEvents: (day: CalendarDate, week: CalendarDate[]) => AgendaEventData[];
    getAllEventsForDay: (date: CalendarDate) => AgendaEventData[];
    heading: string;
    slots: ReturnType<typeof agendaVariants>;
    onEventCreate?: (event: {
        start: CalendarDateTime;
        end: CalendarDateTime;
    }) => void;
    onEventDelete?: (id: string) => void;
    onEventMove?: (id: string, start: CalendarDateTime, end: CalendarDateTime) => void;
    onEventResize?: (id: string, start: CalendarDateTime, end: CalendarDateTime) => void;
    dragState: DragState;
    setDragState: React.Dispatch<React.SetStateAction<DragState>>;
    dropPreview: DropPreview | null;
    setDropPreview: React.Dispatch<React.SetStateAction<DropPreview | null>>;
    timeZone: string;
    locale: string;
}
export interface AgendaHeaderProps extends ComponentPropsWithRef<'header'> {
    children?: ReactNode;
}
export interface AgendaHeadingProps extends ComponentPropsWithRef<'h1'> {
}
export interface AgendaNavigationProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
}
export interface AgendaNavButtonProps {
    slot?: 'previous' | 'next';
    children?: ReactNode;
    className?: string;
}
export interface AgendaTodayButtonProps {
    children?: ReactNode;
    className?: string;
}
export interface AgendaViewSelectorProps {
    children?: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}
export interface AgendaBodyProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
}
export interface AgendaWeekHeaderProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
}
export interface AgendaDayHeaderProps extends ComponentPropsWithRef<'div'> {
    date: CalendarDate;
}
export interface AgendaAllDaySectionProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
    collapsedLabel?: (count: number) => string;
}
export interface AgendaAllDayLabelProps extends ComponentPropsWithRef<'span'> {
    children?: ReactNode;
}
export interface AgendaAllDayEventProps extends ComponentPropsWithRef<'div'> {
    event: AgendaEventData;
    colStart: number;
    colSpan: number;
    row: number;
}
export interface AgendaTimeGridProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
}
export interface AgendaDayColumnProps extends ComponentPropsWithRef<'div'> {
    date: CalendarDate;
    children?: ReactNode;
}
export interface AgendaEventProps {
    event: AgendaEventData;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
}
export interface AgendaEventTitleProps extends ComponentPropsWithRef<'span'> {
    children?: ReactNode;
}
export interface AgendaEventTimeProps extends ComponentPropsWithRef<'span'> {
    event?: AgendaEventData;
}
export interface AgendaCurrentTimeIndicatorProps extends ComponentPropsWithRef<'div'> {
}
export interface AgendaMonthGridProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
}
export interface AgendaMonthRowProps extends ComponentPropsWithRef<'div'> {
    children?: ReactNode;
    spanningRowCount?: number;
}
export interface AgendaMonthSpanningEventProps extends ComponentPropsWithRef<'div'> {
    event: AgendaEventData;
    colStart: number;
    colSpan: number;
    row: number;
}
export interface AgendaMonthCellProps extends ComponentPropsWithRef<'div'> {
    date: CalendarDate;
    children?: ReactNode;
    maxEvents?: number;
    moreLabel?: (count: number) => string;
    spanningRowCount?: number;
}
export interface AgendaMonthEventProps {
    event: AgendaEventData;
    children?: ReactNode;
    className?: string;
}
export declare const AgendaRoot: ({ children, className, allDayCountPerDay, allDayEvents, allDayLayout, date, dragState, dropPreview, endHour, events, getAllEventsForDay, getEventLayout, getEventsForDay, getMonthRowLayout, getPerCellEvents, goToNext, goToPrevious, goToToday, heading, isAllDayExpanded, locale, onEventCreate, onEventDelete, onEventMove, onEventResize, selectEvent, selectedEventId, setDate, setDragState, setDropPreview, setView, slotDuration, slots, startHour, timeZone, toggleAllDayExpanded, view, visibleDays, visibleWeeks, ...rest }: AgendaRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaHeader: ({ children, className, ...props }: AgendaHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaHeading: ({ className, ...props }: AgendaHeadingProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaNavigation: ({ children, className, ...props }: AgendaNavigationProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaNavButton: ({ children, className, slot, }: AgendaNavButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaTodayButton: ({ children, className, }: AgendaTodayButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaViewSelector: ({ children, className, size, }: AgendaViewSelectorProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaBody: ({ children, className, ...props }: AgendaBodyProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaWeekHeader: ({ children, className, ...props }: AgendaWeekHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaDayHeader: ({ className, date: dayDate, ...props }: AgendaDayHeaderProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaAllDaySection: ({ children, className, collapsedLabel, style, ...props }: AgendaAllDaySectionProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaAllDayLabel: ({ children, className, ...props }: AgendaAllDayLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaAllDayEvent: ({ children, className, colSpan, colStart, event, row, style, ...props }: AgendaAllDayEventProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaTimeGrid: ({ children, className, ...props }: AgendaTimeGridProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaDayColumn: ({ children, className, date: dayDate, ...props }: AgendaDayColumnProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaEvent: ({ children, className, event, style, }: AgendaEventProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaEventTitle: ({ children, className, ...props }: AgendaEventTitleProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaEventTime: ({ className, event, ...props }: AgendaEventTimeProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaCurrentTimeIndicator: ({ className, ...props }: AgendaCurrentTimeIndicatorProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const AgendaMonthGrid: ({ children, className, ...props }: AgendaMonthGridProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaMonthRow: ({ children, className, spanningRowCount: _spanningRowCount, style, ...props }: AgendaMonthRowProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaMonthSpanningEvent: ({ children, className, colSpan, colStart, event, row, style, ...props }: AgendaMonthSpanningEventProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaMonthCell: ({ children, className, date: cellDate, maxEvents, moreLabel, spanningRowCount, style: styleProp, ...props }: AgendaMonthCellProps) => import("react/jsx-runtime").JSX.Element;
export declare const AgendaMonthEvent: ({ children, className, event, }: AgendaMonthEventProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=agenda.d.ts.map