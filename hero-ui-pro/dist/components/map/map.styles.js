import { tv } from 'tailwind-variants';
export const mapVariants = tv({
    defaultVariants: {
        controlsPosition: 'bottom-right',
        markerLabelPosition: 'top',
    },
    slots: {
        base: 'map',
        compassIcon: 'map__compass-icon',
        controlButton: 'map__control-button',
        controlGroup: 'map__control-group',
        controlIcon: 'map__control-icon',
        controlSeparator: 'map__control-separator',
        controlSpinner: 'map__control-spinner',
        controls: 'map__controls',
        defaultMarker: 'map__default-marker',
        loader: 'map__loader',
        loaderSpinner: 'map__loader-spinner',
        marker: 'map__marker',
        markerContent: 'map__marker-content',
        markerLabel: 'map__marker-label',
        popupCloseButton: 'map__popup-close-button',
        popupContent: 'map__popup-content',
        tooltip: 'map__tooltip',
    },
    variants: {
        controlsPosition: {
            'bottom-left': { controls: 'map__controls--bottom-left' },
            'bottom-right': { controls: 'map__controls--bottom-right' },
            'top-left': { controls: 'map__controls--top-left' },
            'top-right': { controls: 'map__controls--top-right' },
        },
        markerLabelPosition: {
            bottom: { markerLabel: 'map__marker-label--bottom' },
            top: { markerLabel: 'map__marker-label--top' },
        },
    },
});
//# sourceMappingURL=map.styles.js.map