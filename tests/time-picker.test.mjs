import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustTime, formatTimeKorean, normalizeTime } from '../js/time-picker.js';

test('normalizes time values safely', () => {
    assert.equal(normalizeTime('9:05'), '09:05');
    assert.equal(normalizeTime('99:99'), '23:59');
    assert.equal(normalizeTime('bad'), '10:00');
});

test('adjusts time across midnight', () => {
    assert.equal(adjustTime('23:55', 'minute', 5), '00:00');
    assert.equal(adjustTime('00:00', 'hour', -1), '23:00');
});

test('formats Korean 12-hour time labels', () => {
    assert.equal(formatTimeKorean('00:00'), '오전 12:00');
    assert.equal(formatTimeKorean('15:05'), '오후 3:05');
});
