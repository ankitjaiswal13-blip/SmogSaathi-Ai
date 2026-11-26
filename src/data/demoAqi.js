/**
 * Supported cities with real geographic coordinates (used for Live API)
 * and clearly labeled DEMO scenarios (used when offline or in Demo Mode).
 *
 * IMPORTANT:
 * - Demo numbers are illustrative sample scenarios only — never real-time readings.
 * - US AQI and India CPCB AQI are distinct scales; CPCB AQI is computed directly
 *   from pollutant concentrations using CPCB breakpoint rules.
 */
export const CITIES = {
  delhi: {
    key: 'delhi',
    nameEn: 'New Delhi',
    nameHi: 'नई दिल्ली',
    lat: 28.6139,
    lon: 77.209,
    demo: {
      scenarioEn: 'Demo Scenario: Winter Morning Smog',
      scenarioHi: 'डेमो परिदृश्य: सर्दियों की सुबह का स्मॉग',
      usAqi: 196,
      pm25: 142.5,
      pm10: 238.0,
      no2: 54.2,
      o3: 32.8,
      so2: 18.4,
      coMg: 1.9,
      updatedLabelEn: 'Sample preset (no live timestamp)',
      updatedLabelHi: 'नमूना डेटा (लाइव समय नहीं)',
      hourlyFactors: [
        1.14, 1.18, 1.15, 1.05, 0.94, 0.85, 0.80, 0.84, 0.92, 1.04, 1.12, 1.16,
        1.10, 1.04, 0.98, 0.95, 0.92, 0.94, 0.98, 1.04, 1.08, 1.12, 1.15, 1.16,
      ],
    },
  },
  mumbai: {
    key: 'mumbai',
    nameEn: 'Mumbai',
    nameHi: 'मुंबई',
    lat: 19.076,
    lon: 72.8777,
    demo: {
      scenarioEn: 'Demo Scenario: Coastal Urban Haze',
      scenarioHi: 'डेमो परिदृश्य: तटीय शहरी धुंध',
      usAqi: 118,
      pm25: 42.4,
      pm10: 96.5,
      no2: 31.0,
      o3: 48.6,
      so2: 14.2,
      coMg: 1.1,
      updatedLabelEn: 'Sample preset (no live timestamp)',
      updatedLabelHi: 'नमूना डेटा (लाइव समय नहीं)',
      hourlyFactors: [
        1.14, 1.18, 1.15, 1.05, 0.94, 0.85, 0.80, 0.84, 0.92, 1.04, 1.12, 1.16,
        1.10, 1.04, 0.98, 0.95, 0.92, 0.94, 0.98, 1.04, 1.08, 1.12, 1.15, 1.16,
      ],
    },
  },
  bengaluru: {
    key: 'bengaluru',
    nameEn: 'Bengaluru',
    nameHi: 'बेंगलुरु',
    lat: 12.9716,
    lon: 77.5946,
    demo: {
      scenarioEn: 'Demo Scenario: Breezy Moderate Morning',
      scenarioHi: 'डेमो परिदृश्य: हवादार मध्यम सुबह',
      usAqi: 64,
      pm25: 18.2,
      pm10: 44.0,
      no2: 19.5,
      o3: 41.2,
      so2: 7.5,
      coMg: 0.7,
      updatedLabelEn: 'Sample preset (no live timestamp)',
      updatedLabelHi: 'नमूना डेटा (लाइव समय नहीं)',
      hourlyFactors: [
        1.14, 1.18, 1.15, 1.05, 0.94, 0.85, 0.80, 0.84, 0.92, 1.04, 1.12, 1.16,
        1.10, 1.04, 0.98, 0.95, 0.92, 0.94, 0.98, 1.04, 1.08, 1.12, 1.15, 1.16,
      ],
    },
  },
  lucknow: {
    key: 'lucknow',
    nameEn: 'Lucknow',
    nameHi: 'लखनऊ',
    lat: 26.8467,
    lon: 80.9462,
    demo: {
      scenarioEn: 'Demo Scenario: Evening Traffic Spike',
      scenarioHi: 'डेमो परिदृश्य: शाम का ट्रैफ़िक प्रदूषण',
      usAqi: 171,
      pm25: 94.0,
      pm10: 168.3,
      no2: 46.8,
      o3: 36.1,
      so2: 15.0,
      coMg: 1.6,
      updatedLabelEn: 'Sample preset (no live timestamp)',
      updatedLabelHi: 'नमूना डेटा (लाइव समय नहीं)',
      hourlyFactors: [
        1.14, 1.18, 1.15, 1.05, 0.94, 0.85, 0.80, 0.84, 0.92, 1.04, 1.12, 1.16,
        1.10, 1.04, 0.98, 0.95, 0.92, 0.94, 0.98, 1.04, 1.08, 1.12, 1.15, 1.16,
      ],
    },
  },
  kanpur: {
    key: 'kanpur',
    nameEn: 'Kanpur',
    nameHi: 'कानपुर',
    lat: 26.4499,
    lon: 80.3319,
    demo: {
      scenarioEn: 'Demo Scenario: Industrial Corridor Haze',
      scenarioHi: 'डेमो परिदृश्य: औद्योगिक क्षेत्र की धुंध',
      usAqi: 180,
      pm25: 112.4,
      pm10: 195.0,
      no2: 49.0,
      o3: 34.0,
      so2: 21.5,
      coMg: 1.8,
      updatedLabelEn: 'Sample preset (no live timestamp)',
      updatedLabelHi: 'नमूना डेटा (लाइव समय नहीं)',
      hourlyFactors: [
        1.14, 1.18, 1.15, 1.05, 0.94, 0.85, 0.80, 0.84, 0.92, 1.04, 1.12, 1.16,
        1.10, 1.04, 0.98, 0.95, 0.92, 0.94, 0.98, 1.04, 1.08, 1.12, 1.15, 1.16,
      ],
    },
  },
};

const US_AQI_LEVELS = [
  {
    max: 50,
    code: 'good',
    labelEn: 'Good',
    labelHi: 'अच्छा',
    adviceEn: 'Clean air for outdoor walks, cycling, and opening windows.',
    adviceHi: 'बाहर टहलने, साइकिल चलाने और खिड़कियाँ खोलने के लिए साफ हवा।',
  },
  {
    max: 100,
    code: 'moderate',
    labelEn: 'Moderate',
    labelHi: 'मध्यम',
    adviceEn: 'Acceptable air quality; sensitive individuals should watch for mild irritation.',
    adviceHi: 'हवा ठीक है; संवेदनशील लोगों को हल्की सावधानी रखनी चाहिए।',
  },
  {
    max: 150,
    code: 'sensitive',
    labelEn: 'Unhealthy for Sensitive Groups',
    labelHi: 'संवेदनशील समूहों के लिए अस्वस्थ',
    adviceEn: 'Prefer low-traffic routes and reduce intense outdoor exertion.',
    adviceHi: 'कम ट्रैफ़िक वाले रास्ते चुनें और बाहर भारी व्यायाम कम करें।',
  },
  {
    max: 200,
    code: 'unhealthy',
    labelEn: 'Unhealthy',
    labelHi: 'अस्वस्थ',
    adviceEn: 'Wear an N95 mask outdoors and keep windows closed during peak traffic.',
    adviceHi: 'बाहर N95 मास्क पहनें और पीक ट्रैफ़िक के समय खिड़कियाँ बंद रखें।',
  },
  {
    max: 300,
    code: 'very_unhealthy',
    labelEn: 'Very Unhealthy',
    labelHi: 'बहुत अस्वस्थ',
    adviceEn: 'Avoid outdoor exercise, run indoor air filtration, and seal window gaps.',
    adviceHi: 'बाहर व्यायाम से बचें, घर में एयर प्यूरीफायर चलाएं और खिड़कियाँ सील रखें।',
  },
  {
    max: Infinity,
    code: 'hazardous',
    labelEn: 'Hazardous',
    labelHi: 'खतरनाक',
    adviceEn: 'Stay indoors as much as possible and use clean-air precautions continuously.',
    adviceHi: 'यथासंभव घर के अंदर रहें और लगातार स्वच्छ-वायु सावधानियाँ अपनाएं।',
  },
];

/**
 * Builds an illustrative 24-hour demo series starting at 06:00 for Demo Mode only.
 * Clearly tagged as illustrative sample data (never real-time sensor measurements).
 */
export function buildDemoHourlySeries(cityKey) {
  const city = CITIES[cityKey];
  if (!city) return [];

  const { demo } = city;
  const factors = demo.hourlyFactors || [
    1.08, 1.12, 1.05, 0.96, 0.88, 0.80, 0.75, 0.78, 0.86, 0.95, 1.05, 1.10,
    1.06, 1.00, 0.95, 0.92, 0.90, 0.92, 0.96, 1.02, 1.06, 1.09, 1.10, 1.10,
  ];

  const slots = [];
  for (let i = 0; i < 24; i += 1) {
    const hour24 = (6 + i) % 24;
    const dayOffset = 6 + i >= 24 ? 1 : 0;
    const dayLabel = dayOffset === 0 ? 'Today (Demo)' : 'Tomorrow (Demo)';
    const hh = String(hour24).padStart(2, '0');
    const factor = factors[i % factors.length];

    slots.push({
      time: `Demo Day+${dayOffset} ${hh}:00`,
      hour: hour24,
      dayLabel,
      usAqi: Math.max(10, Math.round(demo.usAqi * factor)),
      pm25: Math.round(demo.pm25 * factor * 10) / 10,
      pm10: Math.round(demo.pm10 * factor * 10) / 10,
      no2: Math.round(demo.no2 * factor * 10) / 10,
      o3: Math.round(demo.o3 * (2 - factor * 0.8) * 10) / 10,
    });
  }

  return slots;
}

/**
 * Maps a numeric US AQI score into its US EPA category, UI badge code, and bilingual advice.
 */
export function classifyUsAqi(aqiValue) {
  if (aqiValue === null || aqiValue === undefined) {
    return {
      code: 'unknown',
      labelEn: 'Unavailable',
      labelHi: 'उपलब्ध नहीं',
      adviceEn: 'No valid US AQI reading is available right now.',
      adviceHi: 'अभी कोई मान्य US AQI रीडिंग उपलब्ध नहीं है।',
    };
  }

  const numeric = Number(aqiValue);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return {
      code: 'unknown',
      labelEn: 'Unavailable',
      labelHi: 'उपलब्ध नहीं',
      adviceEn: 'No valid US AQI reading is available right now.',
      adviceHi: 'अभी कोई मान्य US AQI रीडिंग उपलब्ध नहीं है।',
    };
  }

  return US_AQI_LEVELS.find((tier) => numeric <= tier.max) || US_AQI_LEVELS[US_AQI_LEVELS.length - 1];
}
