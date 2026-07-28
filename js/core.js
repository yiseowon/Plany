export const APP_VERSION = '2.1.0';

export const TRIP_LIMITS = Object.freeze({
    titleMaxLength: 80,
    destinationMaxLength: 160,
    minYear: 2020,
    maxYear: 2100,
    maxDays: 90,
});

export function normalizeText(value, maxLength = 200) {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    })[character]);
}

export function safeImageUrl(value, fallback = '') {
    const url = String(value ?? '').trim();
    if (/^https:\/\//i.test(url) || /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(url)) {
        return url;
    }
    return fallback;
}

function parseISODate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) return null;
    return { value: match[0], year, date };
}

export function validateTripDateRange(startValue, endValue, limits = TRIP_LIMITS) {
    const start = parseISODate(startValue);
    const end = parseISODate(endValue);
    if (!start || !end) {
        return { ok: false, error: '출발일과 도착일을 정확히 입력해주세요.' };
    }
    if (
        start.year < limits.minYear || start.year > limits.maxYear ||
        end.year < limits.minYear || end.year > limits.maxYear
    ) {
        return { ok: false, error: `${limits.minYear}년부터 ${limits.maxYear}년 사이의 날짜만 사용할 수 있어요.` };
    }
    if (end.date < start.date) {
        return { ok: false, error: '도착일은 출발일과 같거나 이후여야 합니다.' };
    }
    const daysCount = Math.round((end.date - start.date) / 86400000) + 1;
    if (daysCount > limits.maxDays) {
        return { ok: false, error: `한 여행은 최대 ${limits.maxDays}일까지 만들 수 있어요.` };
    }
    return { ok: true, start: start.value, end: end.value, daysCount };
}

export function validateTripDraft({ title, destinations, start, end }) {
    const cleanTitle = normalizeText(title, TRIP_LIMITS.titleMaxLength);
    if (!cleanTitle) return { ok: false, error: '여행 제목을 입력해주세요.' };

    const cleanDestinations = (Array.isArray(destinations) ? destinations : [])
        .map((destination) => normalizeText(destination, TRIP_LIMITS.destinationMaxLength))
        .filter(Boolean);
    if (cleanDestinations.length === 0) {
        return { ok: false, error: '최소 한 곳 이상의 여행지를 추가해주세요.' };
    }

    const dateRange = validateTripDateRange(start, end);
    if (!dateRange.ok) return dateRange;

    return {
        ok: true,
        title: cleanTitle,
        destination: cleanDestinations.join(' / '),
        start: dateRange.start,
        end: dateRange.end,
        daysCount: dateRange.daysCount,
    };
}
