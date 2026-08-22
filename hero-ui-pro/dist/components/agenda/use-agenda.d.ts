import type React from 'react';
import type { CalendarDateTime } from '@internationalized/date';
import { CalendarDate } from '@internationalized/date';
import { agendaVariants } from './agenda.styles';
export interface AgendaEvent {
    id: string;
    title: string;
    start: CalendarDateTime;
    end: CalendarDateTime;
    color?: string;
    isAllDay?: boolean;
    isReadOnly?: boolean;
    status?: 'confirmed' | 'unconfirmed';
}
export type AgendaView = 'day' | 'week' | 'month';
export interface UseAgendaOptions {
    events: AgendaEvent[];
    defaultView?: AgendaView;
    view?: AgendaView;
    onViewChange?: (view: AgendaView) => void;
    defaultDate?: CalendarDate;
    date?: CalendarDate;
    onDateChange?: (date: CalendarDate) => void;
    startHour?: number;
    endHour?: number;
    slotDuration?: number;
    weekDays?: number;
    onEventCreate?: (event: {
        start: CalendarDateTime;
        end: CalendarDateTime;
    }) => void;
    onEventDelete?: (id: string) => void;
    onEventMove?: (id: string, start: CalendarDateTime, end: CalendarDateTime) => void;
    onEventResize?: (id: string, start: CalendarDateTime, end: CalendarDateTime) => void;
    onEventSelect?: (id: string | null) => void;
    selectedEventId?: string | null;
    defaultSelectedEventId?: string | null;
}
export interface AllDayLayoutItem {
    event: AgendaEvent;
    colStart: number;
    colSpan: number;
    row: number;
}
export interface MonthRowLayoutItem {
    event: AgendaEvent;
    colStart: number;
    colSpan: number;
    row: number;
}
export interface MonthRowLayout {
    items: MonthRowLayoutItem[];
    rowCount: number;
    rowCountPerCol: number[];
}
export interface DropPreview {
    dateStr: string;
    topPx?: number;
    heightPx?: number;
    color?: string;
}
export interface DragState {
    type: 'idle' | 'creating' | 'moving' | 'resizing';
    eventId?: string;
    startY?: number;
    currentY?: number;
    dayColumnDate?: CalendarDate;
    originalEvent?: AgendaEvent;
}
export interface UseAgendaReturn {
    view: AgendaView;
    date: CalendarDate;
    selectedEventId: string | null;
    events: AgendaEvent[];
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
    allDayEvents: AgendaEvent[];
    allDayLayout: AllDayLayoutItem[];
    allDayCountPerDay: number[];
    isAllDayExpanded: boolean;
    toggleAllDayExpanded: () => void;
    getEventsForDay: (date: CalendarDate) => AgendaEvent[];
    getEventLayout: (eventId: string) => {
        columnIndex: number;
        totalColumns: number;
    };
    getAllEventsForDay: (date: CalendarDate) => AgendaEvent[];
    getMonthRowLayout: (week: CalendarDate[]) => MonthRowLayout;
    getPerCellEvents: (day: CalendarDate, week: CalendarDate[]) => AgendaEvent[];
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
export declare function useAgenda(options: UseAgendaOptions): UseAgendaReturn;
//# sourceMappingURL=use-agenda.d.ts.map