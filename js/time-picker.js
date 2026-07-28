export function normalizeTime(value = '10:00') {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) return '10:00';
    const hour = Math.min(23, Math.max(0, Number(match[1])));
    const minute = Math.min(59, Math.max(0, Number(match[2])));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function adjustTime(value, unit, amount) {
    const [hour, minute] = normalizeTime(value).split(':').map(Number);
    const total = (hour * 60 + minute + (unit === 'hour' ? amount * 60 : amount) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function formatTimeKorean(value) {
    const [hour, minute] = normalizeTime(value).split(':').map(Number);
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour % 12 || 12;
    return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
}

export function createTimePicker({ onOpen, onClose } = {}) {
    const modal = document.getElementById('time-picker-modal');
    if (!modal) return { syncAll() {} };
    let target = null;
    let draft = '10:00';

    const render = () => {
        const [hour, minute] = draft.split(':');
        document.getElementById('time-hour').textContent = hour;
        document.getElementById('time-minute').textContent = minute;
        document.getElementById('time-period').textContent = Number(hour) < 12 ? '오전' : '오후';
        document.getElementById('time-display-value').textContent = `${Number(hour) % 12 || 12}:${minute}`;
    };
    const sync = (input) => {
        const trigger = document.querySelector(`[data-time-trigger="${input.id}"]`);
        const label = trigger?.querySelector('[data-time-label]');
        if (label) label.textContent = input.value ? formatTimeKorean(input.value) : '시간 선택';
    };
    const close = () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        onClose?.();
    };

    document.querySelectorAll('[data-time-trigger]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            target = document.getElementById(trigger.dataset.timeTrigger);
            if (!target) return;
            draft = normalizeTime(target.value || '10:00');
            render();
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            onOpen?.();
        });
    });
    modal.querySelectorAll('[data-time-adjust]').forEach((button) => button.addEventListener('click', () => {
        const [unit, amount] = button.dataset.timeAdjust.split(':');
        draft = adjustTime(draft, unit, Number(amount));
        render();
    }));
    modal.querySelectorAll('[data-time-value]').forEach((button) => button.addEventListener('click', () => {
        draft = normalizeTime(button.dataset.timeValue);
        render();
    }));
    modal.querySelectorAll('[data-time-close]').forEach((button) => button.addEventListener('click', close));
    document.getElementById('time-picker-apply')?.addEventListener('click', () => {
        if (!target) return close();
        target.value = draft;
        target.dispatchEvent(new Event('change', { bubbles: true }));
        sync(target);
        close();
    });
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });

    return {
        syncAll() { document.querySelectorAll('[data-time-trigger]').forEach((trigger) => { const input = document.getElementById(trigger.dataset.timeTrigger); if (input) sync(input); }); },
        close
    };
}
