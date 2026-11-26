/**
 * Server-side AI Air-Quality Chatbot service for SmogSaathi AI.
 *
 * Security & Honesty Rules:
 * - Reads GEMINI_API_KEY strictly on the server (never exposed to browser code).
 * - If no API key is configured, runs a clearly labeled Built-in Demo Guidance Engine
 *   (isDemoAi: true) instead of pretending live AI is connected.
 * - Clearly distinguishes general air-quality guidance from real-time/modelled AQI data.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const TOPIC_RULES = [
  {
    topic: 'mask',
    keywords: ['mask', 'n95', 'n99', 'ffp2', 'cloth', 'surgical', 'मास्क', 'एन95'],
  },
  {
    topic: 'outdoor',
    keywords: [
      'walk',
      'run',
      'jog',
      'exercise',
      'outdoor',
      'park',
      'sport',
      'morning',
      'evening',
      'टहल',
      'सैर',
      'दौड़',
      'व्यायाम',
      'बाहर',
      'खेल',
      'सुबह',
    ],
  },
  {
    topic: 'commute',
    keywords: [
      'commute',
      'travel',
      'office',
      'school',
      'traffic',
      'metro',
      'bus',
      'cycle',
      'car',
      'emission',
      'यात्रा',
      'ऑफिस',
      'स्कूल',
      'ट्रैफ़िक',
      'मेट्रो',
      'साइकिल',
      'उत्सर्जन',
    ],
  },
  {
    topic: 'indoor',
    keywords: [
      'indoor',
      'home',
      'house',
      'room',
      'window',
      'purifier',
      'hepa',
      'cook',
      'kitchen',
      'ventilation',
      'plant',
      'घर',
      'कमरे',
      'इनडोर',
      'खिड़की',
      'प्यूरीफायर',
      'रसोई',
      'वेंटिलेशन',
    ],
  },
  {
    topic: 'pollutants',
    keywords: [
      'pm2.5',
      'pm25',
      'pm10',
      'no2',
      'ozone',
      'o3',
      'so2',
      'co',
      'cpcb',
      'us aqi',
      'scale',
      'difference',
      'प्रदूषक',
      'पीएम',
      'पैमाना',
      'अंतर',
      'ओज़ोन',
    ],
  },
  {
    topic: 'sensitive',
    keywords: [
      'child',
      'kids',
      'elderly',
      'asthma',
      'pregnant',
      'heart',
      'lung',
      'cough',
      'breathing',
      'बच्चे',
      'बुजुर्ग',
      'अस्थमा',
      'दमा',
      'खांसी',
      'सांस',
    ],
  },
];

function detectLanguage(message, requestedLang) {
  if (/[\u0900-\u097F]/.test(message)) {
    return 'hi';
  }
  return requestedLang === 'hi' ? 'hi' : 'en';
}

function detectTopic(message) {
  const lower = message.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.topic;
    }
  }
  return 'general';
}

function getSeverityBucket(aqi, scale) {
  if (typeof aqi !== 'number' || !Number.isFinite(aqi)) return 'unknown';
  if (scale === 'cpcb') {
    if (aqi <= 100) return 'low';
    if (aqi <= 200) return 'moderate';
    if (aqi <= 300) return 'high';
    return 'severe';
  }
  if (aqi <= 100) return 'low';
  if (aqi <= 150) return 'moderate';
  if (aqi <= 200) return 'high';
  return 'severe';
}

function formatContextSummary(ctx, lang) {
  const isHi = lang === 'hi';
  if (!ctx || !ctx.city) {
    return isHi
      ? 'वर्तमान शहर डेटा उपलब्ध नहीं है — नीचे सामान्य मार्गदर्शन दिया जा रहा है।'
      : 'No city AQI snapshot is loaded yet — providing general guidance below.';
  }

  const cityName = isHi ? ctx.city.nameHi || ctx.city.nameEn : ctx.city.nameEn || ctx.city.key;
  const scaleLabel = ctx.scale === 'cpcb' ? 'India CPCB AQI' : 'US AQI';
  const aqiText = ctx.aqi !== null && ctx.aqi !== undefined ? `${ctx.aqi} ${scaleLabel}` : scaleLabel;
  const categoryText = isHi ? ctx.category?.labelHi : ctx.category?.labelEn;
  const sourceKind = ctx.isDemo
    ? isHi
      ? 'डेमो नमूना डेटा (लाइव नहीं)'
      : 'Demo preset data (not live)'
    : isHi
      ? 'Open-Meteo CAMS मॉडल अनुमान (आधिकारिक CPCB स्टेशन माप नहीं)'
      : 'Open-Meteo CAMS modelled estimate (not an official CPCB station reading)';
  const timeText = isHi ? ctx.updatedLabelHi || 'उपलब्ध नहीं' : ctx.updatedLabelEn || 'Unavailable';

  return isHi
    ? `संदर्भ (${cityName}): ${aqiText}${categoryText ? ` — ${categoryText}` : ''} | स्रोत: ${sourceKind} | समय: ${timeText}`
    : `Context (${cityName}): ${aqiText}${categoryText ? ` — ${categoryText}` : ''} | Source: ${sourceKind} | Time: ${timeText}`;
}

function buildDemoGuidanceBody(topic, severity, ctx, lang) {
  const isHi = lang === 'hi';
  const pm25 = ctx?.metrics?.pm25;
  const pm10 = ctx?.metrics?.pm10;
  const dom = ctx?.cpcbDetails?.dominantPollutant;

  if (topic === 'mask') {
    return isHi
      ? [
          severity === 'low'
            ? '• मास्क सलाह: अभी AQI कम/मध्यम है; सामान्य लोगों को मास्क ज़रूरी नहीं है, पर भारी ट्रैफ़िक में संवेदनशील व्यक्ति मास्क पहन सकते हैं।'
            : '• मास्क सलाह: PM2.5 जैसे सूक्ष्म कणों से बचने के लिए चेहरे पर ठीक से फिट होने वाला N95/FFP2 मास्क पहनें। कपड़े या ढीले सर्जिकल मास्क PM2.5 को नहीं रोकते।',
          '• कम-उत्सर्जन सुझाव: डिस्पोज़ेबल मास्क बार-बार फेंकने के बजाय साफ सूखे वातावरण में रोटेशन में रखें और पैदल/मेट्रो यात्रा चुनकर ट्रैफ़िक धुएं से बचें।',
        ]
      : [
          severity === 'low'
            ? '• Mask guidance: Current AQI is relatively mild, so most people do not need a mask outdoors, though sensitive individuals may wear one in heavy traffic.'
            : '• Mask guidance: Use a snug-fitting N95 or FFP2 respirator without gaps around the nose bridge. Cloth and loose surgical masks do not filter fine PM2.5 particles effectively.',
          '• Low-emission tip: Rotate reusable N95 respirators cleanly instead of single-use waste, and choose lower-traffic walking or metro corridors.',
        ];
  }

  if (topic === 'outdoor') {
    return isHi
      ? [
          severity === 'severe' || severity === 'high'
            ? '• बाहरी गतिविधि: अभी बाहर दौड़ने या भारी व्यायाम से बचें, क्योंकि तेज़ सांस लेने से फेफड़ों में अधिक PM2.5 जाता है। हल्के काम दोपहर बाद के कम स्मॉग समय में रखें।'
            : '• बाहरी गतिविधि: हल्की सैर संभव है, लेकिन मुख्य सड़कों के बजाय हरे पार्क या कम ट्रैफ़िक वाली गलियों को चुनें।',
          '• कम-उत्सर्जन सुझाव: पास के काम पैदल या साइकिल से (जब हवा सुरक्षित हो) निपटाएं और वाहन इंजन को अनावश्यक स्टार्ट (idle) न रखें।',
        ]
      : [
          severity === 'severe' || severity === 'high'
            ? '• Outdoor activity: Pause vigorous outdoor running or sports right now, as rapid breathing draws more PM2.5 deep into the lungs. Prefer light indoor stretching.'
            : '• Outdoor activity: Outdoor walks are reasonable right now—pick tree-lined parks or quiet residential lanes over arterial roads.',
          '• Low-emission tip: Combine nearby errands into a single trip and walk or cycle during cleaner afternoon hours instead of short car/scooter hops.',
        ];
  }

  if (topic === 'commute') {
    return isHi
      ? [
          '• यात्रा योजना: पीक ट्रैफ़िक (सुबह 8–11 और शाम 6–9) के बजाय ऑफ-पीक समय में निकलें। कैब/कार के अंदर हों तो AC रीसर्कुलेशन (recirculation) मोड ऑन रखें।',
          '• कम-उत्सर्जन सिफारिश: मेट्रो, इलेक्ट्रिक बस, ई-रिक्शा या कारपूल को प्राथमिकता दें—व्यक्तिगत ईंधन वाहनों की तुलना में प्रति व्यक्ति उत्सर्जन काफी घटता है। यदि दोपहिया वाहन से जाएं तो N95 मास्क अवश्य पहनें।',
        ]
      : [
          '• Commute plan: Shift travel outside peak traffic hours (8–11 AM and 6–9 PM) where possible. Inside enclosed vehicles on busy roads, switch AC to recirculation mode.',
          '• Low-emission choice: Prefer metro rail, electric buses, carpooling, or combined errands to cut tailpipe emissions per trip. If riding a two-wheeler or walking near traffic, wear a fitted N95 mask.',
        ];
  }

  if (topic === 'indoor') {
    return isHi
      ? [
          severity === 'low'
            ? '• इनडोर हवा: अभी बाहर की हवा अपेक्षाकृत बेहतर है, इसलिए क्रॉस-वेंटिलेशन के लिए खिड़कियाँ खोल सकते हैं।'
            : '• इनडोर हवा: बाहर स्मॉग अधिक होने पर खिड़कियाँ और दरवाज़ों की दरारें बंद रखें; केवल दोपहर के अपेक्षाकृत साफ घंटों में 15–20 मिनट वेंटिलेशन करें।',
          '• व्यावहारिक उपाय: खाना बनाते समय चिमनी/एग्ज़ॉस्ट फैन चलाएं, सूखी झाड़ू की जगह गीला पोंछा लगाएं, अगरबत्ती/धूप कम जलाएं और संभव हो तो HEPA एयर प्यूरीफायर उपयोग करें।',
          '• कम-उत्सर्जन सुझाव: ऊर्जा बचत के लिए केवल उपयोग वाले एक कमरे को सील कर प्यूरीफायर मध्यम स्पीड पर चलाएं।',
        ]
      : [
          severity === 'low'
            ? '• Indoor air: Outside air is mild right now—opening windows briefly for cross-ventilation helps flush indoor CO₂ and cooking fumes.'
            : '• Indoor air: Keep outer windows closed during smog peaks and seal large door gaps; ventilate briefly for 15–20 minutes only during cleaner mid-afternoon hours.',
          '• Practical steps: Always run kitchen exhaust while cooking, wet-mop instead of dry sweeping, avoid indoor incense/smoke, and run a HEPA purifier in the main living/sleeping room.',
          '• Low-emission tip: Focus filtration on one closed bedroom at medium fan speed to save electricity while keeping sleep air clean.',
        ];
  }

  if (topic === 'pollutants') {
    const metricLineEn =
      typeof pm25 === 'number' || typeof pm10 === 'number'
        ? `Current snapshot metrics — PM2.5: ${pm25 ?? '--'} µg/m³, PM10: ${pm10 ?? '--'} µg/m³${dom ? ` (CPCB dominant: ${dom})` : ''}.`
        : 'PM2.5 (<2.5 µm) penetrates deep into lungs; PM10 (<10 µm) comes largely from road and construction dust.';
    const metricLineHi =
      typeof pm25 === 'number' || typeof pm10 === 'number'
        ? `वर्तमान रीडिंग — PM2.5: ${pm25 ?? '--'} µg/m³, PM10: ${pm10 ?? '--'} µg/m³${dom ? ` (CPCB प्रमुख प्रदूषक: ${dom})` : ''}।`
        : 'PM2.5 (<2.5 µm) फेफड़ों की गहराई तक पहुँचता है; PM10 (<10 µm) मुख्यतः सड़क व निर्माण की धूल से आता है।';

    return isHi
      ? [
          `• प्रदूषक और पैमाने: ${metricLineHi}`,
          '• US AQI बनाम भारत CPCB AQI: दोनों एक नहीं हैं। US AQI (EPA) में 151–200 "Unhealthy" है, जबकि भारत CPCB (NAQI) 24h PM2.5/PM10/NO₂/SO₂ व 8h O₃/CO औसत और अलग भारतीय ब्रेकपॉइंट्स (0–500, Poor 201–300, Very Poor 301–400, Severe 401–500) का उपयोग करता है।',
          '• कम-उत्सर्जन सुझाव: वाहन उत्सर्जन (PM2.5/NO₂) और कचरा जलाना रोकना सबसे तेज़ स्थानीय प्रभाव डालता है।',
        ]
      : [
          `• Pollutants breakdown: ${metricLineEn}`,
          '• US AQI vs India CPCB AQI: They are distinct scales and never interchangeable. India CPCB NAQI computes sub-indices from 24h averages (PM2.5, PM10, NO₂, SO₂) and 8h averages (O₃, CO) across Indian bands (Satisfactory 51–100, Moderately Polluted 101–200, Poor 201–300, Very Poor 301–400, Severe 401–500).',
          '• Low-emission tip: Cutting idling traffic and avoiding open biomass/waste burning directly lowers PM2.5 and NO₂.',
        ];
  }

  if (topic === 'sensitive') {
    return isHi
      ? [
          '• संवेदनशील समूह (बच्चे, बुजुर्ग, अस्थमा/हृदय रोगी): जब AQI "मध्यम प्रदूषित / Poor" या अधिक हो, तो सुबह की सैर घर के अंदर रखें और डॉक्टर द्वारा दी गई इन्हेलर/दवा पास रखें।',
          '• सुरक्षा व कम-उत्सर्जन: स्कूल/अस्पताल यात्रा के लिए बंद, कम-ट्रैफ़िक या इलेक्ट्रिक सार्वजनिक परिवहन चुनें और घर में गीले पोंछे से धूल कम रखें।',
        ]
      : [
          '• Sensitive groups (children, older adults, asthma/heart conditions): Keep exercise indoors whenever air reaches Moderately Polluted / Poor or worse, and keep prescribed inhalers accessible.',
          '• Practical care & low-emission tip: Choose enclosed low-traffic or electric transit for school/clinic trips and keep indoor air dust-free with wet mopping.',
        ];
  }

  // General fallback guidance
  return isHi
    ? [
        severity === 'severe' || severity === 'high'
          ? '• वर्तमान सलाह: हवा अस्वस्थ/खराब श्रेणी में है—बाहर भारी श्रम टालें, N95 मास्क पहनें और घर की खिड़कियाँ बंद रखें।'
          : '• वर्तमान सलाह: बाहर जाते समय ट्रैफ़िक से दूर रास्ते चुनें और रसोई वेंटिलेशन चालू रखें।',
        '• कम-उत्सर्जन दिनचर्या: मेट्रो/बस/कारपूल अपनाएं, अनावश्यक गाड़ी स्टार्ट न छोड़ें और काम एक साथ निपटाएं। आप मुझसे मास्क, PM2.5, यात्रा या इनडोर हवा के बारे में पूछ सकते हैं!',
      ]
    : [
        severity === 'severe' || severity === 'high'
          ? '• Immediate guidance: Air quality is elevated—skip strenuous outdoor workouts, wear a snug N95 mask in traffic, and keep windows closed during peak smog.'
          : '• Immediate guidance: Prefer low-traffic routes outdoors and maintain good kitchen exhaust indoors.',
        '• Low-emission routine: Use public transit, carpool, or combine short errands to cut tailpipe pollution. Ask me specifically about masks, PM2.5/CPCB scales, commuting, or indoor air!',
      ];
}

function buildDemoChatReply({ message, lang, aqiContext }) {
  const resolvedLang = detectLanguage(message, lang);
  const topic = detectTopic(message);
  const severity = getSeverityBucket(aqiContext?.aqi, aqiContext?.scale);

  const contextLine = formatContextSummary(aqiContext, resolvedLang);
  const guidanceLines = buildDemoGuidanceBody(topic, severity, aqiContext, resolvedLang);
  const generalNote =
    resolvedLang === 'hi'
      ? 'सामान्य मार्गदर्शन नोट: यह डेमो नियम-आधारित सहायक उत्तर है (लाइव Gemini AI कुंजी कॉन्फ़िगर नहीं है) और चिकित्सकीय सलाह या आधिकारिक CPCB स्टेशन डेटा का विकल्प नहीं है।'
      : 'General Guidance Note: This reply comes from the built-in Demo Guidance Engine (no live Gemini API key configured) and provides general tips, not medical advice or official CPCB ground-station telemetry.';

  return {
    ok: true,
    isDemoAi: true,
    aiMode: 'demo',
    provider: 'SmogSaathi Built-in Demo Guidance Engine',
    lang: resolvedLang,
    topic,
    reply: [contextLine, '', ...guidanceLines, '', generalNote].join('\n'),
  };
}

function buildGeminiSystemInstruction(aqiContext, lang) {
  const contextJson = aqiContext
    ? JSON.stringify({
        city: aqiContext.city?.nameEn,
        mode: aqiContext.isDemo ? 'DEMO_PRESET' : 'LIVE_OPEN_METEO_CAMS_MODELLED',
        scale: aqiContext.scale === 'cpcb' ? 'India CPCB NAQI' : 'US EPA AQI',
        aqi: aqiContext.aqi,
        category: aqiContext.category?.labelEn,
        dominantPollutant: aqiContext.cpcbDetails?.dominantPollutant || null,
        observedAt: aqiContext.updatedLabelEn || null,
        metrics: aqiContext.metrics || null,
      })
    : 'No AQI snapshot provided';

  return [
    'You are SmogSaathi AI, a helpful urban air quality assistant.',
    lang === 'hi'
      ? 'Respond in clear, natural Hindi (Devanagari script). Use simple everyday words.'
      : 'Respond in clear, concise English (or Hindi if the user writes in Hindi).',
    'Cover AQI, PM2.5, PM10, masks, outdoor activities, commuting, indoor pollution, and practical low-emission recommendations.',
    'STRICT HONESTY RULES:',
    '1. Never invent live AQI or sensor numbers. Only cite numbers present in the context JSON below.',
    '2. Explicitly state whether the city AQI context is DEMO preset data or Open-Meteo CAMS modelled estimates (not official CPCB ground station measurements).',
    '3. Clearly distinguish current city context from general air-quality guidance, and never give medical diagnoses.',
    'Keep replies structured, practical, and under 180 words.',
    `CURRENT_CITY_CONTEXT: ${contextJson}`,
  ].join('\n');
}

async function callLiveGemini({ message, lang, history, aqiContext, config, fetchImpl }) {
  const model = config.geminiModel || 'gemini-2.5-flash';
  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;

  const contents = [];
  for (const turn of history.slice(-6)) {
    if (!turn || typeof turn.text !== 'string' || !turn.text.trim()) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text.trim().slice(0, 1000) }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.geminiApiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildGeminiSystemInstruction(aqiContext, lang) }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 450,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  const replyText = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!replyText) {
    throw new Error('Gemini API returned an empty response.');
  }

  return {
    ok: true,
    isDemoAi: false,
    aiMode: 'live',
    provider: `Gemini (${model})`,
    lang: detectLanguage(message, lang),
    reply: replyText,
  };
}

/**
 * Main chatbot handler called by POST /api/chat.
 */
export async function generateChatReply({
  message,
  lang = 'en',
  history = [],
  aqiContext = null,
  config = {},
  fetchImpl = fetch,
} = {}) {
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage) {
    const err = new Error('Please enter a question before sending.');
    err.statusCode = 400;
    throw err;
  }

  if (cleanMessage.length > 1000) {
    const err = new Error('Message is too long (maximum 1000 characters).');
    err.statusCode = 400;
    throw err;
  }

  const safeLang = lang === 'hi' ? 'hi' : 'en';
  const safeHistory = Array.isArray(history) ? history : [];

  if (!config.geminiApiKey) {
    return buildDemoChatReply({
      message: cleanMessage,
      lang: safeLang,
      aqiContext,
    });
  }

  try {
    return await callLiveGemini({
      message: cleanMessage,
      lang: safeLang,
      history: safeHistory,
      aqiContext,
      config,
      fetchImpl,
    });
  } catch (err) {
    const upstreamErr = new Error(`Live AI assistant failed: ${err.message}`);
    upstreamErr.statusCode = 502;
    throw upstreamErr;
  }
}
