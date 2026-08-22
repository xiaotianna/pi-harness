'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Children, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { useLocale } from 'react-aria-components/I18nProvider';
import { animate, domMax, LazyMotion, useMotionValue, useTransform, } from 'motion/react';
import * as motionM from 'motion/react-m';
import { Button } from '@heroui/react';
import { CalendarDate, CalendarDateTime, DateFormatter, getLocalTimeZone, isSameDay, isSameMonth, today, } from '@internationalized/date';
import { composeSlotClassName } from '../../utils/compose';
import { Segment } from '../segment/index';
// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_HEIGHT_PX = 60;
const MIN_SLOT_DURATION = 5;
const PX_PER_MINUTE = SLOT_HEIGHT_PX / 60;
function snapToGrid(px) {
    const step = MIN_SLOT_DURATION * PX_PER_MINUTE;
    return Math.round(px / step) * step;
}
// ─── Context ─────────────────────────────────────────────────────────────────
const AgendaContext = createContext({});
function isWeekend(date, timeZone) {
    const day = date.toDate(timeZone).getDay();
    return day === 0 || day === 6;
}
// ─── AgendaRoot ───────────────────────────────────────────────────────────────
export const AgendaRoot = ({ children, className, allDayCountPerDay, allDayEvents, allDayLayout, date, dragState, dropPreview, endHour, events, getAllEventsForDay, getEventLayout, getEventsForDay, getMonthRowLayout, getPerCellEvents, goToNext, goToPrevious, goToToday, heading, isAllDayExpanded, locale, onEventCreate, onEventDelete, onEventMove, onEventResize, selectEvent, selectedEventId, setDate, setDragState, setDropPreview, setView, slotDuration, slots, startHour, timeZone, toggleAllDayExpanded, view, visibleDays, visibleWeeks, ...rest }) => {
    const contextValue = useMemo(() => ({
        allDayCountPerDay,
        allDayEvents,
        allDayLayout,
        date,
        dragState,
        dropPreview,
        endHour,
        events,
        getAllEventsForDay,
        getEventLayout,
        getEventsForDay,
        getMonthRowLayout,
        getPerCellEvents,
        goToNext,
        goToPrevious,
        goToToday,
        heading,
        isAllDayExpanded,
        locale,
        onEventCreate,
        onEventDelete,
        onEventMove,
        onEventResize,
        selectEvent,
        selectedEventId,
        setDate,
        setDragState,
        setDropPreview,
        setView,
        slotDuration,
        slots,
        startHour,
        timeZone,
        toggleAllDayExpanded,
        view,
        visibleDays,
        visibleWeeks,
    }), [
        allDayCountPerDay,
        allDayEvents,
        allDayLayout,
        date,
        dragState,
        dropPreview,
        endHour,
        events,
        getAllEventsForDay,
        getEventLayout,
        getEventsForDay,
        getMonthRowLayout,
        getPerCellEvents,
        goToNext,
        goToPrevious,
        goToToday,
        heading,
        isAllDayExpanded,
        locale,
        onEventCreate,
        onEventDelete,
        onEventMove,
        onEventResize,
        selectEvent,
        selectedEventId,
        setDate,
        setDragState,
        setDropPreview,
        setView,
        slotDuration,
        slots,
        startHour,
        timeZone,
        toggleAllDayExpanded,
        view,
        visibleDays,
        visibleWeeks,
    ]);
    const handleKeyDown = useCallback((e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') &&
            selectedEventId &&
            onEventDelete) {
            e.preventDefault();
            onEventDelete(selectedEventId);
        }
    }, [selectedEventId, onEventDelete]);
    return (_jsx(AgendaContext.Provider, { value: contextValue, children: _jsx(LazyMotion, { features: domMax, children: _jsx("div", { className: composeSlotClassName(slots?.base, className), "data-slot": "agenda", "data-view": view, tabIndex: -1, onKeyDown: handleKeyDown, ...rest, children: children }) }) }));
};
// ─── AgendaHeader ─────────────────────────────────────────────────────────────
export const AgendaHeader = ({ children, className, ...props }) => {
    const { slots } = useContext(AgendaContext);
    return (_jsx("header", { className: composeSlotClassName(slots?.header, className), "data-slot": "agenda-header", ...props, children: children }));
};
// ─── AgendaHeading ────────────────────────────────────────────────────────────
export const AgendaHeading = ({ className, ...props }) => {
    const { heading, slots } = useContext(AgendaContext);
    return (_jsx("h1", { className: composeSlotClassName(slots?.heading, className), "data-slot": "agenda-heading", ...props, children: props.children ?? heading }));
};
// ─── AgendaNavigation ─────────────────────────────────────────────────────────
export const AgendaNavigation = ({ children, className, ...props }) => {
    const { slots } = useContext(AgendaContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.navigation, className), "data-slot": "agenda-navigation", ...props, children: children }));
};
// ─── AgendaNavButton ──────────────────────────────────────────────────────────
export const AgendaNavButton = ({ children, className, slot, }) => {
    const { goToNext, goToPrevious } = useContext(AgendaContext);
    const isPrevious = slot === 'previous';
    return (_jsx(Button, { "aria-label": isPrevious ? 'Previous' : 'Next', className: 'agenda__nav-button' + (className ? ` ${className}` : ''), isIconOnly: true, onPress: isPrevious ? goToPrevious : goToNext, size: "sm", variant: "ghost", children: children ?? (_jsx("svg", { fill: "none", height: "16", stroke: "currentColor", strokeWidth: "2", viewBox: "0 0 24 24", width: "16", children: _jsx("path", { d: isPrevious ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6' }) })) }));
};
// ─── AgendaTodayButton ────────────────────────────────────────────────────────
export const AgendaTodayButton = ({ children, className, }) => {
    const { goToToday } = useContext(AgendaContext);
    return (_jsx(Button, { className: 'agenda__today-button' + (className ? ` ${className}` : ''), onPress: goToToday, size: "sm", variant: "outline", children: children ?? 'Today' }));
};
// ─── AgendaViewSelector ───────────────────────────────────────────────────────
const VIEW_OPTIONS = ['day', 'week', 'month'];
export const AgendaViewSelector = ({ children, className, size = 'sm', }) => {
    const { setView, view } = useContext(AgendaContext);
    return (_jsx(Segment, { className: 'agenda__view-selector' + (className ? ` ${className}` : ''), selectedKey: view, size: size, onSelectionChange: (key) => setView(key), children: children ??
            VIEW_OPTIONS.map((v) => (_jsx(Segment.Item, { id: v, children: v.charAt(0).toUpperCase() + v.slice(1) }, v))) }));
};
// ─── AgendaBody ───────────────────────────────────────────────────────────────
export const AgendaBody = ({ children, className, ...props }) => {
    const { slots } = useContext(AgendaContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.body, className), "data-slot": "agenda-body", ...props, children: children }));
};
// ─── AgendaWeekHeader ─────────────────────────────────────────────────────────
export const AgendaWeekHeader = ({ children, className, ...props }) => {
    const { slots, visibleDays } = useContext(AgendaContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.weekHeader, className), "data-slot": "agenda-week-header", ...props, children: children ??
            visibleDays.map((d) => _jsx(AgendaDayHeader, { date: d }, d.toString())) }));
};
// ─── AgendaDayHeader ──────────────────────────────────────────────────────────
export const AgendaDayHeader = ({ className, date: dayDate, ...props }) => {
    const { slots, timeZone } = useContext(AgendaContext);
    const { locale } = useLocale();
    const isToday = isSameDay(dayDate, today(getLocalTimeZone()));
    const weekdayLabel = useMemo(() => new DateFormatter(locale, { weekday: 'short' }).format(dayDate.toDate(timeZone)), [dayDate, locale, timeZone]);
    return (_jsxs("div", { className: composeSlotClassName(slots?.dayHeader, className), "data-slot": "agenda-day-header", "data-today": isToday || undefined, "data-weekend": isWeekend(dayDate, timeZone) || undefined, ...props, children: [_jsx("span", { className: slots?.dayHeaderName(), "data-slot": "agenda-day-header-name", "data-today": isToday || undefined, children: weekdayLabel }), _jsx("span", { className: slots?.dayHeaderDate(), "data-slot": "agenda-day-header-date", "data-today": isToday || undefined, children: dayDate.day })] }));
};
// ─── AgendaAllDaySection ─────────────────────────────────────────────────────
const defaultCollapsedLabel = (count) => count === 1 ? '1 event' : `${count} events`;
export const AgendaAllDaySection = ({ children, className, collapsedLabel = defaultCollapsedLabel, style, ...props }) => {
    const { allDayCountPerDay, isAllDayExpanded, slots, timeZone, toggleAllDayExpanded, visibleDays, } = useContext(AgendaContext);
    const colCount = Math.max(visibleDays.length, 1);
    return (_jsxs("div", { className: composeSlotClassName(slots?.allDaySection, className), "data-expanded": isAllDayExpanded || undefined, "data-slot": "agenda-all-day-section", style: {
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            ...style,
        }, ...props, children: [_jsx("div", { className: "agenda__all-day-dividers", children: visibleDays.map((d) => (_jsx("div", { className: "agenda__all-day-divider", "data-weekend": isWeekend(d, timeZone) || undefined }, d.toString()))) }), _jsx("button", { "aria-label": isAllDayExpanded ? 'Collapse all-day events' : 'Expand all-day events', className: "agenda__all-day-toggle", "data-expanded": isAllDayExpanded || undefined, onClick: toggleAllDayExpanded, type: "button", children: _jsx("svg", { fill: "none", height: "10", viewBox: "0 0 10 10", width: "10", children: _jsx("path", { d: "M3 4l2 2 2-2", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5" }) }) }), isAllDayExpanded
                ? children
                : allDayCountPerDay.map((count, i) => (_jsx("span", { className: "agenda__all-day-summary", style: { gridColumn: i + 1 }, children: count > 0 ? collapsedLabel(count) : null }, visibleDays[i].toString())))] }));
};
// ─── AgendaAllDayLabel ────────────────────────────────────────────────────────
export const AgendaAllDayLabel = ({ children, className, ...props }) => (_jsx("span", { className: 'agenda__all-day-label' + (className ? ` ${className}` : ''), "data-slot": "agenda-all-day-label", ...props, children: children }));
// ─── AgendaAllDayEvent ────────────────────────────────────────────────────────
export const AgendaAllDayEvent = ({ children, className, colSpan, colStart, event, row, style, ...props }) => {
    const { selectEvent, selectedEventId } = useContext(AgendaContext);
    return (_jsx("div", { className: 'agenda__all-day-event' + (className ? ` ${className}` : ''), "data-selected": selectedEventId === event.id || undefined, "data-slot": "agenda-all-day-event", "data-status": event.status ?? 'confirmed', role: "button", style: {
            gridColumn: `${colStart + 1} / span ${colSpan}`,
            gridRow: row + 1,
            '--agenda-event-accent': event.color,
            ...style,
        }, tabIndex: 0, onClick: () => selectEvent(event.id), ...props, children: children ?? event.title }));
};
// ─── AgendaTimeGrid ───────────────────────────────────────────────────────────
export const AgendaTimeGrid = ({ children, className, ...props }) => {
    const { endHour, slots, startHour, timeZone } = useContext(AgendaContext);
    const { locale } = useLocale();
    const containerRef = useRef(null);
    const [currentMinutes, setCurrentMinutes] = useState(() => {
        const now = new Date();
        return 60 * now.getHours() + now.getMinutes();
    });
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentMinutes(60 * now.getHours() + now.getMinutes());
        }, 60_000);
        return () => clearInterval(interval);
    }, []);
    const hourSlots = useMemo(() => {
        const result = [];
        for (let h = startHour; h < endHour; h++)
            result.push(h);
        return result;
    }, [startHour, endHour]);
    const timeLabels = useMemo(() => {
        const formatter = new DateFormatter(locale, { hour: 'numeric' });
        const todayDate = today(timeZone);
        const formatHour = (h) => {
            const d = todayDate.toDate(timeZone);
            d.setHours(h % 24, 0, 0, 0);
            return formatter.format(d);
        };
        return hourSlots.map((h) => ({
            hour: h,
            isFirst: h === startHour,
            label: formatHour(h),
            nearCurrent: Math.abs(60 * h - currentMinutes) < 20,
        }));
    }, [hourSlots, locale, timeZone, startHour, currentMinutes]);
    useEffect(() => {
        if (containerRef.current) {
            const nowHour = new Date().getHours();
            if (nowHour >= startHour && nowHour < endHour) {
                containerRef.current.scrollTop = Math.max(0, 60 * (nowHour - startHour - 1));
            }
        }
    }, [startHour, endHour]);
    return (_jsxs("div", { ref: containerRef, className: composeSlotClassName(slots?.timeGrid, className), "data-slot": "agenda-time-grid", ...props, children: [_jsx("div", { className: slots?.timeLabels(), "data-slot": "agenda-time-labels", children: timeLabels.map(({ hour, isFirst, label, nearCurrent }) => (_jsx("div", { className: slots?.timeLabel(), "data-slot": "agenda-time-label", children: !isFirst && (_jsx("span", { style: { opacity: nearCurrent ? 0 : 1 }, children: label })) }, hour))) }), children] }));
};
// ─── AgendaDayColumn ──────────────────────────────────────────────────────────
export const AgendaDayColumn = ({ children, className, date: dayDate, ...props }) => {
    const { dropPreview, endHour, onEventCreate, selectEvent, slotDuration, slots, startHour, timeZone, } = useContext(AgendaContext);
    const containerRef = useRef(null);
    const [createPreview, setCreatePreview] = useState(null);
    const totalSlots = useMemo(() => Math.floor((60 * (endHour - startHour)) / slotDuration), [startHour, endHour, slotDuration]);
    const slotElements = useMemo(() => Array.from({ length: totalSlots }, (_, i) => (_jsx("div", { className: slots?.timeSlot(), "data-last": i === totalSlots - 1 || undefined, "data-slot": "agenda-time-slot", "data-slot-index": i }, i))), [totalSlots, slots]);
    const getMinutesFromY = useCallback((clientY) => {
        if (!containerRef.current)
            return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / (totalSlots * SLOT_HEIGHT_PX)));
        return (Math.round((ratio * 60 * (endHour - startHour)) / MIN_SLOT_DURATION) *
            MIN_SLOT_DURATION);
    }, [startHour, endHour, totalSlots]);
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0 || !onEventCreate)
            return;
        if (e.target.closest("[data-slot='agenda-event']"))
            return;
        selectEvent(null);
        const startMinutes = getMinutesFromY(e.clientY);
        setCreatePreview({
            heightPx: MIN_SLOT_DURATION * PX_PER_MINUTE,
            topPx: startMinutes * PX_PER_MINUTE,
        });
        const handleMove = (ev) => {
            const curMinutes = getMinutesFromY(ev.clientY);
            const minStart = Math.min(startMinutes, curMinutes);
            const minEnd = Math.max(startMinutes, curMinutes);
            const height = Math.max(minEnd - minStart, MIN_SLOT_DURATION) * PX_PER_MINUTE;
            setCreatePreview({ heightPx: height, topPx: minStart * PX_PER_MINUTE });
        };
        const handleUp = (ev) => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            setCreatePreview(null);
            const endMinutes = getMinutesFromY(ev.clientY);
            const minStart = Math.min(startMinutes, endMinutes);
            const minEnd = startMinutes === endMinutes
                ? startMinutes + 60
                : Math.max(startMinutes, endMinutes);
            const eventStart = new CalendarDateTime(dayDate.year, dayDate.month, dayDate.day, startHour + Math.floor(minStart / 60), minStart % 60);
            const eventEnd = new CalendarDateTime(dayDate.year, dayDate.month, dayDate.day, startHour + Math.floor(minEnd / 60), minEnd % 60);
            onEventCreate({ end: eventEnd, start: eventStart });
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    }, [dayDate, getMinutesFromY, onEventCreate, selectEvent, startHour]);
    return (_jsxs("div", { ref: containerRef, className: composeSlotClassName(slots?.dayColumn, className), "data-date": dayDate.toString(), "data-slot": "agenda-day-column", "data-weekend": isWeekend(dayDate, timeZone) || undefined, onMouseDown: handleMouseDown, ...props, children: [slotElements, children, createPreview && (_jsx(motionM.div, { animate: { opacity: 1, scale: 1 }, className: "agenda__create-preview", initial: { opacity: 0, scale: 0.96 }, style: { height: createPreview.heightPx, top: createPreview.topPx }, transition: { bounce: 0, duration: 0.15, type: 'spring' } })), dropPreview &&
                dropPreview.dateStr === dayDate.toString() &&
                dropPreview.topPx != null && (_jsx("div", { className: "agenda__drop-preview", style: {
                    borderColor: dropPreview.color || undefined,
                    height: dropPreview.heightPx,
                    top: dropPreview.topPx,
                } }))] }));
};
// ─── AgendaEvent ──────────────────────────────────────────────────────────────
export const AgendaEvent = ({ children, className, event, style, }) => {
    const { endHour, getEventLayout, onEventMove, onEventResize, selectEvent, selectedEventId, setDropPreview, slots, startHour, } = useContext(AgendaContext);
    const totalMinutes = 60 * (endHour - startHour);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const didDragRef = useRef(false);
    const elementRef = useRef(null);
    const motionX = useMotionValue(0);
    const motionY = useMotionValue(0);
    const resizeDelta = useMotionValue(0);
    const topPx = useMemo(() => (60 * (event.start.hour - startHour) + event.start.minute) *
        PX_PER_MINUTE, [event.start, startHour]);
    const naturalHeightPx = useMemo(() => Math.max(60 * (event.end.hour - event.start.hour) +
        (event.end.minute - event.start.minute), MIN_SLOT_DURATION) * PX_PER_MINUTE, [event.start, event.end]);
    const resizedHeightPx = useTransform(() => {
        const delta = snapToGrid(resizeDelta.get());
        return Math.max(MIN_SLOT_DURATION * PX_PER_MINUTE, Math.min(totalMinutes * PX_PER_MINUTE - topPx, naturalHeightPx + delta));
    });
    const { columnIndex, totalColumns } = getEventLayout(event.id);
    const isSelected = selectedEventId === event.id;
    const eventStyle = {
        ...style,
        top: `${topPx}px`,
        ...(totalColumns > 1
            ? {
                left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                right: 'auto',
                width: `calc(${(1 / totalColumns) * 100}% - 4px)`,
            }
            : {}),
        ...(event.color
            ? {
                '--agenda-event-accent': event.color,
                '--agenda-event-color': `color-mix(in srgb, ${event.color} 15%, transparent)`,
            }
            : {}),
    };
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (didDragRef.current) {
            didDragRef.current = false;
        }
        else {
            selectEvent(event.id);
        }
    }, [event.id, selectEvent]);
    const handlePointerDown = useCallback((e) => {
        if (e.button !== 0 || !onEventMove || event.isReadOnly)
            return;
        if (e.target.closest('.agenda__resize-handle'))
            return;
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        const handleMove = (ev) => {
            motionX.set(ev.clientX - startX);
            motionY.set(ev.clientY - startY);
            if (!moved &&
                (Math.abs(ev.clientX - startX) > 3 ||
                    Math.abs(ev.clientY - startY) > 3)) {
                moved = true;
                setIsDragging(true);
            }
            if (moved) {
                const { newTopPx, targetDate } = computeDragResult(ev.clientX, ev.clientY);
                setDropPreview({
                    color: event.color,
                    dateStr: targetDate.toString(),
                    heightPx: naturalHeightPx,
                    topPx: newTopPx,
                });
            }
        };
        const computeDragResult = (clientX, clientY) => {
            const dxRaw = clientX - startX;
            const snappedMinutes = snapToGrid(clientY - startY) / PX_PER_MINUTE;
            const daysDelta = (() => {
                const col = elementRef.current?.closest("[data-slot='agenda-day-column']");
                if (!col)
                    return 0;
                const w = col.getBoundingClientRect().width;
                return w > 0 ? Math.round(dxRaw / w) : 0;
            })();
            const newStart = event.start.add({
                days: daysDelta,
                minutes: Math.round(snappedMinutes),
            });
            return {
                daysDelta,
                minutesDelta: Math.round(snappedMinutes),
                newTopPx: (60 * (newStart.hour - startHour) + newStart.minute) *
                    PX_PER_MINUTE,
                targetDate: new CalendarDate(newStart.year, newStart.month, newStart.day),
            };
        };
        const handleUp = (ev) => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);
            setIsDragging(false);
            setDropPreview(null);
            if (!moved)
                return;
            const dxRaw = ev.clientX - startX;
            const snappedMinutes = snapToGrid(ev.clientY - startY) / PX_PER_MINUTE;
            const minutesDelta = Math.round(snappedMinutes);
            let daysDelta = 0;
            const col = elementRef.current?.closest("[data-slot='agenda-day-column']");
            if (col) {
                const w = col.getBoundingClientRect().width;
                if (w > 0)
                    daysDelta = Math.round(dxRaw / w);
            }
            if (Math.abs(minutesDelta) >= MIN_SLOT_DURATION || daysDelta !== 0) {
                didDragRef.current = true;
                motionX.jump(0);
                motionY.jump(0);
                const newStart = event.start.add({
                    days: daysDelta,
                    minutes: minutesDelta,
                });
                const newEnd = event.end.add({
                    days: daysDelta,
                    minutes: minutesDelta,
                });
                onEventMove(event.id, newStart, newEnd);
            }
            else {
                animate(motionX, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
                animate(motionY, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
            }
        };
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    }, [
        event,
        onEventMove,
        motionX,
        motionY,
        naturalHeightPx,
        startHour,
        setDropPreview,
    ]);
    const handleResizePointerDown = useCallback((e) => {
        if (e.button !== 0 || !onEventResize || event.isReadOnly)
            return;
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const minDelta = -(naturalHeightPx - MIN_SLOT_DURATION * PX_PER_MINUTE);
        const maxDelta = totalMinutes * PX_PER_MINUTE - topPx - naturalHeightPx;
        setIsResizing(true);
        const handleMove = (ev) => {
            resizeDelta.set(Math.max(minDelta, Math.min(maxDelta, ev.clientY - startY)));
        };
        const handleUp = (ev) => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);
            const rawDelta = Math.max(minDelta, Math.min(maxDelta, ev.clientY - startY));
            const snapped = snapToGrid(rawDelta);
            const minutesDelta = Math.round(snapped / PX_PER_MINUTE);
            resizeDelta.jump(0);
            setIsResizing(false);
            if (Math.abs(minutesDelta) >= MIN_SLOT_DURATION) {
                didDragRef.current = true;
                const newEnd = event.end.add({ minutes: minutesDelta });
                onEventResize(event.id, event.start, newEnd);
            }
        };
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    }, [event, onEventResize, naturalHeightPx, topPx, totalMinutes, resizeDelta]);
    return (_jsxs(motionM.div, { ref: elementRef, className: composeSlotClassName(slots?.event, className), "data-dragging": isDragging || undefined, "data-event-id": event.id, "data-readonly": event.isReadOnly || undefined, "data-resizing": isResizing || undefined, "data-selected": isSelected || undefined, "data-slot": "agenda-event", "data-status": event.status ?? 'confirmed', onClick: handleClick, onPointerDown: handlePointerDown, style: {
            ...eventStyle,
            height: isResizing ? resizedHeightPx : naturalHeightPx,
            willChange: isDragging || isResizing ? 'transform' : undefined,
            x: motionX,
            y: motionY,
        }, children: [children ?? (_jsxs(_Fragment, { children: [_jsx(AgendaEventTitle, { children: event.title }), _jsx(AgendaEventTime, { event: event })] })), onEventResize && !event.isReadOnly && (_jsx("div", { className: "agenda__resize-handle", onPointerDown: handleResizePointerDown }))] }));
};
// ─── AgendaEventTitle ─────────────────────────────────────────────────────────
export const AgendaEventTitle = ({ children, className, ...props }) => {
    const { slots } = useContext(AgendaContext);
    return (_jsx("span", { className: composeSlotClassName(slots?.eventTitle, className), "data-slot": "agenda-event-title", ...props, children: children }));
};
// ─── AgendaEventTime ──────────────────────────────────────────────────────────
export const AgendaEventTime = ({ className, event, ...props }) => {
    const { locale, slots, timeZone } = useContext(AgendaContext);
    const timeString = useMemo(() => {
        if (!event)
            return '';
        const formatter = new DateFormatter(locale, {
            hour: 'numeric',
            minute: '2-digit',
        });
        const start = event.start.toDate(timeZone);
        const end = event.end.toDate(timeZone);
        return `${formatter.format(start)} – ${formatter.format(end)}`;
    }, [event, locale, timeZone]);
    return (_jsx("span", { className: composeSlotClassName(slots?.eventTime, className), "data-slot": "agenda-event-time", ...props, children: props.children ?? timeString }));
};
// ─── AgendaCurrentTimeIndicator ───────────────────────────────────────────────
export const AgendaCurrentTimeIndicator = ({ className, ...props }) => {
    const { endHour, slots, startHour, visibleDays } = useContext(AgendaContext);
    const { locale } = useLocale();
    const [indicator, setIndicator] = useState(null);
    useEffect(() => {
        const formatter = new DateFormatter(locale, {
            hour: 'numeric',
            minute: '2-digit',
        });
        const update = () => {
            const now = new Date();
            const minutes = 60 * now.getHours() + now.getMinutes();
            const startMinutes = 60 * startHour;
            setIndicator(minutes >= startMinutes && minutes <= 60 * endHour
                ? {
                    slotsFromStart: (minutes - startMinutes) / 60,
                    timeLabel: formatter.format(now),
                }
                : null);
        };
        update();
        const interval = setInterval(update, 60_000);
        return () => clearInterval(interval);
    }, [startHour, endHour, locale]);
    if (!indicator)
        return null;
    const todayDate = today(getLocalTimeZone());
    const todayIdx = visibleDays.findIndex((d) => isSameDay(d, todayDate));
    const showLine = todayIdx >= 0;
    const totalCols = visibleDays.length;
    return (_jsxs("div", { className: composeSlotClassName(slots?.currentTimeIndicator, className), "data-slot": "agenda-current-time-indicator", style: {
            top: `calc(var(--agenda-slot-height) * ${indicator.slotsFromStart})`,
        }, ...props, children: [_jsx("div", { className: "agenda__current-time-label-wrap", children: _jsx("span", { className: "agenda__current-time-label", "data-slot": "agenda-current-time-label", children: indicator.timeLabel }) }), showLine && (_jsxs("div", { className: "agenda__current-time-track", "data-slot": "agenda-current-time-line", children: [_jsx("div", { className: "agenda__current-time-line--faded" }), _jsx("div", { className: "agenda__current-time-line--active", style: {
                            left: (todayIdx / totalCols) * 100 + '%',
                            width: (1 / totalCols) * 100 + '%',
                        } })] }))] }));
};
// ─── AgendaMonthGrid ──────────────────────────────────────────────────────────
export const AgendaMonthGrid = ({ children, className, ...props }) => {
    const { slots, visibleWeeks } = useContext(AgendaContext);
    const { locale } = useLocale();
    const weekdayHeaders = useMemo(() => {
        const formatter = new DateFormatter(locale, { weekday: 'short' });
        const tz = getLocalTimeZone();
        if (visibleWeeks.length > 0 && visibleWeeks[0].length > 0) {
            return visibleWeeks[0].map((d) => formatter.format(d.toDate(tz)));
        }
        return [];
    }, [visibleWeeks, locale]);
    const todayDate = today(getLocalTimeZone());
    return (_jsxs("div", { className: composeSlotClassName(slots?.monthGrid, className), "data-slot": "agenda-month-grid", ...props, children: [weekdayHeaders.length > 0 && (_jsx("div", { className: "agenda__month-weekday-header", "data-slot": "agenda-month-weekday-header", children: weekdayHeaders.map((label, i) => (_jsx("div", { className: "agenda__month-weekday", "data-slot": "agenda-month-weekday", "data-today": (visibleWeeks[0]?.[i] &&
                        isSameDay(visibleWeeks[0][i], todayDate)) ||
                        undefined, children: label }, i))) })), children] }));
};
// ─── AgendaMonthRow ───────────────────────────────────────────────────────────
export const AgendaMonthRow = ({ children, className, spanningRowCount: _spanningRowCount = 0, style, ...props }) => {
    const { slots } = useContext(AgendaContext);
    return (_jsx("div", { className: composeSlotClassName(slots?.monthRow, className), "data-slot": "agenda-month-row", style: style, ...props, children: children }));
};
// ─── AgendaMonthSpanningEvent ─────────────────────────────────────────────────
export const AgendaMonthSpanningEvent = ({ children, className, colSpan, colStart, event, row, style, ...props }) => {
    const { selectEvent, selectedEventId } = useContext(AgendaContext);
    const isSelected = selectedEventId === event.id;
    const eventStyle = {
        ...style,
        height: 'var(--agenda-month-event-height)',
        left: `calc(${(colStart / 7) * 100}% + 2px)`,
        position: 'absolute',
        top: `calc(var(--agenda-month-date-offset) + ${row} * (var(--agenda-month-event-height) + var(--agenda-month-event-gap)) + 2px)`,
        width: `calc(${(colSpan / 7) * 100}% - 4px)`,
        ...(event.color ? { '--agenda-event-accent': event.color } : {}),
    };
    return (_jsx("div", { className: 'agenda__month-spanning-event' + (className ? ` ${className}` : ''), "data-selected": isSelected || undefined, "data-slot": "agenda-month-spanning-event", "data-status": event.status ?? 'confirmed', role: "button", style: eventStyle, tabIndex: 0, onClick: (e) => {
            e.stopPropagation();
            selectEvent(event.id);
        }, ...props, children: children ?? event.title }));
};
// ─── AgendaMonthCell ──────────────────────────────────────────────────────────
const defaultMoreLabel = (count) => `${count} more`;
export const AgendaMonthCell = ({ children, className, date: cellDate, maxEvents = 2, moreLabel = defaultMoreLabel, spanningRowCount = 0, style: styleProp, ...props }) => {
    const { date, dropPreview, locale, setDate, setView, slots, timeZone } = useContext(AgendaContext);
    const isToday = isSameDay(cellDate, today(getLocalTimeZone()));
    const isOutsideMonth = !isSameMonth(cellDate, date);
    const isFirstOfMonth = cellDate.day === 1;
    const dayLabel = useMemo(() => {
        if (isFirstOfMonth) {
            return `${new DateFormatter(locale, { month: 'short' }).format(cellDate.toDate(timeZone))} ${cellDate.day}`;
        }
        return `${cellDate.day}`;
    }, [cellDate, locale, timeZone, isFirstOfMonth]);
    const navigateToDay = useCallback(() => {
        setDate(cellDate);
        setView('day');
    }, [cellDate, setDate, setView]);
    const handleDoubleClick = useCallback(() => navigateToDay(), [navigateToDay]);
    const handleMoreClick = useCallback((e) => {
        e.stopPropagation();
        navigateToDay();
    }, [navigateToDay]);
    const childrenArray = Children.toArray(children);
    const visible = childrenArray.length > maxEvents
        ? childrenArray.slice(0, maxEvents)
        : childrenArray;
    const overflow = childrenArray.length - maxEvents;
    const hasMore = childrenArray.length > maxEvents;
    const spanningZone = spanningRowCount > 0
        ? `calc(${spanningRowCount} * var(--agenda-month-event-height) + ${spanningRowCount - 1} * var(--agenda-month-event-gap) + 6px)`
        : '0px';
    return (_jsxs("div", { className: composeSlotClassName(slots?.monthCell, className), "data-date": cellDate.toString(), "data-drop-target": dropPreview?.dateStr === cellDate.toString() || undefined, "data-outside-month": isOutsideMonth || undefined, "data-slot": "agenda-month-cell", "data-today": isToday || undefined, "data-weekend": isWeekend(cellDate, timeZone) || undefined, onDoubleClick: handleDoubleClick, style: {
            '--agenda-month-spanning-zone': spanningZone,
            '--agenda-drop-color': dropPreview?.dateStr === cellDate.toString()
                ? dropPreview?.color
                : undefined,
            ...styleProp,
        }, ...props, children: [_jsx("button", { className: slots?.monthCellDate(), "data-slot": "agenda-month-cell-date", "data-today": isToday || undefined, onClick: (e) => {
                    e.stopPropagation();
                    setDate(cellDate);
                    setView('day');
                }, type: "button", children: dayLabel }), visible, hasMore && (_jsx("button", { className: "agenda__month-cell-more", onClick: handleMoreClick, type: "button", children: moreLabel(overflow) }))] }));
};
// ─── AgendaMonthEvent ─────────────────────────────────────────────────────────
export const AgendaMonthEvent = ({ children, className, event, }) => {
    const { onEventMove, selectEvent, selectedEventId, setDropPreview, slots } = useContext(AgendaContext);
    const isSelected = selectedEventId === event.id;
    const [isDragging, setIsDragging] = useState(false);
    const didDragRef = useRef(false);
    const elementRef = useRef(null);
    const motionX = useMotionValue(0);
    const motionY = useMotionValue(0);
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (didDragRef.current) {
            didDragRef.current = false;
        }
        else {
            selectEvent(event.id);
        }
    }, [event.id, selectEvent]);
    const getDateFromPoint = (clientX, clientY) => {
        const el = elementRef.current;
        if (el)
            el.style.pointerEvents = 'none';
        const target = document.elementFromPoint(clientX, clientY);
        if (el)
            el.style.pointerEvents = '';
        const cell = target?.closest("[data-slot='agenda-month-cell']");
        return cell?.getAttribute('data-date') ?? null;
    };
    const handlePointerDown = useCallback((e) => {
        if (e.button !== 0 || !onEventMove || event.isReadOnly)
            return;
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        let moved = false;
        const handleMove = (ev) => {
            motionX.set(ev.clientX - startX);
            motionY.set(ev.clientY - startY);
            if (!moved &&
                (Math.abs(ev.clientX - startX) > 3 ||
                    Math.abs(ev.clientY - startY) > 3)) {
                moved = true;
                setIsDragging(true);
            }
            if (moved) {
                const dateStr = getDateFromPoint(ev.clientX, ev.clientY);
                if (dateStr)
                    setDropPreview({ color: event.color, dateStr });
            }
        };
        const handleUp = (ev) => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleUp);
            setIsDragging(false);
            setDropPreview(null);
            if (!moved)
                return;
            const dateStr = getDateFromPoint(ev.clientX, ev.clientY);
            if (dateStr) {
                const parts = dateStr.split('-').map(Number);
                if (parts.length === 3) {
                    const [year, month, day] = parts;
                    const targetDate = new CalendarDate(year, month, day);
                    const daysDelta = targetDate.compare(new CalendarDate(event.start.year, event.start.month, event.start.day));
                    if (daysDelta !== 0) {
                        didDragRef.current = true;
                        motionX.jump(0);
                        motionY.jump(0);
                        onEventMove(event.id, event.start.add({ days: daysDelta }), event.end.add({ days: daysDelta }));
                        return;
                    }
                }
            }
            animate(motionX, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
            animate(motionY, 0, { bounce: 0.2, duration: 0.3, type: 'spring' });
        };
        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
    }, [event, onEventMove, motionX, motionY, setDropPreview]);
    const colorStyle = event.color
        ? {
            '--agenda-event-color': `color-mix(in srgb, ${event.color} 15%, transparent)`,
            '--agenda-event-text': event.color,
        }
        : {};
    return (_jsx(motionM.div, { ref: elementRef, className: composeSlotClassName(slots?.monthEvent, className), "data-dragging": isDragging || undefined, "data-readonly": event.isReadOnly || undefined, "data-selected": isSelected || undefined, "data-slot": "agenda-month-event", "data-status": event.status ?? 'confirmed', onClick: handleClick, onPointerDown: handlePointerDown, style: { ...colorStyle, x: motionX, y: motionY }, children: children ?? event.title }));
};
//# sourceMappingURL=agenda.js.map