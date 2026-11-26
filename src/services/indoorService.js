import { getAqiReport, getUpcomingHourlySeries } from './aqiService.js';

/**
 * Evaluates upcoming hours to identify safe natural-ventilation (window-opening) hours.
 * Never claims unhealthy hours are safe for opening windows.
 */
function evaluateWindowSchedule(slots) {
  const daytime = slots.filter((s) => s.hour >= 6 && s.hour <= 21);
  const pool = daytime.length > 0 ? daytime : slots;

  // Safe natural-ventilation threshold: US AQI <= 100 and PM2.5 <= 35.4 µg/m³
  const cleanSlots = pool.filter(
    (s) =>
      (typeof s.usAqi === 'number' ? s.usAqi <= 100 : true) &&
      (typeof s.pm25 === 'number' ? s.pm25 <= 35.4 : true)
  );

  if (cleanSlots.length === 0) {
    const sorted = [...pool].sort((a, b) => (a.usAqi ?? 999) - (b.usAqi ?? 999));
    const leastBad = sorted[0];
    const hourText = leastBad ? `${String(leastBad.hour).padStart(2, '0')}:00` : '--';

    return {
      status: 'keep_closed',
      recommendedHoursEn: 'Keep windows closed today',
      recommendedHoursHi: 'आज खिड़कियाँ बंद रखें',
      detailEn: `No daytime hour drops to Good/Moderate levels (lowest slot is ${hourText} at US AQI ${leastBad?.usAqi ?? '--'}, PM2.5 ${leastBad?.pm25 ?? '--'} µg/m³). Keep outer windows sealed and rely on indoor filtration + kitchen exhaust.`,
      detailHi: `दिन के किसी भी घंटे में हवा अच्छी/मध्यम श्रेणी तक नहीं आती (न्यूनतम ${hourText} पर US AQI ${leastBad?.usAqi ?? '--'}, PM2.5 ${leastBad?.pm25 ?? '--'} µg/m³)। बाहरी खिड़कियाँ बंद रखें और इनडोर फिल्ट्रेशन व किचन एग्ज़ॉस्ट का उपयोग करें।`,
    };
  }

  const bestSlots = [...cleanSlots]
    .sort((a, b) => (a.usAqi ?? 999) - (b.usAqi ?? 999))
    .slice(0, 3)
    .sort((a, b) => a.hour - b.hour);

  const hourLabels = bestSlots.map((s) => `${String(s.hour).padStart(2, '0')}:00`).join(', ');
  const avgAqi = Math.round(
    bestSlots.reduce((acc, s) => acc + (s.usAqi ?? 0), 0) / bestSlots.length
  );

  return {
    status: 'open_selectively',
    recommendedHoursEn: `Best window: ${hourLabels}`,
    recommendedHoursHi: `सर्वोत्तम समय: ${hourLabels}`,
    detailEn: `Outside air reaches Good/Moderate levels around ${hourLabels} (avg US AQI ~${avgAqi}). Cross-ventilate for 15–20 minutes during these hours, then close windows before evening traffic buildup.`,
    detailHi: `${hourLabels} के आसपास बाहरी हवा अच्छी/मध्यम (औसत US AQI ~${avgAqi}) रहती है। इन घंटों में 15–20 मिनट क्रॉस-वेंटिलेशन करें और शाम के ट्रैफ़िक से पहले खिड़कियाँ बंद कर दें।`,
  };
}

function getSeverityTier(usAqi) {
  if (typeof usAqi !== 'number' || !Number.isFinite(usAqi)) return 'moderate';
  if (usAqi <= 50) return 'good';
  if (usAqi <= 100) return 'moderate';
  if (usAqi <= 150) return 'sensitive';
  return 'unhealthy';
}

function buildCards({ report, windowPlan, hasPurifier, cookingFuel, sensitiveMembers }) {
  const usAqi = report.metrics?.usAqi ?? report.aqi;
  const tier = getSeverityTier(usAqi);
  const highSmog = tier === 'unhealthy' || tier === 'sensitive';

  return [
    {
      id: 'windows',
      icon: 'window',
      priority: windowPlan.status === 'keep_closed' || sensitiveMembers ? 'high' : 'normal',
      titleEn: 'Safe Window-Opening Hours',
      titleHi: 'खिड़कियाँ खोलने का सुरक्षित समय',
      badgeEn: windowPlan.recommendedHoursEn,
      badgeHi: windowPlan.recommendedHoursHi,
      summaryEn: windowPlan.detailEn,
      summaryHi: windowPlan.detailHi,
      tipsEn: [
        windowPlan.status === 'keep_closed'
          ? 'Use rolled damp towels or foam weatherstripping on leaky window and balcony door gaps.'
          : 'Open opposite windows together for 15 minutes to flush indoor CO₂ quickly.',
        'Avoid opening road-facing windows during 08:00–11:00 and 18:00–21:30 peak traffic.',
      ],
      tipsHi: [
        windowPlan.status === 'keep_closed'
          ? 'खिड़की और बालकनी दरवाज़े की दरारों को फोम स्ट्रिप या गीले कपड़े से सील करें।'
          : 'अंदर की बासी हवा जल्दी निकालने के लिए आमने-सामने की खिड़कियाँ 15 मिनट साथ खोलें।',
        'सुबह 08:00–11:00 और शाम 18:00–21:30 पीक ट्रैफ़िक में सड़क की ओर वाली खिड़कियाँ न खोलें।',
      ],
    },
    {
      id: 'filtration',
      icon: 'purifier',
      priority: highSmog || sensitiveMembers ? 'high' : 'normal',
      titleEn: 'HEPA Purifiers & DIY Filtration',
      titleHi: 'HEPA एयर प्यूरीफायर और DIY फिल्ट्रेशन',
      badgeEn: hasPurifier ? 'HEPA Active Setup' : 'Low-Cost DIY / No Purifier',
      badgeHi: hasPurifier ? 'सक्रिय HEPA सेटअप' : 'कम-लागत DIY / बिना प्यूरीफायर',
      summaryEn: hasPurifier
        ? `Run a True HEPA (H13/H14) purifier sized for your room (CADR matched to area). ${highSmog ? 'Keep doors shut and run on medium-high in the bedroom/living space.' : 'Medium/auto mode is sufficient while indoor doors stay lightly closed.'}`
        : `Without a commercial purifier, focus on sealing one sleeping room and consider a DIY box-fan + MERV-13 filter setup for PM2.5 reduction. Note: indoor houseplants alone cannot meaningfully filter urban smog.`,
      summaryHi: hasPurifier
        ? `कमरे के आकार के अनुसार True HEPA (H13/H14) प्यूरीफायर चलाएं। ${highSmog ? 'दरवाज़े बंद रखकर बेडरूम/लिविंग रूम में मध्यम-तेज़ स्पीड पर चलाएं।' : 'ऑटो या मध्यम मोड पर्याप्त है।'}`
        : `कमर्शियल प्यूरीफायर न होने पर एक सोने के कमरे को सील रखें और PM2.5 कम करने के लिए DIY बॉक्स-फैन + MERV-13 फिल्टर विकल्प देखें। ध्यान दें: केवल इनडोर पौधे शहरी स्मॉग को पर्याप्त रूप से साफ नहीं कर सकते।`,
      tipsEn: [
        'Avoid "ionizer" or ozone-generating purifiers, which can emit lung-irritating ozone.',
        'Check and vacuum pre-filters every 2 weeks; replace HEPA cartridges per manufacturer schedule.',
      ],
      tipsHi: [
        'ओज़ोन या आयोनाइज़र वाले प्यूरीफायर से बचें, क्योंकि वे फेफड़ों को परेशान करने वाली ओज़ोन बना सकते हैं।',
        'प्री-फिल्टर हर 2 सप्ताह में साफ करें और समय पर HEPA फिल्टर बदलें।',
      ],
    },
    {
      id: 'kitchen',
      icon: 'kitchen',
      priority: cookingFuel === 'gas' ? 'high' : 'normal',
      titleEn: 'Kitchen Ventilation & Cooking Exhaust',
      titleHi: 'रसोई वेंटिलेशन और कुकिंग एग्ज़ॉस्ट',
      badgeEn: cookingFuel === 'gas' ? 'Gas / LPG Stove' : 'Electric / Induction',
      badgeHi: cookingFuel === 'gas' ? 'गैस / LPG स्टोव' : 'इलेक्ट्रिक / इंडक्शन',
      summaryEn:
        cookingFuel === 'gas'
          ? 'Gas flames emit NO₂ and high-heat frying/tadka generates heavy indoor PM2.5 spikes. Always switch on the chimney or exhaust fan 2 minutes before lighting the burner.'
          : 'Induction/electric cooking avoids gas-flame NO₂, though frying and tempering (tadka) still produce fine PM2.5 droplets—keep kitchen exhaust active while cooking.',
      summaryHi:
        cookingFuel === 'gas'
          ? 'गैस की लौ से NO₂ निकलती है और तलने/तड़के से घर में PM2.5 तेजी से बढ़ता है। बर्नर जलाने से 2 मिनट पहले चिमनी या एग्ज़ॉस्ट फैन चालू करें।'
          : 'इंडक्शन से गैस NO₂ नहीं बनती, पर तलने और तड़के से PM2.5 कण बनते हैं—खाना बनाते समय एग्ज़ॉस्ट फैन चालू रखें।',
      tipsEn: [
        'Leave the exhaust fan running for 10–15 minutes after cooking finishes.',
        'Use pot lids while boiling/simmering and close the kitchen door to contain fumes.',
      ],
      tipsHi: [
        'खाना बनने के बाद भी 10–15 मिनट तक एग्ज़ॉस्ट फैन चलता रहने दें।',
        'उबालते/पकाते समय ढक्कन लगाएं और धुआं अन्य कमरों में न जाए इसके लिए रसोई का दरवाज़ा बंद रखें।',
      ],
    },
    {
      id: 'dust',
      icon: 'dust',
      priority: (report.metrics?.pm10 ?? 0) > 100 ? 'high' : 'normal',
      titleEn: 'Indoor Dust & Pollution Control',
      titleHi: 'घर की धूल और प्रदूषण नियंत्रण',
      badgeEn: `PM10: ${report.metrics?.pm10 ?? '--'} µg/m³`,
      badgeHi: `PM10: ${report.metrics?.pm10 ?? '--'} µg/m³`,
      summaryEn:
        'Dry sweeping resuspends settled PM10 and heavy metals back into breathing height. Switch to damp mopping and microfiber cloths to trap dust permanently.',
      summaryHi:
        'सूखी झाड़ू लगाने से बैठी हुई धूल (PM10) फिर हवा में उड़ती है। धूल को हमेशा के लिए हटाने हेतु गीले पोंछे और माइक्रोफाइबर कपड़े का उपयोग करें।',
      tipsEn: [
        'Leave outdoor shoes at the entrance on a washable mat to keep road dust out.',
        'Wash bedsheets and curtains regularly; vacuum upholstery with a HEPA vacuum if available.',
      ],
      tipsHi: [
        'बाहर के जूते-चप्पल प्रवेश द्वार पर ही उतारें ताकि सड़क की धूल अंदर न आए।',
        'चादरें और पर्दे नियमित धोएं; संभव हो तो HEPA वैक्यूम क्लीनर का उपयोग करें।',
      ],
    },
    {
      id: 'smoke',
      icon: 'smoke',
      priority: 'high',
      titleEn: 'Reducing Indoor Smoke Exposure',
      titleHi: 'घर के अंदर धुएं का संपर्क कम करना',
      badgeEn: sensitiveMembers ? 'Extra Care: Sensitive Members' : 'Zero-Indoor-Smoke Habit',
      badgeHi: sensitiveMembers ? 'अतिरिक्त सावधानी: संवेदनशील सदस्य' : 'धूम्र-मुक्त घर आदत',
      summaryEn:
        'When outdoor smog forces windows shut, indoor smoke sources—incense (agarbatti/dhoop), mosquito coils, scented candles, and tobacco—accumulate to severe PM2.5 levels rapidly.',
      summaryHi:
        'जब बाहर के स्मॉग के कारण खिड़कियाँ बंद रहती हैं, तो अगरबत्ती, धूप, मच्छर कॉइल, मोमबत्ती और तंबाकू का धुआं कमरे में तेजी से खतरनाक PM2.5 स्तर बना देता है।',
      tipsEn: [
        'Keep smoking strictly outdoors away from windows and air intakes.',
        'Replace burning mosquito coils with window mesh screens or electric liquid/net barriers, and skip incense on high-AQI days.',
      ],
      tipsHi: [
        'धूम्रपान घर और खिड़कियों से पूरी तरह दूर रखें।',
        'मच्छर कॉइल के बजाय मच्छरदानी/जाली उपयोग करें और उच्च AQI दिनों में अगरबत्ती/धूप जलाने से बचें।',
      ],
    },
  ];
}

function buildChecklist({ windowPlan, hasPurifier, cookingFuel, sensitiveMembers }) {
  return [
    {
      id: 'chk_windows',
      titleEn:
        windowPlan.status === 'keep_closed'
          ? 'Keep outer windows shut and seal visible door/window gaps'
          : `Ventilate briefly (${windowPlan.recommendedHoursEn}) then close before evening traffic`,
      titleHi:
        windowPlan.status === 'keep_closed'
          ? 'बाहरी खिड़कियाँ बंद रखें और दरवाज़े/खिड़की की दरारें सील करें'
          : `कम समय के लिए हवा बदलें (${windowPlan.recommendedHoursHi}) फिर शाम से पहले बंद करें`,
    },
    {
      id: 'chk_kitchen',
      titleEn:
        cookingFuel === 'gas'
          ? 'Run kitchen exhaust/chimney before lighting gas and 15 min after cooking'
          : 'Switch on kitchen exhaust while frying or tempering (tadka)',
      titleHi:
        cookingFuel === 'gas'
          ? 'गैस जलाने से पहले और खाना बनने के 15 मिनट बाद तक एग्ज़ॉस्ट/चिमनी चलाएं'
          : 'तलने या तड़का लगाते समय किचन एग्ज़ॉस्ट फैन चालू रखें',
    },
    {
      id: 'chk_mop',
      titleEn: 'Wet-mop floors and damp-dust surfaces instead of dry sweeping',
      titleHi: 'सूखी झाड़ू के बजाय गीला पोंछा लगाएं और गीले कपड़े से धूल पोंछें',
    },
    {
      id: 'chk_smoke',
      titleEn: 'Avoid incense (agarbatti/dhoop), mosquito coils, and indoor smoke today',
      titleHi: 'आज घर के अंदर अगरबत्ती, धूप, मच्छर कॉइल और धुएं से बचें',
    },
    {
      id: 'chk_filter',
      titleEn: hasPurifier
        ? 'Close bedroom doors and run True HEPA purifier (clean pre-filter weekly)'
        : 'Keep one sleeping room tightly closed; consider a MERV-13 DIY fan filter',
      titleHi: hasPurifier
        ? 'बेडरूम का दरवाज़ा बंद कर True HEPA प्यूरीफायर चलाएं (प्री-फिल्टर साफ रखें)'
        : 'एक सोने का कमरा अच्छी तरह बंद रखें; MERV-13 DIY फैन फिल्टर पर विचार करें',
    },
    {
      id: 'chk_entry',
      titleEn: sensitiveMembers
        ? 'Keep shoes at the door and keep prescribed asthma/allergy medication accessible'
        : 'Leave shoes on the entry mat and wipe pet paws/outer coats after traffic',
      titleHi: sensitiveMembers
        ? 'जूते दरवाज़े पर उतारें और अस्थमा/एलर्जी की निर्धारित दवा पास रखें'
        : 'जूते प्रवेश द्वार पर उतारें और बाहर से आने के बाद धूल झाड़ें',
    },
  ];
}

/**
 * Generates personalized indoor air-quality recommendations grounded in current AQI.
 */
export async function generateIndoorRecommendations({
  cityKey = 'delhi',
  mode = 'demo',
  scale = 'us',
  hasPurifier = false,
  cookingFuel = 'gas',
  sensitiveMembers = false,
  fetchImpl = fetch,
} = {}) {
  const safeFuel = cookingFuel === 'electric' ? 'electric' : 'gas';

  const [report, hourly] = await Promise.all([
    getAqiReport({ cityKey, mode, scale, fetchImpl }),
    getUpcomingHourlySeries({ cityKey, mode, fetchImpl }),
  ]);

  const windowPlan = evaluateWindowSchedule(hourly.slots);
  const cards = buildCards({
    report,
    windowPlan,
    hasPurifier: Boolean(hasPurifier),
    cookingFuel: safeFuel,
    sensitiveMembers: Boolean(sensitiveMembers),
  });
  const checklist = buildChecklist({
    windowPlan,
    hasPurifier: Boolean(hasPurifier),
    cookingFuel: safeFuel,
    sensitiveMembers: Boolean(sensitiveMembers),
  });

  const dataLabel = report.isDemo
    ? {
        badgeEn: 'DEMO DATA',
        badgeHi: 'डेमो डेटा',
        noteEn:
          'DEMO DATA ONLY — Recommendations are tailored to an illustrative preset, not live sensor readings.',
        noteHi:
          'केवल डेमो डेटा — सुझाव नमूना डेटा पर आधारित हैं, लाइव सेंसर रीडिंग पर नहीं।',
      }
    : {
        badgeEn: 'LIVE MODELLED (OPEN-METEO)',
        badgeHi: 'लाइव मॉडल (OPEN-METEO)',
        noteEn:
          'LIVE MODELLED ESTIMATE (Open-Meteo CAMS, not an official CPCB station reading) — Paired with general indoor clean-air guidance.',
        noteHi:
          'लाइव मॉडल अनुमान (Open-Meteo CAMS, आधिकारिक CPCB स्टेशन माप नहीं) — सामान्य इनडोर स्वच्छ-हवा मार्गदर्शन के साथ।',
      };

  return {
    ok: true,
    city: report.city,
    isDemo: report.isDemo,
    scale: report.scale,
    aqi: report.aqi,
    usAqi: report.metrics?.usAqi ?? null,
    category: report.category,
    provider: report.provider,
    observedAt: report.observedAt,
    updatedLabelEn: report.updatedLabelEn,
    updatedLabelHi: report.updatedLabelHi,
    dataLabel,
    windowPlan,
    cards,
    checklist,
    generalDisclaimerEn:
      'General Guidance Disclaimer: These indoor steps follow established clean-air hygiene practices. They are informational only and do not constitute medical diagnosis or treatment.',
    generalDisclaimerHi:
      'सामान्य मार्गदर्शन अस्वीकरण: ये इनडोर उपाय स्थापित स्वच्छ-वायु अभ्यासों पर आधारित हैं। यह केवल सामान्य जानकारी है, चिकित्सीय सलाह या उपचार नहीं।',
  };
}
