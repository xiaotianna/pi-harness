const styleCache = new WeakMap();
export function isInView(el) {
    // not in original but declared in d.ts - provide a safe default
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
}
export function set(el, styles, ignoreCache = false) {
    if (!(el && el instanceof HTMLElement))
        return;
    const cache = {};
    Object.entries(styles).forEach(([prop, value]) => {
        if (prop.startsWith('--')) {
            el.style.setProperty(prop, value);
        }
        else {
            const elStyle = el.style;
            cache[prop] = elStyle[prop] ?? '';
            elStyle[prop] = value;
        }
    });
    if (!ignoreCache) {
        styleCache.set(el, cache);
    }
}
export function reset(el, prop) {
    if (!(el && el instanceof HTMLElement))
        return;
    const cache = styleCache.get(el);
    if (cache && prop) {
        const value = cache[prop];
        if (value !== undefined) {
            const elStyle = el.style;
            elStyle[prop] = value;
        }
    }
}
export const isVertical = (direction) => {
    switch (direction) {
        case 'top':
        case 'bottom':
            return true;
        case 'left':
        case 'right':
            return false;
        default:
            return direction;
    }
};
export function getTranslate(element, direction) {
    if (!element)
        return null;
    const style = window.getComputedStyle(element);
    const transform = style.transform ||
        style.webkitTransform ||
        style.mozTransform;
    if (!transform || transform === 'none')
        return null;
    let match = transform.match(/^matrix3d\((.+)\)$/);
    if (match) {
        return parseFloat(match[1].split(', ')[isVertical(direction) ? 13 : 12] ?? '0');
    }
    match = transform.match(/^matrix\((.+)\)$/);
    if (match) {
        return parseFloat(match[1].split(', ')[isVertical(direction) ? 5 : 4] ?? '0');
    }
    return null;
}
export function dampenValue(v) {
    return 8 * (Math.log(v + 1) - 2);
}
export function assignStyle(element, style) {
    if (!element)
        return () => { };
    const originalCssText = element.style.cssText;
    Object.assign(element.style, style);
    return () => {
        element.style.cssText = originalCssText;
    };
}
export function chain(...fns) {
    return (...args) => {
        for (const fn of fns) {
            if (typeof fn === 'function') {
                fn(...args);
            }
        }
    };
}
//# sourceMappingURL=helpers.js.map