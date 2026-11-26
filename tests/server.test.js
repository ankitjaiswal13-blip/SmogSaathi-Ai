import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server.js';

async function startTestServer(options = {}) {
  const server = createAppServer({
    config: {
      port: 0,
      geminiApiKey: 'test-secret-do-not-leak',
      geminiModel: 'gemini-2.5-flash',
      defaultAqiMode: 'demo',
    },
    ...options,
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { server, baseUrl };
}

test('GET / serves homepage with US AQI & India CPCB scale selector', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');

    const html = await res.text();
    assert.match(html, /data-scale="us"/);
    assert.match(html, /data-scale="cpcb"/);
    assert.match(html, /id="aqi-observed"/);
    assert.match(html, /id="refresh-aqi-btn"/);
  } finally {
    server.close();
  }
});

test('GET /api/health reports readiness without leaking API keys', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.ok, true);
    assert.equal(body.aiConfigured, true);
    assert.equal(JSON.stringify(body).includes('test-secret-do-not-leak'), false);
  } finally {
    server.close();
  }
});

test('GET /api/aqi separates US AQI and India CPCB AQI in demo mode', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const usRes = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=demo&scale=us`);
    const cpcbRes = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=demo&scale=cpcb`);
    assert.equal(usRes.status, 200);
    assert.equal(cpcbRes.status, 200);

    const usBody = await usRes.json();
    const cpcbBody = await cpcbRes.json();

    assert.equal(usBody.scale, 'us');
    assert.equal(usBody.aqi, 196);
    assert.equal(usBody.category.labelEn, 'Unhealthy');

    assert.equal(cpcbBody.scale, 'cpcb');
    assert.equal(cpcbBody.aqi, 317);
    assert.equal(cpcbBody.category.labelEn, 'Very Poor');
    assert.equal(cpcbBody.cpcbDetails.dominantPollutant, 'PM2.5');
    assert.notEqual(usBody.aqi, cpcbBody.aqi);
  } finally {
    server.close();
  }
});

test('GET /api/aqi?mode=live computes trailing-window CPCB AQI separately from US AQI', async () => {
  const times = Array.from({ length: 24 }, (_, idx) => {
    const hour = String(idx).padStart(2, '0');
    return `2026-11-26T${hour}:00`;
  });

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      timezone: 'Asia/Kolkata',
      current: {
        time: '2026-11-26T23:15',
        us_aqi: 155,
        pm2_5: 75.0,
        pm10: 140.0,
        nitrogen_dioxide: 42.0,
        ozone: 38.0,
        sulphur_dioxide: 12.0,
        carbon_monoxide: 1500, // 1.5 mg/m3
      },
      hourly: {
        time: times,
        pm2_5: Array(24).fill(75.0),
        pm10: Array(24).fill(140.0),
        nitrogen_dioxide: Array(24).fill(42.0),
        ozone: Array(24).fill(38.0),
        sulphur_dioxide: Array(24).fill(12.0),
        carbon_monoxide: Array(24).fill(1500),
      },
    }),
  });

  const { server, baseUrl } = await startTestServer({ fetchImpl: mockFetch });
  try {
    const usRes = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=live&scale=us`);
    const cpcbRes = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=live&scale=cpcb`);

    const usBody = await usRes.json();
    const cpcbBody = await cpcbRes.json();

    assert.equal(usRes.status, 200);
    assert.equal(usBody.isDemo, false);
    assert.equal(usBody.aqi, 155);
    assert.equal(usBody.observedAt, '2026-11-26T23:15');
    assert.equal(usBody.metrics.coMg, 1.5);

    assert.equal(cpcbRes.status, 200);
    assert.equal(cpcbBody.isDemo, false);
    assert.equal(cpcbBody.scale, 'cpcb');
    // PM2.5 = 75 -> (75 - 60) * 100 / 30 + 100 = 150 (Moderately Polluted)
    assert.equal(cpcbBody.aqi, 150);
    assert.equal(cpcbBody.category.labelEn, 'Moderately Polluted');
    assert.equal(cpcbBody.cpcbDetails.dominantPollutant, 'PM2.5');
    assert.notEqual(usBody.aqi, cpcbBody.aqi);
  } finally {
    server.close();
  }
});

test('GET /api/aqi rejects invalid scale/city and returns 502 on live failure without fabricating data', async () => {
  const failingFetch = async () => {
    throw new Error('Network unreachable');
  };

  const { server, baseUrl } = await startTestServer({ fetchImpl: failingFetch });
  try {
    const badCity = await fetch(`${baseUrl}/api/aqi?city=atlantis&mode=demo&scale=us`);
    assert.equal(badCity.status, 400);

    const badScale = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=demo&scale=eu`);
    assert.equal(badScale.status, 400);

    const liveFail = await fetch(`${baseUrl}/api/aqi?city=delhi&mode=live&scale=cpcb`);
    assert.equal(liveFail.status, 502);
    const failBody = await liveFail.json();
    assert.equal(failBody.ok, false);
    assert.equal(failBody.canFallbackToDemo, true);
  } finally {
    server.close();
  }
});

test('POST /api/chat returns bilingual demo guidance without leaking secrets and validates input', async () => {
  const { server, baseUrl } = await startTestServer({
    config: {
      port: 0,
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      defaultAqiMode: 'demo',
    },
  });

  try {
    const emptyRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    assert.equal(emptyRes.status, 400);

    const hiRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'घर के अंदर वायु प्रदूषण कम कैसे करें?',
        lang: 'hi',
        aqiContext: {
          city: { key: 'delhi', nameEn: 'New Delhi', nameHi: 'नई दिल्ली' },
          scale: 'cpcb',
          isDemo: true,
          aqi: 317,
          category: { labelEn: 'Very Poor', labelHi: 'बहुत खराब' },
        },
      }),
    });

    assert.equal(hiRes.status, 200);
    const body = await hiRes.json();
    assert.equal(body.ok, true);
    assert.equal(body.isDemoAi, true);
    assert.equal(body.lang, 'hi');
    assert.match(body.reply, /नई दिल्ली/);
    assert.match(body.reply, /317 India CPCB AQI/);
  } finally {
    server.close();
  }
});

test('POST /api/routine returns personalized plan and validates activity/transport inputs', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const badRes = await fetch(`${baseUrl}/api/routine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'bengaluru', mode: 'demo', activity: 'skydiving' }),
    });
    assert.equal(badRes.status, 400);

    const okRes = await fetch(`${baseUrl}/api/routine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'bengaluru',
        mode: 'demo',
        activity: 'office_commute',
        preferredTime: 'morning',
        durationMinutes: 30,
        transportMode: 'car_cab',
      }),
    });
    assert.equal(okRes.status, 200);
    const body = await okRes.json();
    assert.equal(body.ok, true);
    assert.equal(body.isDemo, true);
    assert.equal(body.allWindowsUnhealthy, false);
    assert.ok(body.bestWindow.label);
    assert.ok(body.transportAlternatives.tipsEn.length >= 2);
    assert.ok(body.transportAlternatives.tipsHi.length >= 2);
  } finally {
    server.close();
  }
});

test('POST /api/indoor returns indoor cards, checklist, and validates city/mode', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const badRes = await fetch(`${baseUrl}/api/indoor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'unknown', mode: 'demo' }),
    });
    assert.equal(badRes.status, 400);

    const okRes = await fetch(`${baseUrl}/api/indoor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'bengaluru',
        mode: 'demo',
        scale: 'cpcb',
        hasPurifier: true,
        cookingFuel: 'gas',
        sensitiveMembers: true,
      }),
    });
    assert.equal(okRes.status, 200);
    const body = await okRes.json();
    assert.equal(body.ok, true);
    assert.equal(body.isDemo, true);
    assert.equal(body.cards.length, 5);
    assert.equal(body.checklist.length, 6);
    assert.ok(body.windowPlan.recommendedHoursHi);
  } finally {
    server.close();
  }
});

test('Directory traversal outside public/ is blocked', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/../package.json`);
    assert.ok(res.status === 403 || res.status === 404);
  } finally {
    server.close();
  }
});
