'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, use, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, } from 'react';
import { createPortal } from 'react-dom';
import * as MapLibreGL from 'maplibre-gl';
import { Button, ButtonGroup, CloseButton, Spinner } from '@heroui/react';
import { composeSlotClassName, composeTwRenderProps, } from '../../utils/compose';
import { Minus, Plus } from '../icons';
import { mapVariants } from './map.styles';
import 'maplibre-gl/dist/maplibre-gl.css';
// ── Constants & helpers ──────────────────────────────────────────────────────
const DEFAULT_ROUTE_COLOR = '#4285F4';
const EMPTY_MAP_STYLE = {
    layers: [],
    sources: {},
    version: 8,
};
const DEFAULT_ARC_PAINT = {
    'line-color': '#4285F4',
    'line-opacity': 0.85,
    'line-width': 2,
};
const DEFAULT_ARC_LAYOUT = {
    'line-cap': 'round',
    'line-join': 'round',
};
function getDocumentTheme() {
    if (typeof document === 'undefined')
        return null;
    if (document.documentElement.classList.contains('dark'))
        return 'dark';
    if (document.documentElement.classList.contains('light'))
        return 'light';
    return null;
}
function useLatestRef(value) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}
function useLayerId(prefix, id) {
    const uniqueId = useId().replace(/[^\w-]/g, '');
    return id ?? `${prefix}-${uniqueId}`;
}
function getViewport(map) {
    const center = map.getCenter();
    return {
        bearing: map.getBearing(),
        center: [center.lng, center.lat],
        pitch: map.getPitch(),
        zoom: map.getZoom(),
    };
}
function lngLatEqual(a, b) {
    if (a === b)
        return true;
    if (!a || !b)
        return false;
    const first = MapLibreGL.LngLat.convert(a);
    const second = MapLibreGL.LngLat.convert(b);
    return first.lng === second.lng && first.lat === second.lat;
}
function getCssVariable(element, name) {
    if (typeof window === 'undefined')
        return '';
    return window.getComputedStyle(element).getPropertyValue(name).trim();
}
function parseCssVariableFloat(element, name, fallback) {
    const value = Number.parseFloat(getCssVariable(element, name));
    return Number.isFinite(value) ? value : fallback;
}
function resolveCssColor(value, fallback) {
    if (!value || typeof document === 'undefined')
        return fallback;
    const context = document.createElement('canvas').getContext('2d');
    if (!context)
        return value;
    context.fillStyle = fallback;
    const fallbackResolved = context.fillStyle;
    context.fillStyle = value;
    return context.fillStyle === fallbackResolved && value !== fallbackResolved
        ? fallback
        : context.fillStyle;
}
function stylesEqual(a, b) {
    if (a === b)
        return true;
    if (!a || !b)
        return false;
    if (typeof a === 'string' || typeof b === 'string')
        return false;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
        return false;
    }
}
function getViewportDiff(current, next) {
    const diff = {};
    let changed = false;
    if (!lngLatEqual(current.center, next.center) && next.center !== undefined) {
        diff.center = next.center;
        changed = true;
    }
    if (!Object.is(current.zoom, next.zoom) && next.zoom !== undefined) {
        diff.zoom = next.zoom;
        changed = true;
    }
    if (!Object.is(current.bearing, next.bearing) && next.bearing !== undefined) {
        diff.bearing = next.bearing;
        changed = true;
    }
    if (!Object.is(current.pitch, next.pitch) && next.pitch !== undefined) {
        diff.pitch = next.pitch;
        changed = true;
    }
    return changed ? diff : null;
}
function viewportAlreadyApplied(map, diff) {
    const current = getViewport(map);
    return !((diff.center && !lngLatEqual(diff.center, current.center)) ||
        (diff.zoom !== undefined && !Object.is(diff.zoom, current.zoom)) ||
        (diff.bearing !== undefined && !Object.is(diff.bearing, current.bearing)) ||
        (diff.pitch !== undefined && !Object.is(diff.pitch, current.pitch)));
}
function toPartialViewport(bearing, center, pitch, zoom) {
    const partial = {};
    if (bearing !== undefined)
        partial.bearing = bearing;
    if (pitch !== undefined)
        partial.pitch = pitch;
    if (zoom !== undefined)
        partial.zoom = zoom;
    if (center !== undefined) {
        const lngLat = MapLibreGL.LngLat.convert(center);
        partial.center = [lngLat.lng, lngLat.lat];
    }
    return partial;
}
function buildMarkerDotStyle(style, color, ringColor) {
    if (!color && !ringColor)
        return style ?? {};
    return {
        ...style,
        ...(color ? { '--map-marker-color': color } : {}),
        ...(ringColor ? { '--map-marker-ring-color': ringColor } : {}),
    };
}
function mergeHoverPaint(paint, hoverPaint) {
    if (!hoverPaint)
        return paint;
    const merged = { ...paint };
    for (const [key, value] of Object.entries(hoverPaint)) {
        if (value === undefined)
            continue;
        const paintKey = key;
        const existing = merged[paintKey];
        merged[key] =
            existing === undefined
                ? value
                : [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    value,
                    existing,
                ];
    }
    return merged;
}
function buildArcCoordinates(from, to, curvature, samples) {
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    const deltaLng = toLng - fromLng;
    const deltaLat = toLat - fromLat;
    const distance = Math.hypot(deltaLng, deltaLat);
    if (distance === 0 || curvature === 0)
        return [from, to];
    const offset = distance * curvature;
    const controlLng = (fromLng + toLng) / 2 + (-deltaLat / distance) * offset;
    const controlLat = (fromLat + toLat) / 2 + (deltaLng / distance) * offset;
    const coordinates = [];
    const steps = Math.max(2, Math.floor(samples));
    for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const inverse = 1 - t;
        coordinates.push([
            inverse * inverse * fromLng +
                2 * inverse * t * controlLng +
                t * t * toLng,
            inverse * inverse * fromLat +
                2 * inverse * t * controlLat +
                t * t * toLat,
        ]);
    }
    return coordinates;
}
function useMapTheme(themeProp) {
    const [theme, setTheme] = useState(() => {
        return (getDocumentTheme() ??
            (typeof window === 'undefined'
                ? 'light'
                : window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'));
    });
    useEffect(() => {
        if (themeProp)
            return;
        if (typeof document === 'undefined' || typeof window === 'undefined')
            return;
        const observer = new MutationObserver(() => {
            const documentTheme = getDocumentTheme();
            if (documentTheme)
                setTheme(documentTheme);
        });
        observer.observe(document.documentElement, {
            attributeFilter: ['class'],
            attributes: true,
        });
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = (event) => {
            if (!getDocumentTheme()) {
                setTheme(event.matches ? 'dark' : 'light');
            }
        };
        mediaQuery.addEventListener('change', handleMediaChange);
        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [themeProp]);
    return themeProp ?? theme;
}
// ── Icons ────────────────────────────────────────────────────────────────────
function LocateIcon(props) {
    return (_jsx("svg", { "aria-hidden": "true", fill: "none", viewBox: "0 0 16 16", ...props, children: _jsx("path", { clipRule: "evenodd", d: "M8.75 1.75a.75.75 0 0 0-1.5 0v.79A5.51 5.51 0 0 0 2.54 7.25h-.79a.75.75 0 0 0 0 1.5h.79a5.51 5.51 0 0 0 4.71 4.71v.79a.75.75 0 0 0 1.5 0v-.79a5.51 5.51 0 0 0 4.71-4.71h.79a.75.75 0 0 0 0-1.5h-.79a5.51 5.51 0 0 0-4.71-4.71zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 2.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5", fill: "currentColor", fillRule: "evenodd" }) }));
}
function FullscreenIcon(props) {
    return (_jsx("svg", { "aria-hidden": "true", fill: "none", viewBox: "0 0 16 16", ...props, children: _jsx("path", { clipRule: "evenodd", d: "M2.5 1.75a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0V4.31l2.22 2.22a.75.75 0 0 0 1.06-1.06L4.31 3.25H5.5a.75.75 0 0 0 0-1.5zm7.25.75a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0V4.31l-2.22 2.22a.75.75 0 1 1-1.06-1.06l2.22-2.22H10.5a.75.75 0 0 1-.75-.75m-3.22 8.03a.75.75 0 0 0-1.06-1.06l-2.22 2.22V10.5a.75.75 0 0 0-1.5 0v3c0 .414.336.75.75.75h3a.75.75 0 0 0 0-1.5H4.31zm2.94-1.06a.75.75 0 0 1 1.06 0l2.22 2.22V10.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.19z", fill: "currentColor", fillRule: "evenodd" }) }));
}
function CompassIcon(props) {
    return (_jsxs("svg", { "aria-hidden": "true", fill: "none", viewBox: "0 0 24 24", ...props, children: [_jsx("path", { d: "M12 2L16 12H12V2Z", "data-needle": "north-right" }), _jsx("path", { d: "M12 2L8 12H12V2Z", "data-needle": "north-left" }), _jsx("path", { d: "M12 22L16 12H12V22Z", "data-needle": "south-right" }), _jsx("path", { d: "M12 22L8 12H12V22Z", "data-needle": "south-left" })] }));
}
// ── Context ──────────────────────────────────────────────────────────────────
const MapContext = createContext(null);
const MarkerContext = createContext(null);
function useMapContext() {
    const context = use(MapContext);
    if (!context) {
        throw new Error('Map components must be used within <Map>.');
    }
    return context;
}
function useMarkerContext() {
    const context = use(MarkerContext);
    if (!context) {
        throw new Error('Marker components must be used within <Map.Marker>.');
    }
    return context;
}
export function useMap() {
    const { isLoaded, map } = useMapContext();
    return { isLoaded, map };
}
// ── Root ─────────────────────────────────────────────────────────────────────
function MapLoader({ slots }) {
    return (_jsx("div", { className: slots.loader(), "data-slot": "map-loader", children: _jsx(Spinner, { className: slots.loaderSpinner(), color: "current", "data-slot": "map-loader-spinner", size: "sm" }) }));
}
export const MapRoot = ({ 'aria-describedby': ariaDescribedBy, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, children, className, id, isLoading = false, mapStyle, onViewportChange, projection, ref, role, style, styles, tabIndex, theme: themeProp, viewport, ...mapOptions }) => {
    const containerRef = useRef(null);
    const [map, setMap] = useState(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isStyleReady, setIsStyleReady] = useState(false);
    const appliedStyleRef = useRef(undefined);
    const isUpdatingViewportRef = useRef(false);
    const styleReadyTimeoutRef = useRef(null);
    const mapOptionsRef = useRef(mapOptions);
    const viewportRef = useRef(viewport);
    const onViewportChangeRef = useLatestRef(onViewportChange);
    const projectionRef = useLatestRef(projection);
    const theme = useMapTheme(themeProp);
    const slots = useMemo(() => mapVariants(), []);
    const bearing = viewport?.bearing ?? mapOptions.bearing;
    const center = viewport?.center ?? mapOptions.center;
    const pitch = viewport?.pitch ?? mapOptions.pitch;
    const zoom = viewport?.zoom ?? mapOptions.zoom;
    const viewportStateRef = useRef(toPartialViewport(bearing, center, pitch, zoom));
    const resolvedStyle = useMemo(() => mapStyle ??
        (theme === 'dark'
            ? (styles?.dark ?? styles?.light ?? EMPTY_MAP_STYLE)
            : (styles?.light ?? styles?.dark ?? EMPTY_MAP_STYLE)), [mapStyle, styles, theme]);
    const resolvedStyleRef = useRef(resolvedStyle);
    useImperativeHandle(ref, () => map, [map]);
    const clearStyleReadyTimeout = useCallback(() => {
        if (styleReadyTimeoutRef.current) {
            clearTimeout(styleReadyTimeoutRef.current);
            styleReadyTimeoutRef.current = null;
        }
    }, []);
    useEffect(() => {
        if (!containerRef.current)
            return;
        const instance = new MapLibreGL.Map({
            attributionControl: { compact: true },
            container: containerRef.current,
            renderWorldCopies: false,
            style: resolvedStyleRef.current,
            ...mapOptionsRef.current,
            ...viewportRef.current,
        });
        appliedStyleRef.current = resolvedStyleRef.current;
        const markStyleReady = () => {
            clearStyleReadyTimeout();
            styleReadyTimeoutRef.current = setTimeout(() => {
                if (instance.isStyleLoaded()) {
                    setIsStyleReady(true);
                    if (projectionRef.current) {
                        instance.setProjection(projectionRef.current);
                    }
                }
            }, 0);
        };
        const handleLoad = () => {
            setIsMapLoaded(true);
            markStyleReady();
        };
        const handleMove = () => {
            if (isUpdatingViewportRef.current)
                return;
            onViewportChangeRef.current?.(getViewport(instance));
        };
        instance.on('load', handleLoad);
        instance.on('style.load', markStyleReady);
        instance.on('styledata', markStyleReady);
        instance.on('idle', markStyleReady);
        instance.on('move', handleMove);
        setMap(instance);
        return () => {
            clearStyleReadyTimeout();
            instance.off('load', handleLoad);
            instance.off('style.load', markStyleReady);
            instance.off('styledata', markStyleReady);
            instance.off('idle', markStyleReady);
            instance.off('move', handleMove);
            instance.remove();
            setIsMapLoaded(false);
            setIsStyleReady(false);
            setMap(null);
        };
    }, [clearStyleReadyTimeout, onViewportChangeRef, projectionRef]);
    useEffect(() => {
        if (!map)
            return;
        if (stylesEqual(appliedStyleRef.current, resolvedStyle))
            return;
        clearStyleReadyTimeout();
        appliedStyleRef.current = resolvedStyle;
        setIsStyleReady(false);
        map.setStyle(resolvedStyle, { diff: false });
    }, [clearStyleReadyTimeout, map, resolvedStyle]);
    useEffect(() => {
        if (!map || !projection || !isStyleReady)
            return;
        map.setProjection(projection);
    }, [isStyleReady, map, projection]);
    useEffect(() => {
        const nextViewport = toPartialViewport(bearing, center, pitch, zoom);
        const diff = getViewportDiff(viewportStateRef.current, nextViewport);
        viewportStateRef.current = nextViewport;
        if (!map || !diff || viewportAlreadyApplied(map, diff))
            return;
        isUpdatingViewportRef.current = true;
        try {
            map.jumpTo(diff);
        }
        finally {
            isUpdatingViewportRef.current = false;
        }
    }, [bearing, center, map, pitch, zoom]);
    const contextValue = useMemo(() => ({
        isLoaded: isMapLoaded && isStyleReady,
        map,
        slots,
    }), [isMapLoaded, isStyleReady, map, slots]);
    const showLoading = !isMapLoaded || isLoading;
    return (_jsx(MapContext, { value: contextValue, children: _jsxs("div", { ref: containerRef, "aria-describedby": ariaDescribedBy, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, className: composeSlotClassName(slots.base, className), "data-loaded": isMapLoaded && isStyleReady ? 'true' : undefined, "data-loading": showLoading ? 'true' : undefined, "data-slot": "map", id: id, role: role, style: style, tabIndex: tabIndex, children: [showLoading ? _jsx(MapLoader, { slots: slots }) : null, map ? children : null] }) }));
};
// ── Markers ──────────────────────────────────────────────────────────────────
export const MapMarker = ({ children, draggable = false, latitude, longitude, onClick, onDrag, onDragEnd, onDragStart, onMouseEnter, onMouseLeave, ...markerOptions }) => {
    const { map, slots } = useMapContext();
    const handlersRef = useLatestRef({
        onClick,
        onDrag,
        onDragEnd,
        onDragStart,
        onMouseEnter,
        onMouseLeave,
    });
    const markerOptionsRef = useRef(markerOptions);
    const positionRef = useRef({ latitude, longitude });
    const draggableRef = useRef(draggable);
    const [marker, setMarker] = useState(null);
    useEffect(() => {
        const element = document.createElement('div');
        const position = positionRef.current;
        element.className = slots.marker();
        element.dataset.slot = 'map-marker';
        const instance = new MapLibreGL.Marker({
            ...markerOptionsRef.current,
            draggable: draggableRef.current,
            element,
        }).setLngLat([position.longitude, position.latitude]);
        setMarker(instance);
        return () => {
            instance.remove();
        };
    }, [slots]);
    useEffect(() => {
        if (!marker)
            return;
        const element = marker.getElement();
        const handleClick = (event) => handlersRef.current.onClick?.(event);
        const handleMouseEnter = (event) => handlersRef.current.onMouseEnter?.(event);
        const handleMouseLeave = (event) => handlersRef.current.onMouseLeave?.(event);
        const getLngLat = () => {
            const lngLat = marker.getLngLat();
            return { lat: lngLat.lat, lng: lngLat.lng };
        };
        const handleDragStart = () => handlersRef.current.onDragStart?.(getLngLat());
        const handleDrag = () => handlersRef.current.onDrag?.(getLngLat());
        const handleDragEnd = () => handlersRef.current.onDragEnd?.(getLngLat());
        element.addEventListener('click', handleClick);
        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
        marker.on('dragstart', handleDragStart);
        marker.on('drag', handleDrag);
        marker.on('dragend', handleDragEnd);
        return () => {
            element.removeEventListener('click', handleClick);
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
            marker.off('dragstart', handleDragStart);
            marker.off('drag', handleDrag);
            marker.off('dragend', handleDragEnd);
        };
    }, [handlersRef, marker]);
    useEffect(() => {
        if (!map || !marker)
            return;
        marker.addTo(map);
        return () => {
            marker.remove();
        };
    }, [map, marker]);
    useEffect(() => {
        marker?.setLngLat([longitude, latitude]);
    }, [latitude, longitude, marker]);
    useEffect(() => {
        marker?.setDraggable(draggable);
    }, [draggable, marker]);
    useEffect(() => {
        if (!marker)
            return;
        const currentOffset = marker.getOffset();
        const offset = markerOptions.offset;
        const [nextX, nextY] = offset
            ? Array.isArray(offset)
                ? [offset[0], offset[1]]
                : [offset.x, offset.y]
            : [0, 0];
        if (currentOffset.x !== nextX || currentOffset.y !== nextY) {
            marker.setOffset(markerOptions.offset ?? [0, 0]);
        }
    }, [marker, markerOptions.offset]);
    useEffect(() => {
        marker?.setRotation(markerOptions.rotation ?? 0);
    }, [marker, markerOptions.rotation]);
    useEffect(() => {
        marker?.setRotationAlignment(markerOptions.rotationAlignment ?? 'auto');
    }, [marker, markerOptions.rotationAlignment]);
    useEffect(() => {
        marker?.setPitchAlignment(markerOptions.pitchAlignment ?? 'auto');
    }, [marker, markerOptions.pitchAlignment]);
    const markerContextValue = useMemo(() => (marker ? { map, marker, slots } : null), [map, marker, slots]);
    if (!markerContextValue)
        return null;
    return _jsx(MarkerContext, { value: markerContextValue, children: children });
};
export const MarkerContent = ({ children, className }) => {
    const { marker, slots } = useMarkerContext();
    return createPortal(_jsx("div", { className: composeSlotClassName(slots.markerContent, className), "data-slot": "map-marker-content", children: children ?? _jsx(MarkerDot, {}) }), marker.getElement());
};
export const MarkerDot = ({ className, color, ringColor, style, ...props }) => {
    const { slots } = useMarkerContext();
    return (_jsx("span", { className: composeSlotClassName(slots.defaultMarker, className), "data-slot": "map-default-marker", style: buildMarkerDotStyle(style, color, ringColor), ...props }));
};
export const MarkerLabel = ({ children, className, position = 'top', ...props }) => {
    const { slots } = useMarkerContext();
    return (_jsx("div", { className: composeSlotClassName(slots.markerLabel, className, {
            markerLabelPosition: position,
        }), "data-position": position, "data-slot": "map-marker-label", ...props, children: children }));
};
function PopupCloseButton({ onClick, slots, }) {
    return (_jsx(CloseButton, { "aria-label": "Close popup", className: slots.popupCloseButton(), "data-slot": "map-popup-close-button", onPress: onClick }));
}
export const MarkerPopup = ({ children, className, closeButton = false, ...popupOptions }) => {
    const { map, marker, slots } = useMarkerContext();
    const popupOptionsRef = useRef(popupOptions);
    const [popupState, setPopupState] = useState(null);
    useEffect(() => {
        const container = document.createElement('div');
        const popup = new MapLibreGL.Popup({
            offset: 16,
            ...popupOptionsRef.current,
            closeButton: false,
        })
            .setMaxWidth('none')
            .setDOMContent(container);
        setPopupState({ container, popup });
        return () => {
            popup.remove();
        };
    }, []);
    useEffect(() => {
        if (!popupState?.container || !map || !popupState.popup)
            return;
        popupState.popup.setDOMContent(popupState.container);
        marker.setPopup(popupState.popup);
        return () => {
            marker.setPopup(null);
        };
    }, [map, marker, popupState]);
    useEffect(() => {
        if (!popupState?.popup)
            return;
        popupState.popup.setOffset(popupOptions.offset ?? 16);
        popupState.popup.setMaxWidth(popupOptions.maxWidth ?? 'none');
    }, [popupOptions.maxWidth, popupOptions.offset, popupState]);
    if (!popupState)
        return null;
    return createPortal(_jsxs("div", { className: composeSlotClassName(slots.popupContent, className), "data-close-button": closeButton || undefined, "data-slot": "map-marker-popup", children: [closeButton ? (_jsx(PopupCloseButton, { onClick: () => popupState.popup.remove(), slots: slots })) : null, children] }), popupState.container);
};
export const MarkerTooltip = ({ children, className, ...popupOptions }) => {
    const { map, marker, slots } = useMarkerContext();
    const popupOptionsRef = useRef(popupOptions);
    const [popupState, setPopupState] = useState(null);
    useEffect(() => {
        const container = document.createElement('div');
        const popup = new MapLibreGL.Popup({
            offset: 16,
            ...popupOptionsRef.current,
            closeButton: false,
            closeOnClick: true,
        })
            .setMaxWidth('none')
            .setDOMContent(container);
        setPopupState({ container, popup });
        return () => {
            popup.remove();
        };
    }, []);
    useEffect(() => {
        if (!map || !popupState?.popup)
            return;
        const element = marker.getElement();
        const showTooltip = () => {
            popupState.popup.setLngLat(marker.getLngLat()).addTo(map);
        };
        const hideTooltip = () => {
            popupState.popup.remove();
        };
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
        return () => {
            element.removeEventListener('mouseenter', showTooltip);
            element.removeEventListener('mouseleave', hideTooltip);
            popupState.popup.remove();
        };
    }, [map, marker, popupState]);
    useEffect(() => {
        if (!popupState?.popup)
            return;
        popupState.popup.setOffset(popupOptions.offset ?? 16);
        popupState.popup.setMaxWidth(popupOptions.maxWidth ?? 'none');
    }, [popupOptions.maxWidth, popupOptions.offset, popupState]);
    if (!popupState)
        return null;
    return createPortal(_jsx("div", { className: composeSlotClassName(slots.tooltip, className), "data-slot": "map-marker-tooltip", children: children }), popupState.container);
};
export const MapPopup = ({ children, className, closeButton = false, latitude, longitude, onClose, ...popupOptions }) => {
    const { map, slots } = useMapContext();
    const onCloseRef = useLatestRef(onClose);
    const popupOptionsRef = useRef(popupOptions);
    const positionRef = useRef({ latitude, longitude });
    const [popupState, setPopupState] = useState(null);
    useEffect(() => {
        const container = document.createElement('div');
        const position = positionRef.current;
        const popup = new MapLibreGL.Popup({
            offset: 16,
            ...popupOptionsRef.current,
            closeButton: false,
        })
            .setMaxWidth('none')
            .setLngLat([position.longitude, position.latitude])
            .setDOMContent(container);
        setPopupState({ container, popup });
        return () => {
            popup.remove();
        };
    }, []);
    useEffect(() => {
        if (!map || !popupState?.popup)
            return;
        const handleClose = () => onCloseRef.current?.();
        popupState.popup.on('close', handleClose);
        popupState.popup.addTo(map);
        return () => {
            popupState.popup.off('close', handleClose);
            popupState.popup.remove();
        };
    }, [map, onCloseRef, popupState]);
    useEffect(() => {
        if (!popupState?.popup || !map)
            return;
        popupState.popup.setLngLat([longitude, latitude]);
        if (!popupState.popup.isOpen()) {
            popupState.popup.addTo(map);
        }
    }, [latitude, longitude, map, popupState]);
    useEffect(() => {
        if (!popupState?.popup)
            return;
        popupState.popup.setOffset(popupOptions.offset ?? 16);
        popupState.popup.setMaxWidth(popupOptions.maxWidth ?? 'none');
    }, [popupOptions.maxWidth, popupOptions.offset, popupState]);
    if (!popupState)
        return null;
    return createPortal(_jsxs("div", { className: composeSlotClassName(slots.popupContent, className), "data-close-button": closeButton || undefined, "data-slot": "map-popup", children: [closeButton ? (_jsx(PopupCloseButton, { onClick: () => popupState.popup.remove(), slots: slots })) : null, children] }), popupState.container);
};
// ── Controls ─────────────────────────────────────────────────────────────────
export const MapControls = ({ children, className, position = 'bottom-right', ...props }) => {
    const { slots } = useMapContext();
    return (_jsx("div", { className: composeSlotClassName(slots.controls, className, {
            controlsPosition: position,
        }), "data-position": position, "data-slot": "map-controls", ...props, children: children ?? _jsx(MapZoomControl, {}) }));
};
export const MapControlGroup = ({ children, className, orientation = 'vertical', size = 'sm', variant = 'tertiary', ...props }) => {
    const { slots } = useMapContext();
    return (_jsx(ButtonGroup, { className: composeTwRenderProps(className, slots.controlGroup()), "data-slot": "map-control-group", orientation: orientation, size: size, variant: variant, ...props, children: children }));
};
export const MapControlSeparator = ({ className, ...props }) => {
    const { slots } = useMapContext();
    return (_jsx(ButtonGroup.Separator, { className: composeSlotClassName(slots.controlSeparator, className), "data-slot": "map-control-separator", ...props }));
};
export const MapControlButton = ({ children, className, label, type = 'button', ...props }) => {
    const { slots } = useMapContext();
    return (_jsx(Button, { isIconOnly: true, "aria-label": label, className: composeTwRenderProps(className, slots.controlButton()), "data-slot": "map-control-button", type: type, ...props, children: children }));
};
export const MapZoomControl = ({ className, duration = 300, step = 1, ...props }) => {
    const { map, slots } = useMapContext();
    const zoomIn = useCallback(() => {
        if (!map)
            return;
        map.zoomTo(map.getZoom() + step, { duration });
    }, [duration, map, step]);
    const zoomOut = useCallback(() => {
        if (!map)
            return;
        map.zoomTo(map.getZoom() - step, { duration });
    }, [duration, map, step]);
    return (_jsxs(MapControlGroup, { className: className, ...props, children: [_jsx(MapControlButton, { isDisabled: !map, label: "Zoom in", onPress: zoomIn, children: _jsx(Plus, { className: slots.controlIcon(), "data-slot": "map-control-icon" }) }), _jsxs(MapControlButton, { isDisabled: !map, label: "Zoom out", onPress: zoomOut, children: [_jsx(MapControlSeparator, {}), _jsx(Minus, { className: slots.controlIcon(), "data-slot": "map-control-icon" })] })] }));
};
export const MapCompassControl = ({ className, duration = 300, ...props }) => {
    const { map, slots } = useMapContext();
    const compassRef = useRef(null);
    useEffect(() => {
        if (!map || !compassRef.current)
            return;
        const needle = compassRef.current;
        const updateNeedle = () => {
            const bearing = map.getBearing();
            const pitch = map.getPitch();
            needle.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
        };
        map.on('rotate', updateNeedle);
        map.on('pitch', updateNeedle);
        updateNeedle();
        return () => {
            map.off('rotate', updateNeedle);
            map.off('pitch', updateNeedle);
        };
    }, [map]);
    const resetNorth = useCallback(() => {
        map?.resetNorthPitch({ duration });
    }, [duration, map]);
    return (_jsx(MapControlGroup, { className: className, ...props, children: _jsx(MapControlButton, { isDisabled: !map, label: "Reset bearing to north", onPress: resetNorth, children: _jsx(CompassIcon, { ref: compassRef, className: slots.compassIcon(), "data-slot": "map-compass-icon" }) }) }));
};
export const MapLocateControl = ({ className, duration = 1500, onLocate, onLocateError, zoom = 14, ...props }) => {
    const { map, slots } = useMapContext();
    const [isLocating, setIsLocating] = useState(false);
    const geolocationAvailable = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    const locate = useCallback(() => {
        if (!map || !geolocationAvailable)
            return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition((position) => {
            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
            map.flyTo({
                center: [coords.longitude, coords.latitude],
                duration,
                zoom,
            });
            onLocate?.(coords);
            setIsLocating(false);
        }, (error) => {
            onLocateError?.(error);
            setIsLocating(false);
        });
    }, [duration, geolocationAvailable, map, onLocate, onLocateError, zoom]);
    return (_jsx(MapControlGroup, { className: className, ...props, children: _jsx(MapControlButton, { isDisabled: !map || !geolocationAvailable || isLocating, label: "Find my location", onPress: locate, children: isLocating ? (_jsx(Spinner, { className: slots.controlSpinner(), color: "current", "data-slot": "map-control-spinner", size: "sm" })) : (_jsx(LocateIcon, { className: slots.controlIcon(), "data-slot": "map-control-icon" })) }) }));
};
export const MapFullscreenControl = ({ className, isDisabled, onFullscreenError, ...props }) => {
    const { map, slots } = useMapContext();
    const fullscreenEnabled = typeof document !== 'undefined' &&
        document.fullscreenEnabled &&
        typeof map?.getContainer().requestFullscreen === 'function';
    const toggleFullscreen = useCallback(() => {
        if (typeof document === 'undefined')
            return;
        const container = map?.getContainer();
        if (!container || !document.fullscreenEnabled)
            return;
        const action = document.fullscreenElement
            ? document.exitFullscreen()
            : container.requestFullscreen();
        action.catch((error) => {
            onFullscreenError?.(error);
        });
    }, [map, onFullscreenError]);
    return (_jsx(MapControlGroup, { className: className, ...props, children: _jsx(MapControlButton, { isDisabled: isDisabled || !map || !fullscreenEnabled, label: "Toggle fullscreen", onPress: toggleFullscreen, children: _jsx(FullscreenIcon, { className: slots.controlIcon(), "data-slot": "map-control-icon" }) }) }));
};
// ── Layers ───────────────────────────────────────────────────────────────────
export const MapRoute = ({ color, coordinates, dashArray, id: propId, interactive = true, onClick, onMouseEnter, onMouseLeave, opacity, width, }) => {
    const { isLoaded, map } = useMapContext();
    const layerId = useLayerId('route', propId);
    const sourceId = `${layerId}-source`;
    const lineLayerId = `${layerId}-layer`;
    const handlersRef = useLatestRef({ onClick, onMouseEnter, onMouseLeave });
    const paintValues = useCallback(() => {
        const container = map?.getContainer();
        return {
            color: color ??
                (container
                    ? resolveCssColor(getCssVariable(container, '--map-route-color'), DEFAULT_ROUTE_COLOR)
                    : DEFAULT_ROUTE_COLOR),
            opacity: opacity ??
                (container
                    ? parseCssVariableFloat(container, '--map-route-opacity', 0.8)
                    : 0.8),
            width: width ??
                (container
                    ? parseCssVariableFloat(container, '--map-route-width', 3)
                    : 3),
        };
    }, [color, map, opacity, width]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        const paint = paintValues();
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                data: {
                    geometry: { coordinates: [], type: 'LineString' },
                    properties: {},
                    type: 'Feature',
                },
                type: 'geojson',
            });
        }
        if (!map.getLayer(lineLayerId)) {
            map.addLayer({
                id: lineLayerId,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': paint.color,
                    'line-opacity': paint.opacity,
                    'line-width': paint.width,
                    ...(dashArray ? { 'line-dasharray': dashArray } : {}),
                },
                source: sourceId,
                type: 'line',
            });
        }
        return () => {
            try {
                if (map.getLayer(lineLayerId))
                    map.removeLayer(lineLayerId);
                if (map.getSource(sourceId))
                    map.removeSource(sourceId);
            }
            catch {
                // Map may already be destroyed.
            }
        };
    }, [dashArray, isLoaded, lineLayerId, map, paintValues, sourceId]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        try {
            const source = map.getSource(sourceId);
            source?.setData({
                geometry: { coordinates, type: 'LineString' },
                properties: {},
                type: 'Feature',
            });
        }
        catch {
            // Style may be tearing down.
        }
    }, [coordinates, isLoaded, map, sourceId]);
    useEffect(() => {
        if (!isLoaded || !map || !map.getLayer(lineLayerId))
            return;
        const paint = paintValues();
        map.setPaintProperty(lineLayerId, 'line-color', paint.color);
        map.setPaintProperty(lineLayerId, 'line-width', paint.width);
        map.setPaintProperty(lineLayerId, 'line-opacity', paint.opacity);
        map.setPaintProperty(lineLayerId, 'line-dasharray', dashArray ?? undefined);
    }, [dashArray, isLoaded, lineLayerId, map, paintValues]);
    useEffect(() => {
        if (!isLoaded || !map || !interactive)
            return;
        const handleClick = () => handlersRef.current.onClick?.();
        const handleMouseEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
            handlersRef.current.onMouseEnter?.();
        };
        const handleMouseLeave = () => {
            map.getCanvas().style.cursor = '';
            handlersRef.current.onMouseLeave?.();
        };
        map.on('click', lineLayerId, handleClick);
        map.on('mouseenter', lineLayerId, handleMouseEnter);
        map.on('mouseleave', lineLayerId, handleMouseLeave);
        return () => {
            map.off('click', lineLayerId, handleClick);
            map.off('mouseenter', lineLayerId, handleMouseEnter);
            map.off('mouseleave', lineLayerId, handleMouseLeave);
        };
    }, [handlersRef, interactive, isLoaded, lineLayerId, map]);
    return null;
};
export const MapArc = ({ beforeId, curvature = 0.2, data, hoverPaint, id: propId, interactive = true, layout, onClick, onHover, paint, samples = 64, }) => {
    const { isLoaded, map } = useMapContext();
    const layerId = useLayerId('arc', propId);
    const sourceId = `${layerId}-source`;
    const lineLayerId = `${layerId}-layer`;
    const hitLayerId = `${layerId}-hit-layer`;
    const handlersRef = useLatestRef({ data, onClick, onHover });
    const resolvedPaint = useMemo(() => mergeHoverPaint({ ...DEFAULT_ARC_PAINT, ...paint }, hoverPaint), [hoverPaint, paint]);
    const resolvedLayout = useMemo(() => ({ ...DEFAULT_ARC_LAYOUT, ...layout }), [layout]);
    const hitLineWidth = useMemo(() => {
        const lineWidth = paint?.['line-width'] ?? DEFAULT_ARC_PAINT['line-width'];
        const numericWidth = typeof lineWidth === 'number' ? lineWidth : 12;
        return Math.max(numericWidth + 6, 12);
    }, [paint]);
    const featureCollection = useMemo(() => ({
        features: data.map((arc) => {
            const { from, to, ...properties } = arc;
            return {
                geometry: {
                    coordinates: buildArcCoordinates(from, to, curvature, samples),
                    type: 'LineString',
                },
                properties,
                type: 'Feature',
            };
        }),
        type: 'FeatureCollection',
    }), [curvature, data, samples]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                data: featureCollection,
                promoteId: 'id',
                type: 'geojson',
            });
        }
        if (!map.getLayer(lineLayerId)) {
            map.addLayer({
                id: lineLayerId,
                layout: resolvedLayout,
                paint: resolvedPaint,
                source: sourceId,
                type: 'line',
            }, beforeId);
        }
        if (!map.getLayer(hitLayerId)) {
            map.addLayer({
                id: hitLayerId,
                layout: DEFAULT_ARC_LAYOUT,
                paint: {
                    'line-color': 'rgba(0, 0, 0, 0)',
                    'line-opacity': 1,
                    'line-width': hitLineWidth,
                },
                source: sourceId,
                type: 'line',
            }, beforeId);
        }
        if (map.getLayer(hitLayerId)) {
            map.moveLayer(hitLayerId, beforeId);
        }
        return () => {
            try {
                if (map.getLayer(hitLayerId))
                    map.removeLayer(hitLayerId);
                if (map.getLayer(lineLayerId))
                    map.removeLayer(lineLayerId);
                if (map.getSource(sourceId))
                    map.removeSource(sourceId);
            }
            catch {
                // Map may already be destroyed.
            }
        };
    }, [
        beforeId,
        featureCollection,
        hitLayerId,
        hitLineWidth,
        isLoaded,
        lineLayerId,
        map,
        resolvedLayout,
        resolvedPaint,
        sourceId,
    ]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        try {
            const source = map.getSource(sourceId);
            source?.setData(featureCollection);
        }
        catch {
            // Style may be tearing down.
        }
    }, [featureCollection, isLoaded, map, sourceId]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        if (map.getLayer(lineLayerId)) {
            for (const [key, value] of Object.entries(resolvedPaint)) {
                map.setPaintProperty(lineLayerId, key, value);
            }
            for (const [key, value] of Object.entries(resolvedLayout)) {
                map.setLayoutProperty(lineLayerId, key, value);
            }
        }
        if (map.getLayer(hitLayerId)) {
            map.setPaintProperty(hitLayerId, 'line-width', hitLineWidth);
        }
    }, [
        hitLayerId,
        hitLineWidth,
        isLoaded,
        lineLayerId,
        map,
        resolvedLayout,
        resolvedPaint,
    ]);
    useEffect(() => {
        if (!isLoaded || !map || !interactive)
            return;
        let hoveredId = null;
        const setHover = (nextId) => {
            if (nextId === hoveredId)
                return;
            const hasSource = Boolean(map.getSource(sourceId));
            if (hoveredId !== null && hasSource) {
                map.setFeatureState({ id: hoveredId, source: sourceId }, { hover: false });
            }
            hoveredId = nextId;
            if (nextId !== null && hasSource) {
                map.setFeatureState({ id: nextId, source: sourceId }, { hover: true });
            }
        };
        const findArc = (id) => id === undefined
            ? undefined
            : handlersRef.current.data.find((arc) => String(arc.id) === String(id));
        const handleMouseMove = (event) => {
            const featureId = event.features?.[0]?.id;
            if (featureId === undefined || featureId === hoveredId)
                return;
            setHover(featureId);
            map.getCanvas().style.cursor = 'pointer';
            const arc = findArc(featureId);
            if (arc) {
                handlersRef.current.onHover?.({
                    arc,
                    latitude: event.lngLat.lat,
                    longitude: event.lngLat.lng,
                    originalEvent: event,
                });
            }
        };
        const handleMouseLeave = () => {
            setHover(null);
            map.getCanvas().style.cursor = '';
            handlersRef.current.onHover?.(null);
        };
        const handleClick = (event) => {
            const arc = findArc(event.features?.[0]?.id);
            if (!arc)
                return;
            handlersRef.current.onClick?.({
                arc,
                latitude: event.lngLat.lat,
                longitude: event.lngLat.lng,
                originalEvent: event,
            });
        };
        map.on('mousemove', hitLayerId, handleMouseMove);
        map.on('mouseleave', hitLayerId, handleMouseLeave);
        map.on('click', hitLayerId, handleClick);
        return () => {
            map.off('mousemove', hitLayerId, handleMouseMove);
            map.off('mouseleave', hitLayerId, handleMouseLeave);
            map.off('click', hitLayerId, handleClick);
            setHover(null);
            map.getCanvas().style.cursor = '';
        };
    }, [handlersRef, hitLayerId, interactive, isLoaded, map, sourceId]);
    return null;
};
export const MapClusterLayer = ({ clusterColors = ['#22c55e', '#eab308', '#ef4444'], clusterMaxZoom = 14, clusterRadius = 50, clusterThresholds = [100, 750], data, id: propId, onClusterClick, onPointClick, pointColor = '#3b82f6', pointPaint, }) => {
    const { isLoaded, map } = useMapContext();
    const layerId = useLayerId('cluster', propId);
    const sourceId = `${layerId}-source`;
    const clustersLayerId = `${layerId}-clusters`;
    const clusterCountLayerId = `${layerId}-cluster-count`;
    const unclusteredLayerId = `${layerId}-unclustered-point`;
    const handlersRef = useLatestRef({ onClusterClick, onPointClick });
    const dataRef = useLatestRef(data);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                cluster: true,
                clusterMaxZoom,
                clusterRadius,
                data: dataRef.current,
                type: 'geojson',
            });
        }
        if (!map.getLayer(clustersLayerId)) {
            map.addLayer({
                filter: ['has', 'point_count'],
                id: clustersLayerId,
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        clusterColors[0],
                        clusterThresholds[0],
                        clusterColors[1],
                        clusterThresholds[1],
                        clusterColors[2],
                    ],
                    'circle-opacity': 0.85,
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20,
                        clusterThresholds[0],
                        30,
                        clusterThresholds[1],
                        40,
                    ],
                    'circle-stroke-color': '#fff',
                    'circle-stroke-width': 1,
                },
                source: sourceId,
                type: 'circle',
            });
        }
        if (!map.getLayer(clusterCountLayerId)) {
            map.addLayer({
                filter: ['has', 'point_count'],
                id: clusterCountLayerId,
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 12,
                },
                paint: { 'text-color': '#fff' },
                source: sourceId,
                type: 'symbol',
            });
        }
        if (!map.getLayer(unclusteredLayerId)) {
            map.addLayer({
                filter: ['!', ['has', 'point_count']],
                id: unclusteredLayerId,
                paint: {
                    'circle-color': pointColor,
                    'circle-radius': 6,
                    'circle-stroke-color': '#fff',
                    'circle-stroke-width': 2,
                },
                source: sourceId,
                type: 'circle',
            });
        }
        return () => {
            try {
                if (map.getLayer(clusterCountLayerId))
                    map.removeLayer(clusterCountLayerId);
                if (map.getLayer(unclusteredLayerId))
                    map.removeLayer(unclusteredLayerId);
                if (map.getLayer(clustersLayerId))
                    map.removeLayer(clustersLayerId);
                if (map.getSource(sourceId))
                    map.removeSource(sourceId);
            }
            catch {
                // Map may already be destroyed.
            }
        };
    }, [
        clusterColors,
        clusterCountLayerId,
        clusterMaxZoom,
        clusterRadius,
        clusterThresholds,
        clustersLayerId,
        dataRef,
        isLoaded,
        map,
        pointColor,
        sourceId,
        unclusteredLayerId,
    ]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        try {
            const source = map.getSource(sourceId);
            source?.setData(data);
        }
        catch {
            // Style may be tearing down.
        }
    }, [data, isLoaded, map, sourceId]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        if (map.getLayer(clustersLayerId)) {
            map.setPaintProperty(clustersLayerId, 'circle-color', [
                'step',
                ['get', 'point_count'],
                clusterColors[0],
                clusterThresholds[0],
                clusterColors[1],
                clusterThresholds[1],
                clusterColors[2],
            ]);
            map.setPaintProperty(clustersLayerId, 'circle-radius', [
                'step',
                ['get', 'point_count'],
                20,
                clusterThresholds[0],
                30,
                clusterThresholds[1],
                40,
            ]);
        }
        if (map.getLayer(unclusteredLayerId)) {
            const paint = {
                'circle-color': pointColor,
                'circle-radius': 6,
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2,
                ...pointPaint,
            };
            for (const [key, value] of Object.entries(paint)) {
                map.setPaintProperty(unclusteredLayerId, key, value);
            }
        }
    }, [
        clusterColors,
        clusterThresholds,
        clustersLayerId,
        isLoaded,
        map,
        pointColor,
        pointPaint,
        unclusteredLayerId,
    ]);
    useEffect(() => {
        if (!isLoaded || !map)
            return;
        let active = true;
        const handleClusterClick = (event) => {
            const features = map.queryRenderedFeatures(event.point, {
                layers: [clusterCountLayerId, clustersLayerId],
            });
            if (!features.length)
                return;
            const feature = features[0];
            if (!feature)
                return;
            const clusterId = feature.properties?.cluster_id;
            const pointCount = feature.properties?.point_count;
            const coordinates = feature.geometry.coordinates.slice();
            if (handlersRef.current.onClusterClick) {
                handlersRef.current.onClusterClick(clusterId, coordinates, pointCount);
                return;
            }
            const source = map.getSource(sourceId);
            source
                ?.getClusterExpansionZoom(clusterId)
                .then((nextZoom) => {
                if (!active || !map.getSource(sourceId))
                    return;
                map.easeTo({ center: coordinates, zoom: nextZoom });
            })
                .catch(() => { });
        };
        const handlePointClick = (event) => {
            if (!handlersRef.current.onPointClick || !event.features?.length)
                return;
            const feature = event.features[0];
            if (!feature)
                return;
            const coordinates = feature.geometry.coordinates.slice();
            while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            handlersRef.current.onPointClick(feature, coordinates);
        };
        const handleClusterEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const handleClusterLeave = () => {
            map.getCanvas().style.cursor = '';
        };
        const handlePointEnter = () => {
            if (handlersRef.current.onPointClick) {
                map.getCanvas().style.cursor = 'pointer';
            }
        };
        const handlePointLeave = () => {
            map.getCanvas().style.cursor = '';
        };
        map.on('click', clustersLayerId, handleClusterClick);
        map.on('click', clusterCountLayerId, handleClusterClick);
        map.on('click', unclusteredLayerId, handlePointClick);
        map.on('mouseenter', clustersLayerId, handleClusterEnter);
        map.on('mouseenter', clusterCountLayerId, handleClusterEnter);
        map.on('mouseleave', clustersLayerId, handleClusterLeave);
        map.on('mouseleave', clusterCountLayerId, handleClusterLeave);
        map.on('mouseenter', unclusteredLayerId, handlePointEnter);
        map.on('mouseleave', unclusteredLayerId, handlePointLeave);
        return () => {
            active = false;
            map.off('click', clustersLayerId, handleClusterClick);
            map.off('click', clusterCountLayerId, handleClusterClick);
            map.off('click', unclusteredLayerId, handlePointClick);
            map.off('mouseenter', clustersLayerId, handleClusterEnter);
            map.off('mouseenter', clusterCountLayerId, handleClusterEnter);
            map.off('mouseleave', clustersLayerId, handleClusterLeave);
            map.off('mouseleave', clusterCountLayerId, handleClusterLeave);
            map.off('mouseenter', unclusteredLayerId, handlePointEnter);
            map.off('mouseleave', unclusteredLayerId, handlePointLeave);
        };
    }, [
        clusterCountLayerId,
        clustersLayerId,
        handlersRef,
        isLoaded,
        map,
        sourceId,
        unclusteredLayerId,
    ]);
    return null;
};
//# sourceMappingURL=map.js.map