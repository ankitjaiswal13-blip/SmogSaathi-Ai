import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRoutinePlan } from '../src/services/routineService.js';

test('generateRoutinePlan warns honestly when all demo windows are unhealthy (New Delhi Demo)', async () => {
  const plan = await generateRoutinePlan({
    cityKey: 'delhi',
    mode: 'demo',
    activityKey: 'jogging',
    preferredTimeKey: 'morning',
    durationMinutes: 45,
    transportKey: 'car_cab',
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.isDemo, true);
  assert.equal(plan.dataType, 'demo');
  assert.equal(plan.allWindowsUnhealthy, true);
  assert.equal(plan.safetyWarning.level, 'danger');
  assert.match(plan.safetyWarning.titleEn, /No Safe Outdoor Window/i);
  assert.match(plan.explanationEn, /All available time windows today remain Unhealthy/i);
  assert.ok(plan.transportAlternatives.tipsEn.some((t) => /Metro|carpool/i.test(t)));
});

test('generateRoutinePlan identifies cleaner afternoon window from live Open-Meteo hourly forecast', async () => {
  const times = Array.from({ length: 24 }, (_, idx) => `2026-11-26T${String(idx).padStart(2, '0')}:00`);
  const usAqi = times.map((_, idx) => (idx >= 13 && idx <= 15 ? 78 : 165));
  const pm25 = times.map((_, idx) => (idx >= 13 && idx <= 15 ? 24.5 : 82.0));

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      timezone: 'Asia/Kolkata',
      current: { time: '2026-11-26T06:15', us_aqi: 165, pm2_5: 82.0 },
      hourly: {
        time: times,
        us_aqi: usAqi,
        pm2_5: pm25,
        pm10: Array(24).fill(95),
        nitrogen_dioxide: Array(24).fill(32),
        ozone: Array(24).fill(45),
      },
    }),
  });

  const plan = await generateRoutinePlan({
    cityKey: 'mumbai',
    mode: 'live',
    activityKey: 'cycling',
    preferredTimeKey: 'morning',
    durationMinutes: 60,
    transportKey: 'cycle',
    fetchImpl: mockFetch,
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.isDemo, false);
  assert.equal(plan.dataType, 'modelled');
  assert.equal(plan.allWindowsUnhealthy, false);
  assert.match(plan.dataLabel.badgeEn, /MODELLED FORECAST/i);
  assert.match(plan.dataLabel.noteEn, /Not an official CPCB ground-station measurement/i);
  assert.equal(plan.bestWindow.startHour, 13);
  assert.match(plan.explanationEn, /70% lower/);
  assert.equal(plan.timeline.length, 18);
  assert.equal(plan.timeline.filter((s) => s.isRecommended).length, 1);
  assert.equal(plan.city.lat, 19.076);
  assert.equal(plan.city.lon, 72.8777);
});

test('generateRoutinePlan highlights exact 2-hour window across midnight and warns when all live slots are unhealthy', async () => {
  const times = Array.from({ length: 24 }, (_, idx) => `2026-11-26T${String(idx).padStart(2, '0')}:00`);
  const usAqi = times.map((_, idx) => (idx >= 21 && idx <= 22 ? 162 : 195));
  const pm25 = times.map((_, idx) => (idx >= 21 && idx <= 22 ? 75.0 : 120.0));

  const mockAllUnhealthy = async (url) => {
    assert.match(url, /latitude=28\.6139/);
    assert.match(url, /longitude=77\.209/);
    return {
      ok: true,
      json: async () => ({
        latitude: 28.6,
        longitude: 77.2,
        timezone: 'Asia/Kolkata',
        current: { time: '2026-11-26T06:00', us_aqi: 195, pm2_5: 120.0 },
        hourly: { time: times, us_aqi: usAqi, pm2_5: pm25 },
      }),
    };
  };

  const plan = await generateRoutinePlan({
    cityKey: 'delhi',
    mode: 'live',
    activityKey: 'walking',
    preferredTimeKey: 'morning',
    durationMinutes: 90,
    transportKey: 'walk',
    fetchImpl: mockAllUnhealthy,
  });

  assert.equal(plan.allWindowsUnhealthy, true);
  assert.equal(plan.safetyWarning.level, 'danger');
  assert.equal(plan.timeline.filter((s) => s.isRecommended).length, 2);
  assert.deepEqual(plan.modelGridCoords, { lat: 28.6, lon: 77.2 });
});

test('generateRoutinePlan never invents missing live hourly values and fails cleanly on empty series', async () => {
  const mockEmptyHourly = async () => ({
    ok: true,
    json: async () => ({
      timezone: 'Asia/Kolkata',
      current: { time: '2026-11-26T10:00' },
      hourly: {
        time: ['2026-11-26T10:00', '2026-11-26T11:00'],
        us_aqi: [null, null],
        pm2_5: [null, null],
      },
    }),
  });

  await assert.rejects(
    () =>
      generateRoutinePlan({
        cityKey: 'delhi',
        mode: 'live',
        fetchImpl: mockEmptyHourly,
      }),
    (err) => err.statusCode === 502 && err.canFallbackToDemo === true
  );
});
