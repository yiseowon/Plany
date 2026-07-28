export const DEFAULT_SIDEBAR_WIDTH = 420;
export const MIN_SIDEBAR_WIDTH = 340;
export const MAX_SIDEBAR_WIDTH = 640;

export function clampSidebarWidth(width, viewportWidth) {
    const parsedWidth = Number(width);
    const parsedViewport = Number(viewportWidth);
    const safeViewport = Number.isFinite(parsedViewport) && parsedViewport > 0 ? parsedViewport : 1440;
    const responsiveMax = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, safeViewport * 0.58));
    if (!Number.isFinite(parsedWidth)) return Math.min(DEFAULT_SIDEBAR_WIDTH, responsiveMax);
    return Math.round(Math.min(responsiveMax, Math.max(MIN_SIDEBAR_WIDTH, parsedWidth)));
}

export function readSidebarWidth(storedValue, viewportWidth) {
    if (storedValue === null || storedValue === undefined || storedValue === '') {
        return clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH, viewportWidth);
    }
    return clampSidebarWidth(storedValue, viewportWidth);
}
