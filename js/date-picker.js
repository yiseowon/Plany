import { validateTripDateRange } from './core.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function pad(value) {
    return String(value).padStart(2, '0');
}

export function toISODate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
        date.getFullYear() !== Number(match[1]) ||
        date.getMonth() !== Number(match[2]) - 1 ||
        date.getDate() !== Number(match[3])
    ) return null;
    return date;
}

export function addDays(value, amount) {
    const date = value instanceof Date ? new Date(value) : parseISODate(value);
    if (!date) return null;
    date.setDate(date.getDate() + amount);
    return date;
}

export function formatDateLabel(value) {
    const date = parseISODate(value);
    if (!date) return { date: '날짜 선택', day: '' };
    return {
        date: `${date.getMonth() + 1}월 ${date.getDate()}일`,
        day: `${DAY_NAMES[date.getDay()]}요일`,
    };
}

export function buildCalendarMonth(year, monthIndex) {
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const lastDate = new Date(year, monthIndex + 1, 0).getDate();
    const cells = Array.from({ length: firstDay }, () => null);
    for (let day = 1; day <= lastDate; day += 1) {
        cells.push(toISODate(new Date(year, monthIndex, day)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function getPresetRange(preset, today = new Date()) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let end = new Date(start);
    if (preset === 'weekend') {
        const daysUntilSaturday = (6 - start.getDay() + 7) % 7;
        start.setDate(start.getDate() + daysUntilSaturday);
        end = addDays(start, 1);
    } else if (preset === '3n4d') {
        end = addDays(start, 3);
    } else if (preset === 'week') {
        end = addDays(start, 6);
    }
    return { start: toISODate(start), end: toISODate(end) };
}

export function createDateRangePicker({ onError = () => {} } = {}) {
    const modal = document.getElementById('date-picker-modal');
    if (!modal) return { syncAll() {} };

    const monthLabel = document.getElementById('calendar-month-label');
    const grid = document.getElementById('calendar-grid');
    const guide = document.getElementById('date-picker-guide');
    const applyButton = document.getElementById('date-picker-apply');
    const summaryStart = modal.querySelector('[data-date-summary="start"] strong');
    const summaryEnd = modal.querySelector('[data-date-summary="end"] strong');
    const controls = [...document.querySelectorAll('[data-date-range]')];
    const now = new Date();
    const today = toISODate(now);

    const state = {
        startId: '',
        endId: '',
        start: '',
        end: '',
        phase: 'start',
        viewYear: now.getFullYear(),
        viewMonth: now.getMonth(),
    };

    function controlFor(startId, endId) {
        return controls.find((control) => control.dataset.startId === startId && control.dataset.endId === endId);
    }

    function syncControl(control) {
        if (!control) return;
        const startValue = document.getElementById(control.dataset.startId)?.value || '';
        const endValue = document.getElementById(control.dataset.endId)?.value || '';
        for (const [role, value] of [['start', startValue], ['end', endValue]]) {
            const button = control.querySelector(`[data-date-role="${role}"]`);
            const formatted = formatDateLabel(value);
            button.querySelector('[data-date-value]').textContent = formatted.date;
            button.querySelector('[data-date-day]').textContent = formatted.day || (role === 'start' ? '여행 시작일' : '여행 마지막 날');
            button.classList.toggle('has-value', Boolean(value));
        }
    }

    function syncAll() {
        controls.forEach(syncControl);
    }

    function updateSummary() {
        const startLabel = formatDateLabel(state.start);
        const endLabel = formatDateLabel(state.end);
        summaryStart.textContent = state.start ? `${startLabel.date} ${startLabel.day}` : '선택 전';
        summaryEnd.textContent = state.end ? `${endLabel.date} ${endLabel.day}` : '선택 전';
        guide.textContent = state.phase === 'start'
            ? '출발일을 선택해주세요.'
            : state.phase === 'end'
                ? '이제 도착일을 선택해주세요.'
                : '기간을 확인하고 선택을 완료해주세요.';
        applyButton.disabled = !(state.start && state.end);
    }

    function renderCalendar() {
        monthLabel.textContent = `${state.viewYear}년 ${state.viewMonth + 1}월`;
        grid.innerHTML = '';
        for (const value of buildCalendarMonth(state.viewYear, state.viewMonth)) {
            if (!value) {
                const blank = document.createElement('span');
                blank.className = 'calendar-blank';
                blank.setAttribute('aria-hidden', 'true');
                grid.appendChild(blank);
                continue;
            }
            const date = parseISODate(value);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'calendar-day';
            button.textContent = String(date.getDate());
            button.dataset.date = value;
            button.setAttribute('role', 'gridcell');
            button.setAttribute('aria-label', `${state.viewYear}년 ${state.viewMonth + 1}월 ${date.getDate()}일 ${DAY_NAMES[date.getDay()]}요일`);
            button.setAttribute('aria-selected', String(value === state.start || value === state.end));
            if (value === today) button.setAttribute('aria-current', 'date');
            button.classList.toggle('is-today', value === today);
            button.classList.toggle('in-range', Boolean(state.start && state.end && value >= state.start && value <= state.end));
            button.classList.toggle('range-start', value === state.start);
            button.classList.toggle('range-end', value === state.end);
            button.addEventListener('click', () => selectDate(value));
            grid.appendChild(button);
        }
        const previous = modal.querySelector('[data-calendar-nav="prev"]');
        const next = modal.querySelector('[data-calendar-nav="next"]');
        previous.disabled = state.viewYear === 2020 && state.viewMonth === 0;
        next.disabled = state.viewYear === 2100 && state.viewMonth === 11;
        updateSummary();
    }

    function selectDate(value) {
        if (state.phase === 'start' || state.phase === 'done') {
            state.start = value;
            state.end = '';
            state.phase = 'end';
        } else if (value < state.start) {
            state.start = value;
            state.end = '';
        } else {
            const validation = validateTripDateRange(state.start, value);
            if (!validation.ok) {
                onError(validation.error);
                return;
            }
            state.end = value;
            state.phase = 'done';
        }
        renderCalendar();
    }

    function openPicker(control, preferredRole) {
        state.startId = control.dataset.startId;
        state.endId = control.dataset.endId;
        state.start = document.getElementById(state.startId)?.value || '';
        state.end = document.getElementById(state.endId)?.value || '';
        state.phase = preferredRole === 'end' && state.start ? 'end' : 'start';
        const baseDate = parseISODate(preferredRole === 'end' ? state.end || state.start : state.start) || now;
        state.viewYear = baseDate.getFullYear();
        state.viewMonth = baseDate.getMonth();
        modal.classList.add('active');
        document.body.classList.add('date-picker-open');
        renderCalendar();
    }

    function closePicker() {
        modal.classList.remove('active');
        document.body.classList.remove('date-picker-open');
    }

    controls.forEach((control) => {
        for (const role of ['start', 'end']) {
            control.querySelector(`[data-date-role="${role}"]`)?.addEventListener('click', () => openPicker(control, role));
        }
    });

    modal.querySelectorAll('[data-date-close]').forEach((button) => button.addEventListener('click', closePicker));
    modal.querySelectorAll('[data-calendar-nav]').forEach((button) => button.addEventListener('click', () => {
        const amount = button.dataset.calendarNav === 'next' ? 1 : -1;
        const nextMonth = new Date(state.viewYear, state.viewMonth + amount, 1);
        state.viewYear = nextMonth.getFullYear();
        state.viewMonth = nextMonth.getMonth();
        renderCalendar();
    }));
    modal.querySelectorAll('[data-date-preset]').forEach((button) => button.addEventListener('click', () => {
        const range = getPresetRange(button.dataset.datePreset, now);
        state.start = range.start;
        state.end = range.end;
        state.phase = 'done';
        const startDate = parseISODate(state.start);
        state.viewYear = startDate.getFullYear();
        state.viewMonth = startDate.getMonth();
        renderCalendar();
    }));

    applyButton.addEventListener('click', () => {
        const validation = validateTripDateRange(state.start, state.end);
        if (!validation.ok) return onError(validation.error);
        const startInput = document.getElementById(state.startId);
        const endInput = document.getElementById(state.endId);
        startInput.value = validation.start;
        endInput.value = validation.end;
        startInput.dispatchEvent(new Event('change', { bubbles: true }));
        endInput.dispatchEvent(new Event('change', { bubbles: true }));
        syncControl(controlFor(state.startId, state.endId));
        closePicker();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closePicker();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('active')) closePicker();
    });

    syncAll();
    return { syncAll, syncControl };
}
