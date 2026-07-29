import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleTransitUrl, buildTransitDeparture, parseLegacyTransitRoute, parseModernTransitRoute, sortPlacesByTime } from '../js/route-utils.js';

test('builds official Google transit URLs for embedded and full map fallbacks', () => {
    const input = { origin: { lat: 35.681236, lng: 139.767125 }, destination: { lat: 35.658034, lng: 139.701636 } };
    const embedded = new URL(buildGoogleTransitUrl({ ...input, apiKey: 'public-browser-key', embed: true }));
    assert.equal(embedded.pathname, '/maps/embed/v1/directions');
    assert.equal(embedded.searchParams.get('mode'), 'transit');
    assert.equal(embedded.searchParams.get('origin'), '35.681236,139.767125');
    assert.equal(embedded.searchParams.get('destination'), '35.658034,139.701636');
    const fullMap = new URL(buildGoogleTransitUrl(input));
    assert.equal(fullMap.searchParams.get('travelmode'), 'transit');
    assert.equal(fullMap.searchParams.get('dir_action'), 'navigate');
});

test('sorts places chronologically and keeps equal times stable', () => {
    const places = [{ id: 1, time: '18:00' }, { id: 2, time: '10:00' }, { id: 3, time: '10:00' }, { id: 4, time: '' }];
    assert.deepEqual(sortPlacesByTime(places).map(p => p.id), [2, 3, 1, 4]);
});

test('uses the actual trip day for future transit requests', () => {
    const result = buildTransitDeparture('2026-08-10', 2, '14:30', new Date(2026, 6, 28, 12, 0));
    assert.equal(result.adjusted, false);
    assert.equal(result.queryDate.getFullYear(), 2026);
    assert.equal(result.queryDate.getMonth(), 7);
    assert.equal(result.queryDate.getDate(), 12);
    assert.equal(result.queryDate.getHours(), 14);
    assert.equal(result.queryDate.getMinutes(), 30);
});

test('moves past transit requests to a valid near-future time', () => {
    const now = new Date(2026, 6, 28, 12, 0);
    const result = buildTransitDeparture('2026-07-01', 0, '09:00', now);
    assert.equal(result.adjusted, true);
    assert.equal(result.queryDate.getTime(), now.getTime() + 300000);
});

test('keeps transit requests inside the API 100-day schedule window', () => {
    const now = new Date(2026, 6, 28, 10, 0, 0);
    const result = buildTransitDeparture('2027-12-01', 0, '09:00', now);
    assert.equal(result.adjustment, 'future');
    assert.equal(result.adjusted, true);
    assert.ok(result.queryDate > now);
    assert.ok(result.queryDate <= new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000));
});

test('parses line, vehicle, stops, station coordinates and fare', () => {
    const route = {
        fare: { text: '¥210' },
        warnings: ['보행로 주의'],
        legs: [{
            duration: { text: '24분' }, distance: { text: '6.2km' },
            departure_time: { text: '오전 10:05' }, arrival_time: { text: '오전 10:29' },
            steps: [{ travel_mode: 'TRANSIT', duration: { text: '15분' }, transit: {
                departure_stop: { name: '시부야역', location: { lat: () => 35.658, lng: () => 139.701 } },
                arrival_stop: { name: '신주쿠역', location: { lat: () => 35.69, lng: () => 139.7 } },
                departure_time: { text: '오전 10:08' }, arrival_time: { text: '오전 10:23' },
                headsign: '신주쿠 방면', num_stops: 4, trip_short_name: '1024',
                line: { short_name: 'JR Yamanote', name: '야마노테선', vehicle: { name: '기차', type: 'HEAVY_RAIL' }, agencies: [{ name: 'JR East' }] }
            }}]
        }]
    };
    const parsed = parseLegacyTransitRoute(route);
    assert.equal(parsed.fare, '¥210');
    assert.equal(parsed.transfers, 0);
    assert.equal(parsed.segments[0].lineName, 'JR Yamanote');
    assert.equal(parsed.segments[0].tripName, '1024');
    assert.equal(parsed.segments[0].departureStop.name, '시부야역');
    assert.deepEqual(parsed.segments[0].departureStop.location, { lat: 35.658, lng: 139.701 });
});

test('parses modern Route class transit data', () => {
    const route = {
        localizedValues: { duration: '31분', distance: '12.4km', transitFare: '₩1,500' },
        warnings: ['보행 구간을 확인하세요'],
        legs: [{ steps: [{
            travelMode: 'TRANSIT', localizedValues: { staticDuration: '18분', distance: '8km' },
            transitDetails: {
                departureStop: { name: '광화문', location: { lat: 37.57, lng: 126.976 } },
                arrivalStop: { name: '강남역', location: { lat: 37.498, lng: 127.027 } },
                departureTime: new Date(2026, 7, 1, 9, 10), arrivalTime: new Date(2026, 7, 1, 9, 28),
                headsign: '강남 방면', headwayMillis: 300000, stopCount: 8, tripShortText: '버스-42',
                transitLine: { shortName: '470', name: '간선 470', color: '#1565c0', textColor: '#ffffff', vehicle: { name: '버스', vehicleType: 'BUS' }, agencies: [{ name: '서울시버스' }] }
            }
        }] }]
    };
    const parsed = parseModernTransitRoute(route);
    assert.equal(parsed.duration, '31분');
    assert.equal(parsed.fare, '₩1,500');
    assert.equal(parsed.segments[0].lineName, '470');
    assert.equal(parsed.segments[0].headwayMinutes, 5);
    assert.equal(parsed.segments[0].departureTime, '09:10');
});
