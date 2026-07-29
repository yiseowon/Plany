import test from 'node:test';
import assert from 'node:assert/strict';

import {
    escapeHTML,
    normalizeText,
    safeImageUrl,
    validateTripDateRange,
    validateTripDraft,
} from '../js/core.js';

test('normalizes text and removes control characters', () => {
    assert.equal(normalizeText('  서울\n 여행\u0000  '), '서울 여행');
});

test('escapes user controlled HTML', () => {
    assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('accepts only safe image URL schemes', () => {
    assert.equal(safeImageUrl('javascript:alert(1)', '/fallback.svg'), '/fallback.svg');
    assert.equal(safeImageUrl('https://example.com/avatar.png'), 'https://example.com/avatar.png');
});

test('rejects impossible and extreme travel dates', () => {
    assert.equal(validateTripDateRange('2026-02-30', '2026-03-02').ok, false);
    assert.equal(validateTripDateRange('6974-06-09', '6974-06-09').ok, false);
    assert.equal(validateTripDateRange('2026-08-07', '2026-08-01').ok, false);
});

test('rejects trips longer than the supported planning window', () => {
    const result = validateTripDateRange('2026-01-01', '2026-05-01');
    assert.equal(result.ok, false);
    assert.match(result.error, /최대 90일/);
});

test('returns a normalized valid trip draft', () => {
    const result = validateTripDraft({
        title: '  도쿄   여행 ',
        destinations: ['도쿄, 일본'],
        start: '2026-08-01',
        end: '2026-08-07',
    });
    assert.deepEqual(result, {
        ok: true,
        title: '도쿄 여행',
        destination: '도쿄, 일본',
        start: '2026-08-01',
        end: '2026-08-07',
        daysCount: 7,
    });
});
