import { CITIES, buildDemoHourlySeries, classifyUsAqi } from '../data/demoAqi.js';
import { calculateCpcbAqi } from './cpcbAqi.js';

const OPEN_METEO_AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const round1 = (val) => (typeof val === 'number' && Number.isFinite(val) ? Math.round(val * 10) / 10 : null);
const round2 = (val) => (typeof val === 'number' && Number.isFinite(val) ? Math.round(val * 100) / 100 : null);

/**
 * Shared Open-Meteo Air Quality API fetch helper reused across AQI Dashboard and Routine Planner.
 */
export async function fetchOpenMeteoPayload(city, fetchImpl = fetch) {
  const url = new URL(OPEN_METEO_AQ_URL);
  url.searchParams.set('latitude', String(city.lat));
  url.searchParams.set('longitude', String(city.lon));
  url.searchParams.set(
    'current',
    'us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide'
  );
  url.searchParams.set(
    'hourly',
    'us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide'
  );
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', 'auto');

  const response = await fetchImpl(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Returns the list of supported cities for dropdowns and API consumers.
 */
export function getCityOptions() {
  return Object.values(CITIES).map(({ key, nameEn, nameHi, lat, lon }) => ({
    key,
    nameEn,
    nameHi,
    lat,
    lon,
  }));
}

/**
 * Computes a trailing N-hour average ending at targetIndex from an Open-Meteo hourly array.
 * Returns { avg, count } with null avg if no valid values exist in the window.
 */
function trailingAverage(series, targetIndex, hours) {
  if (!Array.isArray(series) || targetIndex < 0) {
    return { avg: null, count: 0 };
  }

  const start = Math.max(0, targetIndex - hours + 1);
  let sum = 0;
  let count = 0;

  for (let i = start; i <= targetIndex && i < series.length; i += 1) {
    const val = series[i];
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      sum += val;
      count += 1;
    }
  }

  return {
    avg: count > 0 ? sum / count : null,
    count,
  };
}

/**
 * Extracts CPCB averaging inputs from Open-Meteo hourly history when available,
 * converting CO from µg/m³ to mg/m³ as required by CPCB breakpoints.
 */
function buildLiveCpcbInputs(payload) {
  const current = payload?.current || {};
  const hourly = payload?.hourly;
  const times = hourly?.time;

  if (!Array.isArray(times) || times.length === 0 || !current.time) {
    return {
      concentrations: {
        pm25: current.pm2_5 ?? null,
        pm10: current.pm10 ?? null,
        no2: current.nitrogen_dioxide ?? null,
        o3: current.ozone ?? null,
        so2: current.sulphur_dioxide ?? null,
        co: typeof current.carbon_monoxide === 'number' ? current.carbon_monoxide / 1000 : null,
      },
      averagingMode: 'instantaneous',
      averagingNoteEn:
        'Computed from current hourly snapshot (24h/8h trailing window unavailable in API response).',
      averagingNoteHi:
        'वर्तमान प्रति-घंटा स्नैपशॉट से गणना (API में 24h/8h पिछला औसत उपलब्ध नहीं था)।',
    };
  }

  // Open-Meteo current.time can be on the quarter-hour (e.g. "2026-11-26T14:45") while hourly is ":00".
  const currentHourPrefix = String(current.time).slice(0, 13);
  let targetIndex = times.findIndex((t) => String(t).startsWith(currentHourPrefix));
  if (targetIndex === -1) {
    // Fallback to the last hourly entry <= current.time
    for (let i = times.length - 1; i >= 0; i -= 1) {
      if (String(times[i]) <= String(current.time)) {
        targetIndex = i;
        break;
      }
    }
  }
  if (targetIndex === -1) {
    targetIndex = times.length - 1;
  }

  const pm25Win = trailingAverage(hourly.pm2_5, targetIndex, 24);
  const pm10Win = trailingAverage(hourly.pm10, targetIndex, 24);
  const no2Win = trailingAverage(hourly.nitrogen_dioxide, targetIndex, 24);
  const so2Win = trailingAverage(hourly.sulphur_dioxide, targetIndex, 24);
  const o3Win = trailingAverage(hourly.ozone, targetIndex, 8);
  const coUgWin = trailingAverage(hourly.carbon_monoxide, targetIndex, 8);

  return {
    concentrations: {
      pm25: pm25Win.avg ?? current.pm2_5 ?? null,
      pm10: pm10Win.avg ?? current.pm10 ?? null,
      no2: no2Win.avg ?? current.nitrogen_dioxide ?? null,
      o3: o3Win.avg ?? current.ozone ?? null,
      so2: so2Win.avg ?? current.sulphur_dioxide ?? null,
      co:
        coUgWin.avg !== null
          ? coUgWin.avg / 1000
          : typeof current.carbon_monoxide === 'number'
            ? current.carbon_monoxide / 1000
            : null,
    },
    averagingMode: 'trailing_window',
    coverage: {
      pm25Hours: pm25Win.count,
      pm10Hours: pm10Win.count,
      no2Hours: no2Win.count,
      so2Hours: so2Win.count,
      o3Hours: o3Win.count,
      coHours: coUgWin.count,
    },
    averagingNoteEn: `Computed via CPCB breakpoints using Open-Meteo trailing averages (up to ${pm25Win.count}h for PM/NO₂/SO₂, ${o3Win.count}h for O₃/CO). NH₃ & Pb are not provided by Open-Meteo.`,
    averagingNoteHi: `Open-Meteo के पिछले घंटों के औसत (${pm25Win.count}h PM/NO₂/SO₂, ${o3Win.count}h O₃/CO) से CPCB नियमों द्वारा गणना। Open-Meteo में NH₃ व Pb उपलब्ध नहीं हैं।`,
  };
}

function formatScaleResponse({
  city,
  isDemo,
  scale,
  provider,
  scenarioEn,
  scenarioHi,
  disclaimerEn,
  disclaimerHi,
  observedAt,
  timezone,
  updatedLabelEn,
  updatedLabelHi,
  metrics,
  usAqiValue,
  cpcbResult,
  averagingNoteEn,
  averagingNoteHi,
}) {
  const isCpcb = scale === 'cpcb';
  const aqi = isCpcb ? cpcbResult.aqi : usAqiValue;
  const category = isCpcb ? cpcbResult.category : classifyUsAqi(usAqiValue);

  return {
    ok: true,
    city: {
      key: city.key,
      nameEn: city.nameEn,
      nameHi: city.nameHi,
      lat: city.lat,
      lon: city.lon,
    },
    scale,
    scaleMeta: isCpcb
      ? {
          code: 'cpcb',
          labelEn: 'India CPCB AQI (NAQI)',
          labelHi: 'भारत CPCB AQI (NAQI)',
          unitLabel: 'CPCB AQI',
          rangeLabel: '0–500',
        }
      : {
          code: 'us',
          labelEn: 'US EPA AQI',
          labelHi: 'US EPA AQI',
          unitLabel: 'US AQI',
          rangeLabel: '0–500',
        },
    isDemo,
    sourceType: isDemo ? 'demo' : 'live',
    provider,
    scenarioEn,
    scenarioHi,
    disclaimerEn,
    disclaimerHi,
    observedAt,
    timezone,
    updatedLabelEn,
    updatedLabelHi,
    fetchedAt: new Date().toISOString(),
    metrics,
    aqi,
    category,
    cpcbDetails: {
      eligible: cpcbResult.eligible,
      aqi: cpcbResult.aqi,
      dominantPollutant: cpcbResult.dominantPollutant,
      dominantSubIndex: cpcbResult.dominantSubIndex ?? null,
      pollutantCount: cpcbResult.pollutantCount,
      subIndices: cpcbResult.subIndices,
      averagingNoteEn,
      averagingNoteHi,
      reasonEn: cpcbResult.reasonEn || null,
      reasonHi: cpcbResult.reasonHi || null,
    },
  };
}

function buildDemoReport(city, scale) {
  const { demo } = city;
  const cpcbResult = calculateCpcbAqi({
    pm25: demo.pm25,
    pm10: demo.pm10,
    no2: demo.no2,
    o3: demo.o3,
    so2: demo.so2,
    co: demo.coMg,
  });

  return formatScaleResponse({
    city,
    isDemo: true,
    scale,
    provider: 'SmogSaathi Demo Dataset (Illustrative Only)',
    scenarioEn: demo.scenarioEn,
    scenarioHi: demo.scenarioHi,
    disclaimerEn: 'DEMO DATA ONLY — Illustrative preset for testing, not a live sensor reading.',
    disclaimerHi: 'केवल डेमो डेटा — यह परीक्षण के लिए नमूना डेटा है, लाइव सेंसर रीडिंग नहीं।',
    observedAt: null,
    timezone: 'Asia/Kolkata',
    updatedLabelEn: demo.updatedLabelEn,
    updatedLabelHi: demo.updatedLabelHi,
    metrics: {
      usAqi: demo.usAqi,
      pm25: demo.pm25,
      pm10: demo.pm10,
      no2: demo.no2,
      o3: demo.o3,
      so2: demo.so2,
      coMg: demo.coMg,
    },
    usAqiValue: demo.usAqi,
    cpcbResult,
    averagingNoteEn:
      'Calculated using official CPCB breakpoints across 6 preset demo pollutants (PM2.5, PM10, NO₂, O₃, SO₂, CO).',
    averagingNoteHi:
      '6 नमूना प्रदूषकों (PM2.5, PM10, NO₂, O₃, SO₂, CO) पर आधिकारिक CPCB नियमों से गणना।',
  });
}

/**
 * Fetches live air-quality measurements from Open-Meteo's public Air Quality API.
 * Never fabricates fallback numbers on failure.
 */
async function fetchLiveReport(city, scale, fetchImpl = fetch) {
  const payload = await fetchOpenMeteoPayload(city, fetchImpl);
  const current = payload?.current;
  if (!current || typeof current.pm2_5 !== 'number') {
    throw new Error('Live air-quality response was missing current pollutant readings.');
  }

  const usAqiValue = typeof current.us_aqi === 'number' ? Math.round(current.us_aqi) : null;
  if (scale === 'us' && usAqiValue === null) {
    throw new Error('Live air-quality response did not include US AQI.');
  }

  const cpcbInput = buildLiveCpcbInputs(payload);
  const cpcbResult = calculateCpcbAqi(cpcbInput.concentrations);

  if (scale === 'cpcb' && !cpcbResult.eligible) {
    throw new Error(cpcbResult.reasonEn);
  }

  const coMg =
    typeof current.carbon_monoxide === 'number' ? round2(current.carbon_monoxide / 1000) : null;

  const observedAt = current.time || null;
  const timezone = payload.timezone || 'Local time';

  return formatScaleResponse({
    city,
    isDemo: false,
    scale,
    provider: 'Open-Meteo Air Quality API (CAMS Model)',
    scenarioEn:
      scale === 'cpcb'
        ? 'Live Pollutants • India CPCB Breakpoint Calculation'
        : 'Live API Reading • US EPA AQI Scale',
    scenarioHi:
      scale === 'cpcb'
        ? 'लाइव प्रदूषक • भारत CPCB ब्रेकपॉइंट गणना'
        : 'लाइव API रीडिंग • US EPA AQI पैमाना',
    disclaimerEn:
      scale === 'cpcb'
        ? 'LIVE DATA (CPCB SCALE) — Computed from Open-Meteo pollutant concentrations using official CPCB breakpoints.'
        : 'LIVE DATA (US SCALE) — Modeled/observed US AQI reading from Open-Meteo Air Quality API.',
    disclaimerHi:
      scale === 'cpcb'
        ? 'लाइव डेटा (CPCB पैमाना) — Open-Meteo प्रदूषक सांद्रता से आधिकारिक CPCB नियमों द्वारा गणना।'
        : 'लाइव डेटा (US पैमाना) — Open-Meteo एयर क्वालिटी API से प्राप्त वास्तविक US AQI रीडिंग।',
    observedAt,
    timezone,
    updatedLabelEn: observedAt ? `${observedAt.replace('T', ' ')} (${timezone})` : 'Timestamp unavailable',
    updatedLabelHi: observedAt ? `${observedAt.replace('T', ' ')} (${timezone})` : 'समय उपलब्ध नहीं',
    metrics: {
      usAqi: usAqiValue,
      pm25: round1(current.pm2_5),
      pm10: round1(current.pm10),
      no2: round1(current.nitrogen_dioxide),
      o3: round1(current.ozone),
      so2: round1(current.sulphur_dioxide),
      coMg,
    },
    usAqiValue,
    cpcbResult,
    averagingNoteEn: cpcbInput.averagingNoteEn,
    averagingNoteHi: cpcbInput.averagingNoteHi,
  });
}

/**
 * Main AQI service entry point used by GET /api/aqi.
 */
export async function getAqiReport({
  cityKey = 'delhi',
  mode = 'demo',
  scale = 'us',
  fetchImpl = fetch,
} = {}) {
  const normalizedCity = String(cityKey).trim().toLowerCase();
  const city = CITIES[normalizedCity];
  if (!city) {
    const error = new Error(`Unsupported city "${cityKey}".`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedMode = String(mode).trim().toLowerCase();
  if (normalizedMode !== 'demo' && normalizedMode !== 'live') {
    const error = new Error(`Unsupported mode "${mode}". Use "demo" or "live".`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedScale = String(scale).trim().toLowerCase();
  if (normalizedScale !== 'us' && normalizedScale !== 'cpcb') {
    const error = new Error(`Unsupported scale "${scale}". Use "us" or "cpcb".`);
    error.statusCode = 400;
    throw error;
  }

  if (normalizedMode === 'demo') {
    return buildDemoReport(city, normalizedScale);
  }

  try {
    return await fetchLiveReport(city, normalizedScale, fetchImpl);
  } catch (err) {
    const upstreamError = new Error(
      `Unable to load live ${normalizedScale.toUpperCase()} AQI for ${city.nameEn}: ${err.message}`
    );
    upstreamError.statusCode = 502;
    upstreamError.canFallbackToDemo = true;
    throw upstreamError;
  }
}

/**
 * Returns the next 24 hours of air-quality slots for routine planning.
 * Never invents hourly values; omits slots missing both us_aqi and pm2_5.
 */
export async function getUpcomingHourlySeries({
  cityKey = 'delhi',
  mode = 'demo',
  fetchImpl = fetch,
} = {}) {
  const normalizedCity = String(cityKey).trim().toLowerCase();
  const city = CITIES[normalizedCity];
  if (!city) {
    const error = new Error(`Unsupported city "${cityKey}".`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedMode = String(mode).trim().toLowerCase();
  if (normalizedMode !== 'demo' && normalizedMode !== 'live') {
    const error = new Error(`Unsupported mode "${mode}". Use "demo" or "live".`);
    error.statusCode = 400;
    throw error;
  }

  if (normalizedMode === 'demo') {
    return {
      city,
      isDemo: true,
      dataType: 'demo',
      provider: 'SmogSaathi Demo Hourly Curve (Illustrative Preset)',
      timezone: 'Asia/Kolkata',
      observedAt: null,
      slots: buildDemoHourlySeries(city.key),
    };
  }

  let payload;
  try {
    payload = await fetchOpenMeteoPayload(city, fetchImpl);
  } catch (err) {
    const upstreamError = new Error(
      `Unable to fetch live hourly forecast for ${city.nameEn}: ${err.message}`
    );
    upstreamError.statusCode = 502;
    upstreamError.canFallbackToDemo = true;
    throw upstreamError;
  }

  const times = payload?.hourly?.time;
  if (!Array.isArray(times) || times.length === 0) {
    const err = new Error('Live hourly forecast did not include timestamp series.');
    err.statusCode = 502;
    err.canFallbackToDemo = true;
    throw err;
  }

  const currentTime = payload?.current?.time || times[0];
  const currentHourPrefix = String(currentTime).slice(0, 13);
  let startIndex = times.findIndex((t) => String(t).startsWith(currentHourPrefix));
  if (startIndex === -1) {
    startIndex = times.findIndex((t) => String(t) >= String(currentTime));
  }
  if (startIndex === -1) {
    startIndex = Math.max(0, times.length - 24);
  }

  const slots = [];
  for (let i = startIndex; i < times.length && slots.length < 24; i += 1) {
    const timeStr = String(times[i]);
    const usAqiRaw = payload.hourly?.us_aqi?.[i];
    const pm25Raw = payload.hourly?.pm2_5?.[i];
    const pm10Raw = payload.hourly?.pm10?.[i];
    const no2Raw = payload.hourly?.nitrogen_dioxide?.[i];
    const o3Raw = payload.hourly?.ozone?.[i];

    // Never invent missing values: skip slots missing both usAqi and pm25
    const hasUsAqi = typeof usAqiRaw === 'number' && Number.isFinite(usAqiRaw);
    const hasPm25 = typeof pm25Raw === 'number' && Number.isFinite(pm25Raw);
    if (!hasUsAqi && !hasPm25) continue;

    const hour = Number.parseInt(timeStr.slice(11, 13), 10);
    slots.push({
      time: timeStr,
      hour: Number.isFinite(hour) ? hour : 0,
      usAqi: hasUsAqi ? Math.round(usAqiRaw) : null,
      pm25: round1(pm25Raw),
      pm10: round1(pm10Raw),
      no2: round1(no2Raw),
      o3: round1(o3Raw),
    });
  }

  if (slots.length === 0) {
    const err = new Error('Open-Meteo returned no valid upcoming hourly measurements.');
    err.statusCode = 502;
    err.canFallbackToDemo = true;
    throw err;
  }

  return {
    city,
    isDemo: false,
    dataType: 'modelled',
    provider: 'Open-Meteo Air Quality API (CAMS Modelled Hourly Forecast)',
    timezone: payload.timezone || 'Local time',
    modelGridCoords:
      typeof payload.latitude === 'number' && typeof payload.longitude === 'number'
        ? { lat: payload.latitude, lon: payload.longitude }
        : null,
    observedAt: currentTime,
    slots,
  };
}
