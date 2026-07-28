import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
    MIN_SIDEBAR_WIDTH,
    clampSidebarWidth,
    readSidebarWidth
} from '../js/layout-utils.js';

test('clamps sidebar width to usable desktop bounds', () => {
    assert.equal(clampSidebarWidth(100, 1440), MIN_SIDEBAR_WIDTH);
    assert.equal(clampSidebarWidth(900, 1440), MAX_SIDEBAR_WIDTH);
    assert.equal(clampSidebarWidth(520, 1440), 520);
});

test('keeps enough map space on narrower screens', () => {
    assert.equal(clampSidebarWidth(640, 900), 522);
    assert.equal(clampSidebarWidth(500, 700), 406);
});

test('restores a valid stored width or uses the default', () => {
    assert.equal(readSidebarWidth('510', 1440), 510);
    assert.equal(readSidebarWidth(null, 1440), DEFAULT_SIDEBAR_WIDTH);
    assert.equal(readSidebarWidth('not-a-number', 1440), DEFAULT_SIDEBAR_WIDTH);
});
