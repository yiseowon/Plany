import test from 'node:test';
import assert from 'node:assert/strict';

import {
    addDays,
    buildCalendarMonth,
    formatDateLabel,
    parseISODate,
    toISODate,
} from '../js/date-picker.js';

test('formats Korean date labels without browser locale differences', () => {
    assert.deepEqual(formatDateLabel('2026-08-01'), { date: '8월 1일', day: '토요일' });
});

test('parses only real ISO calendar dates', () => {
    assert.equal(parseISODate('2026-02-30'), null);
    assert.equal(toISODate(parseISODate('2028-02-29')), '2028-02-29');
});

test('adds days across month and year boundaries', () => {
    assert.equal(toISODate(addDays('2026-12-31', 1)), '2027-01-01');
});

test('builds a complete calendar grid by full weeks', () => {
    const august = buildCalendarMonth(2026, 7);
    assert.equal(august.length % 7, 0);
    assert.equal(august.filter(Boolean).length, 31);
    assert.equal(august.find(Boolean), '2026-08-01');
});
