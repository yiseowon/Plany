const CLIENT_PATTERN = /^ca-pub-\d{10,}$/;
const SLOT_PATTERN = /^\d{6,}$/;

export function initializeAds(config = {}) {
    const slots = [...document.querySelectorAll('[data-ad-slot]')];
    if (!config.enabled || !CLIENT_PATTERN.test(config.client || '')) {
        slots.forEach((slot) => { slot.hidden = true; });
        return { enabled: false, reason: 'disabled-or-unconfigured' };
    }

    const configured = slots.filter((container) => SLOT_PATTERN.test(container.dataset.adSlot || ''));
    if (!configured.length) return { enabled: false, reason: 'missing-slots' };

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.client)}`;
    document.head.appendChild(script);
    script.addEventListener('load', () => configured.forEach((container) => {
        container.hidden = false;
        const ad = document.createElement('ins');
        ad.className = 'adsbygoogle';
        ad.style.display = 'block';
        ad.dataset.adClient = config.client;
        ad.dataset.adSlot = container.dataset.adSlot;
        ad.dataset.adFormat = 'auto';
        ad.dataset.fullWidthResponsive = 'true';
        container.appendChild(ad);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    }));
    return { enabled: true };
}
