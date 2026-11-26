/**
 * Official India CPCB National Air Quality Index (NAQI) calculation engine.
 *
 * Reference: Central Pollution Control Board (CPCB) NAQI Breakpoints:
 * - 24-hour averages: PM2.5, PM10, NO2, SO2, NH3, Pb
 * - 8-hour averages: O3, CO (mg/m³)
 * - Minimum data rule: at least 3 pollutants must be available, and at least one
 *   of them must be PM2.5 or PM10.
 * - Overall AQI = maximum sub-index across the available pollutants.
 */

export const CPCB_CATEGORIES = [
  {
    max: 50,
    code: 'good',
    labelEn: 'Good',
    labelHi: 'अच्छा',
    adviceEn: 'Minimal health impact. Great air for outdoor walks and ventilation.',
    adviceHi: 'स्वास्थ्य पर न्यूनतम प्रभाव। बाहर टहलने और खिड़कियाँ खोलने के लिए अच्छी हवा।',
  },
  {
    max: 100,
    code: 'moderate',
    labelEn: 'Satisfactory',
    labelHi: 'संतोषजनक',
    adviceEn: 'Minor breathing discomfort possible only for very sensitive people.',
    adviceHi: 'केवल अति-संवेदनशील लोगों को हल्की सांस की असुविधा हो सकती है।',
  },
  {
    max: 200,
    code: 'sensitive',
    labelEn: 'Moderately Polluted',
    labelHi: 'मध्यम प्रदूषित',
    adviceEn: 'People with asthma, lung, or heart conditions should reduce heavy outdoor exertion.',
    adviceHi: 'अस्थमा, फेफड़ों या हृदय रोगियों को बाहर भारी परिश्रम कम करना चाहिए।',
  },
  {
    max: 300,
    code: 'unhealthy',
    labelEn: 'Poor',
    labelHi: 'खराब',
    adviceEn: 'Breathing discomfort on prolonged exposure. Wear an N95 mask in traffic.',
    adviceHi: 'लंबे समय तक बाहर रहने पर सांस में तकलीफ हो सकती है। ट्रैफ़िक में N95 मास्क पहनें।',
  },
  {
    max: 400,
    code: 'very_unhealthy',
    labelEn: 'Very Poor',
    labelHi: 'बहुत खराब',
    adviceEn: 'Respiratory illness risk on prolonged exposure. Limit outdoor activity and filter indoor air.',
    adviceHi: 'लंबे समय तक संपर्क में रहने से श्वसन रोग का जोखिम। बाहर जाना सीमित करें और घर की हवा फिल्टर करें।',
  },
  {
    max: 500,
    code: 'hazardous',
    labelEn: 'Severe',
    labelHi: 'गंभीर',
    adviceEn: 'Affects healthy people too. Stay indoors with windows sealed and clean-air filtration active.',
    adviceHi: 'स्वस्थ लोगों पर भी असर पड़ता है। खिड़कियाँ बंद रखकर घर के अंदर रहें और एयर फिल्ट्रेशन चलाएं।',
  },
];

/**
 * Continuous breakpoint bands derived from the official CPCB NAQI table.
 * Each band maps (bLo, bHi] -> [iLo, iHi].
 * For the open-ended Severe (401-500) band, CPCB extends the prior slope and caps at 500.
 */
const CPCB_BREAKPOINTS = {
  pm25: {
    label: 'PM2.5',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
      { bLo: 30, bHi: 60, iLo: 50, iHi: 100 },
      { bLo: 60, bHi: 90, iLo: 100, iHi: 200 },
      { bLo: 90, bHi: 120, iLo: 200, iHi: 300 },
      { bLo: 120, bHi: 250, iLo: 300, iHi: 400 },
      { bLo: 250, bHi: 380, iLo: 400, iHi: 500 },
    ],
  },
  pm10: {
    label: 'PM10',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
      { bLo: 50, bHi: 100, iLo: 50, iHi: 100 },
      { bLo: 100, bHi: 250, iLo: 100, iHi: 200 },
      { bLo: 250, bHi: 350, iLo: 200, iHi: 300 },
      { bLo: 350, bHi: 430, iLo: 300, iHi: 400 },
      { bLo: 430, bHi: 510, iLo: 400, iHi: 500 },
    ],
  },
  no2: {
    label: 'NO₂',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
      { bLo: 40, bHi: 80, iLo: 50, iHi: 100 },
      { bLo: 80, bHi: 180, iLo: 100, iHi: 200 },
      { bLo: 180, bHi: 280, iLo: 200, iHi: 300 },
      { bLo: 280, bHi: 400, iLo: 300, iHi: 400 },
      { bLo: 400, bHi: 520, iLo: 400, iHi: 500 },
    ],
  },
  o3: {
    label: 'O₃',
    unit: 'µg/m³',
    averagingPeriod: '8h',
    bands: [
      { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
      { bLo: 50, bHi: 100, iLo: 50, iHi: 100 },
      { bLo: 100, bHi: 168, iLo: 100, iHi: 200 },
      { bLo: 168, bHi: 208, iLo: 200, iHi: 300 },
      { bLo: 208, bHi: 748, iLo: 300, iHi: 400 },
      { bLo: 748, bHi: 1288, iLo: 400, iHi: 500 },
    ],
  },
  co: {
    label: 'CO',
    unit: 'mg/m³',
    averagingPeriod: '8h',
    bands: [
      { bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
      { bLo: 1.0, bHi: 2.0, iLo: 50, iHi: 100 },
      { bLo: 2.0, bHi: 10.0, iLo: 100, iHi: 200 },
      { bLo: 10.0, bHi: 17.0, iLo: 200, iHi: 300 },
      { bLo: 17.0, bHi: 34.0, iLo: 300, iHi: 400 },
      { bLo: 34.0, bHi: 51.0, iLo: 400, iHi: 500 },
    ],
  },
  so2: {
    label: 'SO₂',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
      { bLo: 40, bHi: 80, iLo: 50, iHi: 100 },
      { bLo: 80, bHi: 380, iLo: 100, iHi: 200 },
      { bLo: 380, bHi: 800, iLo: 200, iHi: 300 },
      { bLo: 800, bHi: 1600, iLo: 300, iHi: 400 },
      { bLo: 1600, bHi: 2400, iLo: 400, iHi: 500 },
    ],
  },
  nh3: {
    label: 'NH₃',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
      { bLo: 200, bHi: 400, iLo: 50, iHi: 100 },
      { bLo: 400, bHi: 800, iLo: 100, iHi: 200 },
      { bLo: 800, bHi: 1200, iLo: 200, iHi: 300 },
      { bLo: 1200, bHi: 1800, iLo: 300, iHi: 400 },
      { bLo: 1800, bHi: 2400, iLo: 400, iHi: 500 },
    ],
  },
  pb: {
    label: 'Pb',
    unit: 'µg/m³',
    averagingPeriod: '24h',
    bands: [
      { bLo: 0, bHi: 0.5, iLo: 0, iHi: 50 },
      { bLo: 0.5, bHi: 1.0, iLo: 50, iHi: 100 },
      { bLo: 1.0, bHi: 2.0, iLo: 100, iHi: 200 },
      { bLo: 2.0, bHi: 3.0, iLo: 200, iHi: 300 },
      { bLo: 3.0, bHi: 3.5, iLo: 300, iHi: 400 },
      { bLo: 3.5, bHi: 4.0, iLo: 400, iHi: 500 },
    ],
  },
};

/**
 * Calculates a single CPCB pollutant sub-index using linear interpolation.
 * Returns null if the concentration is missing or negative.
 */
export function calculateCpcbSubIndex(pollutantKey, concentration) {
  const spec = CPCB_BREAKPOINTS[pollutantKey];
  if (!spec) return null;

  const value = Number(concentration);
  if (concentration === null || concentration === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }

  for (let idx = 0; idx < spec.bands.length; idx += 1) {
    const band = spec.bands[idx];
    const isLast = idx === spec.bands.length - 1;
    if (value <= band.bHi || isLast) {
      const clamped = Math.min(value, band.bHi);
      const raw = ((band.iHi - band.iLo) / (band.bHi - band.bLo)) * (clamped - band.bLo) + band.iLo;
      // Enforce band floor (51, 101, 201, 301, 401) whenever concentration crosses above prior ceiling
      const minFloor = idx > 0 ? band.iLo + 1 : 0;
      const subIndex = Math.max(minFloor, Math.min(500, Math.round(raw)));
      return subIndex;
    }
  }

  return null;
}

/**
 * Maps a numeric India CPCB NAQI score (0-500) to its official category and bilingual advice.
 */
export function classifyCpcbAqi(aqiValue) {
  if (aqiValue === null || aqiValue === undefined) {
    return {
      code: 'unknown',
      labelEn: 'Unavailable',
      labelHi: 'उपलब्ध नहीं',
      adviceEn: 'CPCB AQI requires at least 3 pollutants including PM2.5 or PM10.',
      adviceHi: 'CPCB AQI के लिए कम से कम 3 प्रदूषक (जिनमें PM2.5 या PM10 शामिल हो) आवश्यक हैं।',
    };
  }

  const numeric = Number(aqiValue);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return {
      code: 'unknown',
      labelEn: 'Unavailable',
      labelHi: 'उपलब्ध नहीं',
      adviceEn: 'No valid CPCB AQI reading is available right now.',
      adviceHi: 'अभी कोई मान्य CPCB AQI रीडिंग उपलब्ध नहीं है।',
    };
  }

  return CPCB_CATEGORIES.find((tier) => numeric <= tier.max) || CPCB_CATEGORIES[CPCB_CATEGORIES.length - 1];
}

/**
 * Computes overall India CPCB AQI from available pollutant concentrations.
 * Enforces CPCB's rule: >= 3 pollutants and at least one of PM2.5 or PM10.
 */
export function calculateCpcbAqi(concentrations = {}) {
  const subIndices = {};
  const availableKeys = [];

  for (const key of Object.keys(CPCB_BREAKPOINTS)) {
    const subIndex = calculateCpcbSubIndex(key, concentrations[key]);
    if (subIndex !== null) {
      subIndices[key] = {
        label: CPCB_BREAKPOINTS[key].label,
        unit: CPCB_BREAKPOINTS[key].unit,
        averagingPeriod: CPCB_BREAKPOINTS[key].averagingPeriod,
        concentration: Math.round(Number(concentrations[key]) * 100) / 100,
        subIndex,
      };
      availableKeys.push(key);
    }
  }

  const hasParticulate = availableKeys.includes('pm25') || availableKeys.includes('pm10');
  const meetsMinimumRule = availableKeys.length >= 3 && hasParticulate;

  if (!meetsMinimumRule) {
    return {
      eligible: false,
      aqi: null,
      dominantPollutant: null,
      pollutantCount: availableKeys.length,
      subIndices,
      reasonEn:
        'CPCB AQI requires at least 3 valid pollutants including PM2.5 or PM10; data was insufficient.',
      reasonHi:
        'CPCB AQI के लिए कम से कम 3 मान्य प्रदूषक (PM2.5 या PM10 सहित) चाहिए; डेटा अपर्याप्त था।',
      category: classifyCpcbAqi(null),
    };
  }

  let dominantKey = availableKeys[0];
  for (const key of availableKeys) {
    if (subIndices[key].subIndex > subIndices[dominantKey].subIndex) {
      dominantKey = key;
    }
  }

  const aqi = subIndices[dominantKey].subIndex;
  return {
    eligible: true,
    aqi,
    dominantPollutant: subIndices[dominantKey].label,
    dominantPollutantKey: dominantKey,
    dominantSubIndex: aqi,
    pollutantCount: availableKeys.length,
    subIndices,
    category: classifyCpcbAqi(aqi),
  };
}
