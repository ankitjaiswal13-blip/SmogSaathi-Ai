import test from 'node:test';
import assert from 'node:assert/strict';
import { generateIndoorRecommendations } from '../src/services/indoorService.js';

test('generateIndoorRecommendations keeps windows closed when all demo hours are unhealthy (New Delhi)', async () => {
  const result = await generateIndoorRecommendations({
    cityKey: 'delhi',
    mode: 'demo',
    scale: 'cpcb',
    hasPurifier: false,
    cookingFuel: 'gas',
    sensitiveMembers: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDemo, true);
  assert.equal(result.windowPlan.status, 'keep_closed');
  assert.match(result.windowPlan.recommendedHoursEn, /Keep windows closed/i);
  assert.equal(result.cards.length, 5);
  assert.equal(result.checklist.length, 6);
  assert.match(result.cards.find((c) => c.id === 'filtration').summaryEn, /houseplants alone cannot/i);
  assert.match(result.generalDisclaimerEn, /General Guidance Disclaimer/i);
});

test('generateIndoorRecommendations identifies clean ventilation hours in live Open-Meteo mode', async () => {
  const times = Array.from({ length: 24 }, (_, idx) => `2026-11-26T${String(idx).padStart(2, '0')}:00`);
  const usAqi = times.map((_, idx) => (idx >= 13 && idx <= 15 ? 42 : 138));
  const pm25 = times.map((_, idx) => (idx >= 13 && idx <= 15 ? 10.5 : 49.0));

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      timezone: 'Asia/Kolkata',
      current: {
        time: '2026-11-26T10:00',
        us_aqi: 138,
        pm2_5: 49.0,
        pm10: 88.0,
        nitrogen_dioxide: 26.0,
        ozone: 42.0,
        sulphur_dioxide: 10.0,
        carbon_monoxide: 800,
      },
      hourly: {
        time: times,
        us_aqi: usAqi,
        pm2_5: pm25,
        pm10: Array(24).fill(88.0),
        nitrogen_dioxide: Array(24).fill(26.0),
        ozone: Array(24).fill(42.0),
        sulphur_dioxide: Array(24).fill(10.0),
        carbon_monoxide: Array(24).fill(800),
      },
    }),
  });

  const result = await generateIndoorRecommendations({
    cityKey: 'bengaluru',
    mode: 'live',
    scale: 'us',
    hasPurifier: true,
    cookingFuel: 'electric',
    sensitiveMembers: false,
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDemo, false);
  assert.match(result.dataLabel.badgeEn, /LIVE MODELLED/i);
  assert.equal(result.windowPlan.status, 'open_selectively');
  assert.match(result.windowPlan.recommendedHoursEn, /13:00/);
  assert.match(result.cards.find((c) => c.id === 'filtration').badgeEn, /HEPA Active/i);
  assert.match(result.cards.find((c) => c.id === 'kitchen').badgeEn, /Induction/i);
});
