const VALID_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function sortPlacesByTime(places = []) {
    return places
        .map((place, index) => ({ place, index }))
        .sort((a, b) => {
            const aTime = VALID_TIME.test(a.place?.time || '') ? a.place.time : '99:99';
            const bTime = VALID_TIME.test(b.place?.time || '') ? b.place.time : '99:99';
            return aTime.localeCompare(bTime) || a.index - b.index;
        })
        .map(({ place }) => place);
}

export function getTripDate(startDate, dayIndex = 0) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate || '');
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(dayIndex || 0));
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

export function buildTransitDeparture(startDate, dayIndex, time, now = new Date()) {
    const tripDate = getTripDate(startDate, dayIndex);
    const normalizedTime = VALID_TIME.test(time || '') ? time : '10:00';
    const [hour, minute] = normalizedTime.split(':').map(Number);
    const requested = tripDate || new Date(now);
    requested.setHours(hour, minute, 0, 0);
    const minimum = new Date(now.getTime() + 5 * 60 * 1000);
    const adjusted = requested <= minimum;
    return {
        requested,
        queryDate: adjusted ? minimum : requested,
        adjusted,
    };
}

function readCoordinate(value, owner) {
    if (typeof value === 'function') return Number(value.call(owner));
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

export function readStop(stop = {}) {
    const location = stop.location || {};
    const lat = readCoordinate(location.lat, location);
    const lng = readCoordinate(location.lng, location);
    return {
        name: stop.name || '정류장 정보 없음',
        location: lat === null || lng === null ? null : { lat, lng },
    };
}

export function parseLegacyTransitRoute(route = {}) {
    const leg = route.legs?.[0] || {};
    const segments = (leg.steps || []).map((step) => {
        const mode = String(step.travel_mode || '').toUpperCase();
        if (mode !== 'TRANSIT') {
            return {
                mode: 'WALKING',
                duration: step.duration?.text || '',
                distance: step.distance?.text || '',
                instructions: step.instructions || '',
            };
        }
        const transit = step.transit || step.transit_details || {};
        const line = transit.line || {};
        return {
            mode: 'TRANSIT',
            vehicle: line.vehicle?.name || line.vehicle?.type || '대중교통',
            vehicleType: line.vehicle?.type || '',
            lineName: line.short_name || line.name || transit.trip_short_name || '노선 정보 없음',
            lineFullName: line.name || '',
            tripName: transit.trip_short_name || '',
            color: /^#[0-9a-f]{6}$/i.test(line.color || '') ? line.color : '#0a84ff',
            textColor: /^#[0-9a-f]{6}$/i.test(line.text_color || '') ? line.text_color : '#ffffff',
            headsign: transit.headsign || '',
            departureStop: readStop(transit.departure_stop),
            arrivalStop: readStop(transit.arrival_stop),
            departureTime: transit.departure_time?.text || '',
            arrivalTime: transit.arrival_time?.text || '',
            stops: Number.isFinite(Number(transit.num_stops)) ? Number(transit.num_stops) : null,
            headwayMinutes: transit.headway ? Math.round(Number(transit.headway) / 60) : null,
            duration: step.duration?.text || '',
            distance: step.distance?.text || '',
            agency: line.agencies?.[0]?.name || '',
        };
    });
    const transitSegments = segments.filter((segment) => segment.mode === 'TRANSIT');
    return {
        startAddress: leg.start_address || '',
        endAddress: leg.end_address || '',
        departureTime: leg.departure_time?.text || transitSegments[0]?.departureTime || '',
        arrivalTime: leg.arrival_time?.text || transitSegments.at(-1)?.arrivalTime || '',
        duration: leg.duration?.text || '',
        distance: leg.distance?.text || '',
        fare: route.fare?.text || '',
        transfers: Math.max(0, transitSegments.length - 1),
        segments,
        warnings: Array.isArray(route.warnings) ? route.warnings : [],
        copyrights: route.copyrights || '',
    };
}

function formatClock(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseModernTransitRoute(route = {}) {
    const leg = route.legs?.[0] || {};
    const segments = (leg.steps || []).map((step) => {
        const transit = step.transitDetails;
        if (!transit) {
            return {
                mode: 'WALKING',
                duration: step.localizedValues?.staticDuration || '',
                distance: step.localizedValues?.distance || '',
                instructions: step.instructions || '',
            };
        }
        const line = transit.transitLine || {};
        return {
            mode: 'TRANSIT',
            vehicle: line.vehicle?.name || line.vehicle?.vehicleType || '대중교통',
            vehicleType: line.vehicle?.vehicleType || '',
            lineName: line.shortName || line.name || transit.tripShortText || '노선 정보 없음',
            lineFullName: line.name || '',
            tripName: transit.tripShortText || '',
            color: /^#[0-9a-f]{6}$/i.test(line.color || '') ? line.color : '#0a84ff',
            textColor: /^#[0-9a-f]{6}$/i.test(line.textColor || '') ? line.textColor : '#ffffff',
            headsign: transit.headsign || '',
            departureStop: readStop(transit.departureStop),
            arrivalStop: readStop(transit.arrivalStop),
            departureTime: formatClock(transit.departureTime),
            arrivalTime: formatClock(transit.arrivalTime),
            stops: Number.isFinite(Number(transit.stopCount)) ? Number(transit.stopCount) : null,
            headwayMinutes: transit.headwayMillis ? Math.round(Number(transit.headwayMillis) / 60000) : null,
            duration: step.localizedValues?.staticDuration || '',
            distance: step.localizedValues?.distance || '',
            agency: line.agencies?.[0]?.name || '',
        };
    });
    const transitSegments = segments.filter((segment) => segment.mode === 'TRANSIT');
    return {
        startAddress: '',
        endAddress: '',
        departureTime: transitSegments[0]?.departureTime || '',
        arrivalTime: transitSegments.at(-1)?.arrivalTime || '',
        duration: route.localizedValues?.duration || leg.localizedValues?.duration || '',
        distance: route.localizedValues?.distance || leg.localizedValues?.distance || '',
        fare: route.localizedValues?.transitFare || '',
        transfers: Math.max(0, transitSegments.length - 1),
        segments,
        warnings: Array.isArray(route.warnings) ? route.warnings : [],
        copyrights: route.copyrights || '',
    };
}

export function formatKoreanRouteDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
