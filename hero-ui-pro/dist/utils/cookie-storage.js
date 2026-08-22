'use client';
export function getCookie(name) {
    if (typeof document === 'undefined')
        return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match?.[1] != null ? decodeURIComponent(match[1]) : null;
}
export function setCookie(name, value, maxAge = 31536000) {
    if (typeof document !== 'undefined') {
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
}
export function createCookieStorage(maxAge = 31536000) {
    return {
        getItem(key) {
            return (getCookie(key) ??
                (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null));
        },
        setItem(key, value) {
            setCookie(key, value, maxAge);
            try {
                localStorage.setItem(key, value);
            }
            catch {
                // ignore
            }
        },
    };
}
//# sourceMappingURL=cookie-storage.js.map