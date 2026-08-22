import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import type { MarkerOptions, PopupOptions } from 'maplibre-gl';
import * as MapLibreGL from 'maplibre-gl';
import { Button, ButtonGroup } from '@heroui/react';
import 'maplibre-gl/dist/maplibre-gl.css';
export type MapTheme = 'light' | 'dark';
export type MapStyleOption = string | MapLibreGL.StyleSpecification;
export type MapRef = MapLibreGL.Map;
export type MapViewport = {
    bearing: number;
    center: [number, number];
    pitch: number;
    zoom: number;
};
type MapContainerProps = Pick<ComponentPropsWithRef<'div'>, 'className' | 'id' | 'role' | 'style' | 'tabIndex'> & {
    'aria-describedby'?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
};
export interface MapRootProps extends MapContainerProps, Omit<MapLibreGL.MapOptions, 'container' | 'style'> {
    children?: ReactNode;
    /** Controlled loading veil shown over the map. */
    isLoading?: boolean;
    /** Single MapLibre-compatible style URL/object. Overrides `styles` when provided. */
    mapStyle?: MapStyleOption;
    /** Map projection. Use `{type: "globe"}` for globe maps. */
    projection?: MapLibreGL.ProjectionSpecification;
    /** Ref exposing the underlying MapLibre map instance. */
    ref?: Ref<MapLibreGL.Map | null>;
    /** Theme-aware MapLibre-compatible styles. Provide these from your app or map provider. */
    styles?: {
        dark?: MapStyleOption;
        light?: MapStyleOption;
    };
    /** Force a map theme. If omitted, the document class/system preference is used. */
    theme?: MapTheme;
    /** Controlled viewport. Pair with `onViewportChange` to drive the map from React state. */
    viewport?: Partial<MapViewport>;
    /** Fired as the map moves. Used standalone or with `viewport` for controlled mode. */
    onViewportChange?: (viewport: MapViewport) => void;
}
export interface MapMarkerProps extends Omit<MarkerOptions, 'element'> {
    children?: ReactNode;
    latitude: number;
    longitude: number;
    onClick?: (event: MouseEvent) => void;
    onDrag?: (lngLat: {
        lat: number;
        lng: number;
    }) => void;
    onDragEnd?: (lngLat: {
        lat: number;
        lng: number;
    }) => void;
    onDragStart?: (lngLat: {
        lat: number;
        lng: number;
    }) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
}
export interface MarkerContentProps {
    children?: ReactNode;
    className?: string;
}
export interface MarkerDotProps extends ComponentPropsWithRef<'span'> {
    color?: string;
    ringColor?: string;
}
export interface MarkerLabelProps extends ComponentPropsWithRef<'div'> {
    position?: 'bottom' | 'top';
}
export interface MarkerPopupProps extends Omit<PopupOptions, 'className' | 'closeButton'> {
    children: ReactNode;
    className?: string;
    closeButton?: boolean;
}
export interface MarkerTooltipProps extends Omit<PopupOptions, 'className' | 'closeButton' | 'closeOnClick'> {
    children: ReactNode;
    className?: string;
}
export interface MapPopupProps extends Omit<PopupOptions, 'className' | 'closeButton'> {
    children: ReactNode;
    className?: string;
    closeButton?: boolean;
    latitude: number;
    longitude: number;
    onClose?: () => void;
}
export type MapControlsPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export interface MapControlsProps extends ComponentPropsWithRef<'div'> {
    position?: MapControlsPosition;
}
export interface MapControlGroupProps extends ComponentPropsWithRef<typeof ButtonGroup> {
}
export interface MapControlSeparatorProps extends ComponentPropsWithRef<typeof ButtonGroup.Separator> {
}
export interface MapControlButtonProps extends Omit<ComponentPropsWithRef<typeof Button>, 'aria-label' | 'children' | 'isIconOnly'> {
    children?: ReactNode;
    label: string;
}
export interface MapZoomControlProps extends Omit<MapControlGroupProps, 'children'> {
    duration?: number;
    step?: number;
}
export interface MapCompassControlProps extends Omit<MapControlGroupProps, 'children'> {
    duration?: number;
}
export interface MapLocateControlProps extends Omit<MapControlGroupProps, 'children'> {
    duration?: number;
    onLocate?: (coords: {
        latitude: number;
        longitude: number;
    }) => void;
    onLocateError?: (error: GeolocationPositionError) => void;
    zoom?: number;
}
export interface MapFullscreenControlProps extends Omit<MapControlGroupProps, 'children'> {
    onFullscreenError?: (error: unknown) => void;
}
export interface MapRouteProps {
    color?: string;
    coordinates: [number, number][];
    dashArray?: [number, number];
    id?: string;
    interactive?: boolean;
    opacity?: number;
    width?: number;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}
export type MapArcDatum = {
    from: [number, number];
    id: number | string;
    to: [number, number];
};
export type MapArcEvent<T extends MapArcDatum = MapArcDatum> = {
    arc: T;
    latitude: number;
    longitude: number;
    originalEvent: MapLibreGL.MapMouseEvent;
};
type MapArcLinePaint = NonNullable<MapLibreGL.LineLayerSpecification['paint']>;
type MapArcLineLayout = NonNullable<MapLibreGL.LineLayerSpecification['layout']>;
export interface MapArcProps<T extends MapArcDatum = MapArcDatum> {
    beforeId?: string;
    curvature?: number;
    data: T[];
    hoverPaint?: MapArcLinePaint;
    id?: string;
    interactive?: boolean;
    layout?: MapArcLineLayout;
    paint?: MapArcLinePaint;
    samples?: number;
    onClick?: (event: MapArcEvent<T>) => void;
    onHover?: (event: MapArcEvent<T> | null) => void;
}
export interface MapClusterLayerProps<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> {
    clusterColors?: [string, string, string];
    clusterMaxZoom?: number;
    clusterRadius?: number;
    clusterThresholds?: [number, number];
    data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
    id?: string;
    pointColor?: NonNullable<MapLibreGL.CircleLayerSpecification['paint']>['circle-color'];
    pointPaint?: NonNullable<MapLibreGL.CircleLayerSpecification['paint']>;
    onClusterClick?: (clusterId: number, coordinates: [number, number], pointCount: number) => void;
    onPointClick?: (feature: GeoJSON.Feature<GeoJSON.Point, P>, coordinates: [number, number]) => void;
}
export declare function useMap(): {
    isLoaded: boolean;
    map: MapLibreGL.Map | null;
};
export declare const MapRoot: ({ "aria-describedby": ariaDescribedBy, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, children, className, id, isLoading, mapStyle, onViewportChange, projection, ref, role, style, styles, tabIndex, theme: themeProp, viewport, ...mapOptions }: MapRootProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapMarker: ({ children, draggable, latitude, longitude, onClick, onDrag, onDragEnd, onDragStart, onMouseEnter, onMouseLeave, ...markerOptions }: MapMarkerProps) => import("react/jsx-runtime").JSX.Element | null;
export declare const MarkerContent: ({ children, className }: MarkerContentProps) => import("react").ReactPortal;
export declare const MarkerDot: ({ className, color, ringColor, style, ...props }: MarkerDotProps) => import("react/jsx-runtime").JSX.Element;
export declare const MarkerLabel: ({ children, className, position, ...props }: MarkerLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const MarkerPopup: ({ children, className, closeButton, ...popupOptions }: MarkerPopupProps) => import("react").ReactPortal | null;
export declare const MarkerTooltip: ({ children, className, ...popupOptions }: MarkerTooltipProps) => import("react").ReactPortal | null;
export declare const MapPopup: ({ children, className, closeButton, latitude, longitude, onClose, ...popupOptions }: MapPopupProps) => import("react").ReactPortal | null;
export declare const MapControls: ({ children, className, position, ...props }: MapControlsProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapControlGroup: ({ children, className, orientation, size, variant, ...props }: MapControlGroupProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapControlSeparator: ({ className, ...props }: MapControlSeparatorProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapControlButton: ({ children, className, label, type, ...props }: MapControlButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapZoomControl: ({ className, duration, step, ...props }: MapZoomControlProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapCompassControl: ({ className, duration, ...props }: MapCompassControlProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapLocateControl: ({ className, duration, onLocate, onLocateError, zoom, ...props }: MapLocateControlProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapFullscreenControl: ({ className, isDisabled, onFullscreenError, ...props }: MapFullscreenControlProps) => import("react/jsx-runtime").JSX.Element;
export declare const MapRoute: ({ color, coordinates, dashArray, id: propId, interactive, onClick, onMouseEnter, onMouseLeave, opacity, width, }: MapRouteProps) => null;
export declare const MapArc: <T extends MapArcDatum = MapArcDatum>({ beforeId, curvature, data, hoverPaint, id: propId, interactive, layout, onClick, onHover, paint, samples, }: MapArcProps<T>) => null;
export declare const MapClusterLayer: <P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties>({ clusterColors, clusterMaxZoom, clusterRadius, clusterThresholds, data, id: propId, onClusterClick, onPointClick, pointColor, pointPaint, }: MapClusterLayerProps<P>) => null;
export {};
//# sourceMappingURL=map.d.ts.map