import { classifyUsAqi } from '../data/demoAqi.js';
import { getUpcomingHourlySeries } from './aqiService.js';

export const ACTIVITIES = {
  walking: {
    key: 'walking',
    intensity: 'moderate',
    nameEn: 'Walking',
    nameHi: 'टहलना',
  },
  jogging: {
    key: 'jogging',
    intensity: 'vigorous',
    nameEn: 'Jogging / Running',
    nameHi: 'जॉगिंग / दौड़',
  },
  school_commute: {
    key: 'school_commute',
    intensity: 'transit',
    nameEn: 'School Commute',
    nameHi: 'स्कूल यात्रा',
  },
  office_commute: {
    key: 'office_commute',
    intensity: 'transit',
    nameEn: 'Office Commute',
    nameHi: 'ऑफिस यात्रा',
  },
  cycling: {
    key: 'cycling',
    intensity: 'vigorous',
    nameEn: 'Cycling',
    nameHi: 'साइकिल चलाना',
  },
  errands: {
    key: 'errands',
    intensity: 'moderate',
    nameEn: 'Daily Errands',
    nameHi: 'दैनिक कामकाज',
  },
};

export const TIME_WINDOWS = {
  morning: { key: 'morning', startHour: 6, endHour: 10, labelEn: 'Morning (06:00–10:59)', labelHi: 'सुबह (06:00–10:59)' },
  midday: { key: 'midday', startHour: 11, endHour: 15, labelEn: 'Midday / Afternoon (11:00–15:59)', labelHi: 'दोपहर (11:00–15:59)' },
  evening: { key: 'evening', startHour: 16, endHour: 20, labelEn: 'Evening (16:00–20:59)', labelHi: 'शाम (16:00–20:59)' },
  night: { key: 'night', startHour: 21, endHour: 23, labelEn: 'Night (21:00–23:59)', labelHi: 'रात (21:00–23:59)' },
  flexible: { key: 'flexible', startHour: 6, endHour: 21, labelEn: 'Flexible Daytime (06:00–21:59)', labelHi: 'लचीला दिन समय (06:00–21:59)' },
};

export const TRANSPORT_MODES = {
  walk: { key: 'walk', labelEn: 'Walking', labelHi: 'पैदल' },
  cycle: { key: 'cycle', labelEn: 'Bicycle', labelHi: 'साइकिल' },
  metro_bus: { key: 'metro_bus', labelEn: 'Metro / Electric Bus', labelHi: 'मेट्रो / इलेक्ट्रिक बस' },
  two_wheeler: { key: 'two_wheeler', labelEn: 'Two-Wheeler', labelHi: 'दोपहिया वाहन' },
  car_cab: { key: 'car_cab', labelEn: 'Car / Cab', labelHi: 'कार / कैब' },
};

function formatHourLabel(slot) {
  if (slot.time.startsWith('Demo')) {
    return `${String(slot.hour).padStart(2, '0')}:00`;
  }
  return slot.time.slice(11, 16);
}

function getMetricScore(slot) {
  // Prefer pm25 as primary pollutant signal, paired with usAqi when available
  if (typeof slot.usAqi === 'number') return slot.usAqi;
  if (typeof slot.pm25 === 'number') return slot.pm25 * 2;
  return Infinity;
}

function isSlotUnhealthy(slot) {
  const aqiUnhealthy = typeof slot.usAqi === 'number' && slot.usAqi > 150;
  const pm25Unhealthy = typeof slot.pm25 === 'number' && slot.pm25 > 55.4;
  return aqiUnhealthy || pm25Unhealthy;
}

function isSlotElevatedForVigorous(slot) {
  const aqiElevated = typeof slot.usAqi === 'number' && slot.usAqi > 100;
  const pm25Elevated = typeof slot.pm25 === 'number' && slot.pm25 > 35.4;
  return aqiElevated || pm25Elevated;
}

function buildCandidateWindows(slots, windowHours) {
  const windows = [];
  for (let i = 0; i <= slots.length - windowHours; i += 1) {
    const slice = slots.slice(i, i + windowHours);
    const validAqis = slice.map((s) => s.usAqi).filter((v) => typeof v === 'number');
    const validPm25 = slice.map((s) => s.pm25).filter((v) => typeof v === 'number');

    const avgUsAqi = validAqis.length > 0
      ? Math.round(validAqis.reduce((a, b) => a + b, 0) / validAqis.length)
      : null;
    const maxUsAqi = validAqis.length > 0 ? Math.max(...validAqis) : null;
    const avgPm25 = validPm25.length > 0
      ? Math.round((validPm25.reduce((a, b) => a + b, 0) / validPm25.length) * 10) / 10
      : null;

    const endHour = (slice[slice.length - 1].hour + 1) % 24;
    windows.push({
      startIndex: i,
      startHour: slice[0].hour,
      startTime: slice[0].time,
      slotTimes: slice.map((s) => s.time),
      label: `${formatHourLabel(slice[0])}–${String(endHour).padStart(2, '0')}:00`,
      avgUsAqi,
      maxUsAqi,
      avgPm25,
      unhealthy: slice.some(isSlotUnhealthy),
      elevatedForVigorous: slice.some(isSlotElevatedForVigorous),
      score: slice.reduce((acc, s) => acc + getMetricScore(s), 0) / slice.length,
    });
  }
  return windows;
}

function isInPreferredTime(hour, pref) {
  return hour >= pref.startHour && hour <= pref.endHour;
}

function buildSafetyWarning({ activity, bestWindow, allWindowsUnhealthy, allElevatedForVigorous }) {
  const aqi = bestWindow?.avgUsAqi;
  const category = classifyUsAqi(aqi);

  if (allWindowsUnhealthy) {
    return {
      level: 'danger',
      titleEn: 'High-Pollution Alert: No Safe Outdoor Window Today',
      titleHi: 'उच्च प्रदूषण चेतावनी: आज बाहर जाने के लिए कोई भी समय पूरी तरह सुरक्षित नहीं',
      detailEn: `Every available window stays in the Unhealthy range or worse (lowest modelled/preset slot is US AQI ${aqi ?? '--'}). Avoid ${activity.nameEn.toLowerCase()} outdoors if optional; move workouts indoors or wear a snug N95 mask for essential travel.`,
      detailHi: `सभी उपलब्ध समय स्लॉट अस्वस्थ (Unhealthy) या उससे खराब श्रेणी में हैं (सबसे कम स्लॉट US AQI ${aqi ?? '--'} है)। यदि संभव हो तो बाहर ${activity.nameHi} टालें; व्यायाम घर के अंदर करें और आवश्यक यात्रा में N95 मास्क पहनें।`,
    };
  }

  if (activity.intensity === 'vigorous' && allElevatedForVigorous) {
    return {
      level: 'warning',
      titleEn: `Caution for Vigorous ${activity.nameEn}`,
      titleHi: `तीव्र गतिविधि (${activity.nameHi}) के लिए सावधानी`,
      detailEn: `Because ${activity.nameEn.toLowerCase()} increases breathing rate, even Moderate/Sensitive air (lowest US AQI ${aqi ?? '--'}) raises inhaled PM2.5. Keep intensity light or move vigorous training indoors.`,
      detailHi: `${activity.nameHi} में सांस की गति तेज होती है, इसलिए मध्यम/संवेदनशील हवा (न्यूनतम US AQI ${aqi ?? '--'}) में भी अधिक PM2.5 शरीर में जाता है। तीव्रता हल्की रखें या घर के अंदर व्यायाम करें।`,
    };
  }

  if (bestWindow?.unhealthy || (typeof aqi === 'number' && aqi > 150)) {
    return {
      level: 'danger',
      titleEn: `Unhealthy Conditions During ${activity.nameEn}`,
      titleHi: `${activity.nameHi} के दौरान अस्वस्थ हवा`,
      detailEn: `US AQI ${aqi} (${category.labelEn}) is unhealthy for prolonged outdoor exposure. Use an N95 mask and shorten outdoor duration.`,
      detailHi: `US AQI ${aqi} (${category.labelHi}) लंबे समय तक बाहर रहने के लिए अस्वस्थ है। N95 मास्क पहनें और बाहर रहने का समय कम करें।`,
    };
  }

  if (typeof aqi === 'number' && aqi > 100) {
    return {
      level: 'warning',
      titleEn: 'Moderate Caution — Sensitive Groups Take Care',
      titleHi: 'मध्यम सावधानी — संवेदनशील व्यक्ति ध्यान रखें',
      detailEn: `Recommended window is US AQI ${aqi} (${category.labelEn}). Children, older adults, and people with asthma should reduce intense exertion.`,
      detailHi: `सुझाया गया समय US AQI ${aqi} (${category.labelHi}) है। बच्चे, बुजुर्ग और अस्थमा रोगी भारी परिश्रम कम रखें।`,
    };
  }

  if (typeof aqi === 'number' && aqi > 50) {
    return {
      level: activity.intensity === 'vigorous' && aqi > 80 ? 'warning' : 'safe',
      titleEn: `Moderate Air Window for ${activity.nameEn}`,
      titleHi: `${activity.nameHi} के लिए मध्यम वायु समय`,
      detailEn: `Recommended window is US AQI ${aqi} (${category.labelEn}). Generally acceptable, though unusually sensitive people should pace vigorous exertion and avoid busy roads.`,
      detailHi: `सुझाए गए समय में US AQI ${aqi} (${category.labelHi}) है। सामान्यतः ठीक है, पर संवेदनशील व्यक्ति भारी परिश्रम और मुख्य ट्रैफ़िक से बचें।`,
    };
  }

  return {
    level: 'safe',
    titleEn: `Favorable Clean-Air Window for ${activity.nameEn}`,
    titleHi: `${activity.nameHi} के लिए अनुकूल स्वच्छ-हवा समय`,
    detailEn: `Recommended window reaches US AQI ${aqi ?? '--'} (${category.labelEn}). Stick to green parks or low-traffic side streets away from tailpipe exhaust.`,
    detailHi: `सुझाए गए समय में US AQI ${aqi ?? '--'} (${category.labelHi}) है। मुख्य सड़कों के धुएं से दूर पार्क या कम ट्रैफ़िक वाले रास्ते चुनें।`,
  };
}

function buildTransportAlternatives({ activity, transportMode, bestWindow, allWindowsUnhealthy }) {
  const highPollution = allWindowsUnhealthy || Boolean(bestWindow?.unhealthy);
  const tipsEn = [];
  const tipsHi = [];

  if (transportMode.key === 'car_cab') {
    tipsEn.push(
      'Switch solo car/cab trips to Metro, electric bus, or carpooling to cut per-person NO₂ and PM2.5 exhaust.'
    );
    tipsHi.push(
      'अकेले कार/कैब के बजाय मेट्रो, इलेक्ट्रिक बस या कारपूल चुनें — इससे प्रति व्यक्ति NO₂ और PM2.5 उत्सर्जन काफी कम होता है।'
    );
    tipsEn.push(
      'When driving in slow traffic is unavoidable, switch cabin AC to recirculation mode and turn off the engine at >30s red lights.'
    );
    tipsHi.push(
      'यदि ट्रैफ़िक में कार से जाना आवश्यक हो तो AC को रीसर्कुलेशन मोड पर रखें और 30 सेकंड से अधिक लाल बत्ती पर इंजन बंद करें।'
    );
  } else if (transportMode.key === 'two_wheeler') {
    tipsEn.push(
      highPollution
        ? 'Air is unhealthy for open-air riding — take the Metro or enclosed EV bus today; if riding, wear a fitted N95 mask under your helmet.'
        : 'Consider Metro or shared e-rickshaw on arterial corridors; wear an N95 mask in congested intersections.'
    );
    tipsHi.push(
      highPollution
        ? 'खुले दोपहिया वाहन के लिए हवा अस्वस्थ है — आज मेट्रो या इलेक्ट्रिक बस अपनाएं; या हेलमेट के अंदर N95 मास्क पहनें।'
        : 'मुख्य भीड़भाड़ वाले मार्गों पर मेट्रो या ई-रिक्शा चुनें और चौराहों पर N95 मास्क का उपयोग करें।'
    );
  } else if (transportMode.key === 'metro_bus') {
    tipsEn.push(
      'Great low-emission choice! Use Metro/electric transit for the main corridor and wear an N95 mask during the last-mile walk if AQI > 150.'
    );
    tipsHi.push(
      'बेहतरीन कम-उत्सर्जन विकल्प! मुख्य यात्रा मेट्रो/इलेक्ट्रिक बस से करें और AQI > 150 होने पर अंतिम पैदल दूरी में N95 मास्क पहनें।'
    );
  } else if (transportMode.key === 'cycle') {
    tipsEn.push(
      highPollution
        ? 'Cycling creates zero tailpipe emissions, but heavy breathing in unhealthy smog increases lung exposure—switch to Metro/EV bus or indoor cycling today.'
        : 'Zero-emission commuting! Route along green or residential backstreets to avoid diesel/petrol exhaust plumes.'
    );
    tipsHi.push(
      highPollution
        ? 'साइकिल से शून्य धुआं निकलता है, लेकिन अस्वस्थ स्मॉग में तेज सांस लेने से जोखिम बढ़ता है — आज मेट्रो/ई-बस या इनडोर साइकिलिंग चुनें।'
        : 'शून्य-उत्सर्जन यात्रा! वाहनों के धुएं से बचने के लिए हरे पार्क या शांत अंदरूनी गलियों का रास्ता चुनें।'
    );
  } else {
    tipsEn.push(
      highPollution
        ? 'Walking is zero-emission, but keep walks short (<20 min) with an N95 mask on high-AQI days or combine trips with Metro.'
        : 'Zero-emission choice! Walk through shaded inner lanes rather than next to congested traffic.'
    );
    tipsHi.push(
      highPollution
        ? 'पैदल चलना शून्य-उत्सर्जन है, पर उच्च AQI दिनों में N95 मास्क पहनकर समय छोटा (<20 मिनट) रखें या मेट्रो के साथ जोड़ें।'
        : 'शून्य-उत्सर्जन विकल्प! भीड़भाड़ वाली मुख्य सड़क के बजाय शांत अंदरूनी गलियों में टहलें।'
    );
  }

  if (activity.key === 'errands') {
    tipsEn.push('Batch groceries, bank, and parcel errands into one off-peak trip to avoid repeated cold-start vehicle emissions.');
    tipsHi.push('किराना, बैंक व अन्य कामों को एक ही ऑफ-पीक चक्कर में निपटाएं ताकि बार-बार वाहन स्टार्ट होने का धुआं बचे।');
  } else if (activity.key === 'school_commute') {
    tipsEn.push('Use shared school buses/carpools and turn off waiting vehicle engines outside school gates.');
    tipsHi.push('स्कूल बस या कारपूल अपनाएं और स्कूल गेट के बाहर इंतज़ार करते समय वाहन इंजन बंद रखें।');
  } else if (activity.key === 'office_commute') {
    tipsEn.push('If your workplace allows flexible hours, shift arrival/departure outside 08:30–10:30 and 18:00–20:30 peak congestion.');
    tipsHi.push('यदि ऑफिस समय लचीला हो, तो सुबह 08:30–10:30 और शाम 18:00–20:30 के पीक ट्रैफ़िक से हटकर यात्रा करें।');
  }

  return { tipsEn, tipsHi };
}

/**
 * Generates a personalized low-emission daily routine recommendation.
 */
export async function generateRoutinePlan({
  cityKey = 'delhi',
  mode = 'demo',
  activityKey = 'walking',
  preferredTimeKey = 'morning',
  durationMinutes = 30,
  transportKey = 'walk',
  fetchImpl = fetch,
} = {}) {
  const activity = ACTIVITIES[activityKey];
  if (!activity) {
    const err = new Error(`Unsupported activity "${activityKey}".`);
    err.statusCode = 400;
    throw err;
  }

  const preferredTime = TIME_WINDOWS[preferredTimeKey];
  if (!preferredTime) {
    const err = new Error(`Unsupported preferredTime "${preferredTimeKey}".`);
    err.statusCode = 400;
    throw err;
  }

  const transportMode = TRANSPORT_MODES[transportKey];
  if (!transportMode) {
    const err = new Error(`Unsupported transportMode "${transportKey}".`);
    err.statusCode = 400;
    throw err;
  }

  const duration = Number.parseInt(durationMinutes, 10);
  const validDuration = [15, 30, 45, 60, 90].includes(duration) ? duration : 30;
  const windowHours = validDuration > 60 ? 2 : 1;

  const series = await getUpcomingHourlySeries({ cityKey, mode, fetchImpl });

  // Evaluate daytime/active hours (06:00-22:00) if present, otherwise all available slots
  const activeSlots = series.slots.filter((s) => s.hour >= 6 && s.hour <= 22);
  const poolSlots = activeSlots.length >= windowHours ? activeSlots : series.slots;

  const allWindows = buildCandidateWindows(poolSlots, windowHours);
  if (allWindows.length === 0) {
    const err = new Error('Not enough hourly air-quality slots to evaluate a time window.');
    err.statusCode = 502;
    throw err;
  }

  const sortedOverall = [...allWindows].sort((a, b) => a.score - b.score);
  const bestOverall = sortedOverall[0];
  const worstOverall = sortedOverall[sortedOverall.length - 1];
  const bestSlotTimes = new Set(bestOverall.slotTimes || [bestOverall.startTime]);

  const preferredWindows = allWindows.filter((w) => isInPreferredTime(w.startHour, preferredTime));
  const bestPreferred =
    preferredWindows.length > 0
      ? [...preferredWindows].sort((a, b) => a.score - b.score)[0]
      : null;

  const allWindowsUnhealthy = allWindows.every((w) => w.unhealthy);
  const allElevatedForVigorous = allWindows.every((w) => w.elevatedForVigorous);

  let shiftSummaryEn;
  let shiftSummaryHi;
  if (allWindowsUnhealthy) {
    shiftSummaryEn = `All available time windows today remain Unhealthy (lowest is ${bestOverall.label} at US AQI ${bestOverall.avgUsAqi ?? '--'}, PM2.5 ${bestOverall.avgPm25 ?? '--'} µg/m³). There is no safe outdoor window today; postpone optional outdoor activity or keep essential trips brief with an N95 mask.`;
    shiftSummaryHi = `आज सभी उपलब्ध समय अस्वस्थ श्रेणी में हैं (सबसे कम ${bestOverall.label} पर US AQI ${bestOverall.avgUsAqi ?? '--'}, PM2.5 ${bestOverall.avgPm25 ?? '--'} µg/m³ है)। आज कोई भी बाहरी समय पूरी तरह सुरक्षित नहीं है; वैकल्पिक बाहरी गतिविधि टालें या आवश्यक काम N95 मास्क के साथ छोटे रखें।`;
  } else if (
    bestPreferred &&
    bestPreferred.startTime !== bestOverall.startTime &&
    typeof bestPreferred.avgPm25 === 'number' &&
    typeof bestOverall.avgPm25 === 'number' &&
    bestPreferred.avgPm25 > bestOverall.avgPm25
  ) {
    const pctLower = Math.round(((bestPreferred.avgPm25 - bestOverall.avgPm25) / bestPreferred.avgPm25) * 100);
    shiftSummaryEn = `Your preferred ${preferredTime.labelEn} best slot (${bestPreferred.label}) has PM2.5 ~${bestPreferred.avgPm25} µg/m³ (US AQI ${bestPreferred.avgUsAqi ?? '--'}). Shifting to ${bestOverall.label} drops PM2.5 to ~${bestOverall.avgPm25} µg/m³ (${pctLower}% lower) due to better daytime atmospheric dispersion.`;
    shiftSummaryHi = `आपके चुने गए ${preferredTime.labelHi} में सबसे बेहतर स्लॉट (${bestPreferred.label}) पर PM2.5 ~${bestPreferred.avgPm25} µg/m³ (US AQI ${bestPreferred.avgUsAqi ?? '--'}) है। समय बदलकर ${bestOverall.label} चुनने से PM2.5 ~${bestOverall.avgPm25} µg/m³ (${pctLower}% कम) रहता है।`;
  } else if (
    typeof worstOverall.avgPm25 === 'number' &&
    typeof bestOverall.avgPm25 === 'number' &&
    worstOverall.avgPm25 > bestOverall.avgPm25
  ) {
    const pctLowerThanPeak = Math.round(
      ((worstOverall.avgPm25 - bestOverall.avgPm25) / worstOverall.avgPm25) * 100
    );
    shiftSummaryEn = `${bestOverall.label} is the lowest-pollution window available (${bestOverall.avgPm25} µg/m³ PM2.5, US AQI ${bestOverall.avgUsAqi ?? '--'}) — ${pctLowerThanPeak}% lower PM2.5 than the day's peak window (${worstOverall.label} at ${worstOverall.avgPm25} µg/m³).`;
    shiftSummaryHi = `आपके ${validDuration} मिनट के ${activity.nameHi} के लिए ${bestOverall.label} सबसे कम प्रदूषण वाला समय है (PM2.5 ${bestOverall.avgPm25} µg/m³, US AQI ${bestOverall.avgUsAqi ?? '--'}) — यह दिन के सबसे प्रदूषित समय (${worstOverall.label}, ${worstOverall.avgPm25} µg/m³) से ${pctLowerThanPeak}% कम है।`;
  } else {
    shiftSummaryEn = `${bestOverall.label} is the lowest-pollution window available (${bestOverall.avgPm25 ?? '--'} µg/m³ PM2.5, US AQI ${bestOverall.avgUsAqi ?? '--'}) for your ${validDuration}-minute ${activity.nameEn.toLowerCase()}.`;
    shiftSummaryHi = `आपके ${validDuration} मिनट के ${activity.nameHi} के लिए ${bestOverall.label} सबसे कम प्रदूषण वाला उपलब्ध समय है (PM2.5 ${bestOverall.avgPm25 ?? '--'} µg/m³, US AQI ${bestOverall.avgUsAqi ?? '--'})।`;
  }

  const safetyWarning = buildSafetyWarning({
    activity,
    bestWindow: bestOverall,
    allWindowsUnhealthy,
    allElevatedForVigorous,
  });

  const transport = buildTransportAlternatives({
    activity,
    transportMode,
    bestWindow: bestOverall,
    allWindowsUnhealthy,
  });

  const dataLabel = series.isDemo
    ? {
        badgeEn: 'DEMO PRESET HOURLY CURVE',
        badgeHi: 'डेमो नमूना प्रति-घंटा डेटा',
        noteEn: 'DEMO DATA (Not Measured / Not Live) — Illustrative hourly pattern for testing.',
        noteHi: 'डेमो डेटा (मापा गया या लाइव नहीं) — यह परीक्षण के लिए नमूना पैटर्न है।',
      }
    : {
        badgeEn: 'MODELLED FORECAST (OPEN-METEO CAMS)',
        badgeHi: 'मॉडल-आधारित पूर्वानुमान (OPEN-METEO CAMS)',
        noteEn: 'MODELLED ESTIMATE (Not an official CPCB ground-station measurement) — Hourly CAMS air-quality forecast via Open-Meteo.',
        noteHi: 'मॉडल-आधारित अनुमान (आधिकारिक CPCB ग्राउंड स्टेशन माप नहीं) — Open-Meteo के माध्यम से CAMS प्रति-घंटा पूर्वानुमान।',
      };

  const timeline = series.slots.slice(0, 24).map((slot) => {
    const cat = classifyUsAqi(slot.usAqi);
    return {
      time: slot.time,
      hourLabel: formatHourLabel(slot),
      usAqi: slot.usAqi,
      pm25: slot.pm25,
      categoryCode: cat.code,
      isRecommended: bestSlotTimes.has(slot.time),
      isPreferred: isInPreferredTime(slot.hour, preferredTime),
    };
  });

  return {
    ok: true,
    city: {
      key: series.city.key,
      nameEn: series.city.nameEn,
      nameHi: series.city.nameHi,
      lat: series.city.lat,
      lon: series.city.lon,
    },
    modelGridCoords: series.modelGridCoords || null,
    isDemo: series.isDemo,
    dataType: series.dataType,
    provider: series.provider,
    timezone: series.timezone,
    observedAt: series.observedAt,
    dataLabel,
    preferences: {
      activity,
      preferredTime,
      durationMinutes: validDuration,
      transportMode,
    },
    allWindowsUnhealthy,
    bestWindow: bestOverall,
    preferredBestWindow: bestPreferred,
    explanationEn: shiftSummaryEn,
    explanationHi: shiftSummaryHi,
    safetyWarning,
    transportAlternatives: transport,
    timeline,
  };
}
