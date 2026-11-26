import test from 'node:test';
import assert from 'node:assert/strict';
import { generateChatReply } from '../src/services/chatService.js';

const SAMPLE_CONTEXT = {
  city: { key: 'delhi', nameEn: 'New Delhi', nameHi: 'नई दिल्ली' },
  scale: 'cpcb',
  isDemo: false,
  aqi: 302,
  category: { labelEn: 'Very Poor', labelHi: 'बहुत खराब' },
  updatedLabelEn: '2026-11-26 14:30 (Asia/Kolkata)',
  updatedLabelHi: '2026-11-26 14:30 (Asia/Kolkata)',
  metrics: { pm25: 45.8, pm10: 47.7 },
  cpcbDetails: { dominantPollutant: 'PM2.5' },
};

test('generateChatReply uses clearly labeled Demo Guidance Engine when API key is missing', async () => {
  const result = await generateChatReply({
    message: 'Which N95 mask should I wear for PM2.5?',
    lang: 'en',
    aqiContext: SAMPLE_CONTEXT,
    config: { geminiApiKey: '' },
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDemoAi, true);
  assert.equal(result.aiMode, 'demo');
  assert.equal(result.topic, 'mask');
  assert.match(result.reply, /New Delhi/);
  assert.match(result.reply, /302 India CPCB AQI/);
  assert.match(result.reply, /Open-Meteo CAMS modelled estimate/);
  assert.match(result.reply, /N95/);
  assert.match(result.reply, /General Guidance Note/);
});

test('generateChatReply responds in Hindi when Hindi language or Devanagari script is used', async () => {
  const result = await generateChatReply({
    message: 'क्या अभी सुबह की सैर करना सुरक्षित है?',
    lang: 'hi',
    aqiContext: SAMPLE_CONTEXT,
    config: { geminiApiKey: '' },
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDemoAi, true);
  assert.equal(result.lang, 'hi');
  assert.equal(result.topic, 'outdoor');
  assert.match(result.reply, /नई दिल्ली/);
  assert.match(result.reply, /302 India CPCB AQI/);
  assert.match(result.reply, /सामान्य मार्गदर्शन नोट/);
});

test('generateChatReply calls server-side Gemini API with x-goog-api-key when configured', async () => {
  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = {};

  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Context: New Delhi (302 CPCB AQI). Prefer metro and N95 masks.' }],
            },
          },
        ],
      }),
    };
  };

  const result = await generateChatReply({
    message: 'How should I commute today?',
    lang: 'en',
    history: [{ role: 'user', text: 'Hi' }],
    aqiContext: SAMPLE_CONTEXT,
    config: { geminiApiKey: 'secret-server-key', geminiModel: 'gemini-2.5-flash' },
    fetchImpl: mockFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDemoAi, false);
  assert.equal(result.aiMode, 'live');
  assert.match(capturedUrl, /gemini-2\.5-flash:generateContent/);
  assert.equal(capturedHeaders['x-goog-api-key'], 'secret-server-key');
  assert.equal(capturedBody.contents.length, 2);
  assert.match(capturedBody.system_instruction.parts[0].text, /302/);
});

test('generateChatReply rejects empty input with HTTP 400 and fails honestly when Gemini errors', async () => {
  await assert.rejects(
    () => generateChatReply({ message: '   ', config: {} }),
    (err) => err.statusCode === 400
  );

  await assert.rejects(
    () =>
      generateChatReply({
        message: 'Is indoor air safe?',
        config: { geminiApiKey: 'secret-server-key' },
        fetchImpl: async () => ({ ok: false, status: 503 }),
      }),
    (err) => err.statusCode === 502 && /503/.test(err.message)
  );
});
