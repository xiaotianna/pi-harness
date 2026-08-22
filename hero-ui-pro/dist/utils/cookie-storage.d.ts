export declare function getCookie(name: string): string | null;
export declare function setCookie(name: string, value: string, maxAge?: number): void;
export declare function createCookieStorage(maxAge?: number): {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};
//# sourceMappingURL=cookie-storage.d.ts.map