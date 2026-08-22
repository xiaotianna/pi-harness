export function isMobileFirefox() {
    const ua = navigator.userAgent;
    return (typeof window !== 'undefined' &&
        ((/Firefox/.test(ua) && /Mobile/.test(ua)) || /FxiOS/.test(ua)));
}
export function isMac() {
    return testPlatform(/^Mac/);
}
export function isIPhone() {
    return testPlatform(/^iPhone/);
}
export function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
export function isIPad() {
    return testPlatform(/^iPad/) || (isMac() && navigator.maxTouchPoints > 1);
}
export function isIOS() {
    return isIPhone() || isIPad();
}
export function testPlatform(re) {
    return typeof window !== 'undefined' && window.navigator != null
        ? re.test(window.navigator.platform)
        : undefined;
}
//# sourceMappingURL=browser.js.map