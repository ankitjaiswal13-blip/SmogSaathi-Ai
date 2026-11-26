import { TRANSLATIONS } from './i18n.js';

const CHAT_STORAGE_KEY = 'smogsaathi_chat_history';
const INDOOR_CHECKS_KEY = 'smogsaathi_indoor_checks';

function loadSessionHistory() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadIndoorChecks() {
  try {
    const raw = localStorage.getItem(INDOOR_CHECKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const state = {
  lang: localStorage.getItem('smogsaathi_lang') === 'hi' ? 'hi' : 'en',
  city: 'delhi',
  mode: 'demo',
  scale: localStorage.getItem('smogsaathi_scale') === 'cpcb' ? 'cpcb' : 'us',
  healthStatus: 'checking', // 'checking' | 'connected' | 'offline'
  aiConfigured: false,
  fetchState: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  lastRefreshedAt: null,
  lastReport: null,
  lastRoutinePlan: null,
  lastIndoorPlan: null,
  indoorChecks: loadIndoorChecks(),
  cities: [],
  activeAqiController: null,
  activeRoutineController: null,
  activeIndoorController: null,
  chatHistory: loadSessionHistory(),
  chatLoading: false,
  lastFailedPrompt: null,
};

const els = {
  aqiCard: document.getElementById('aqi-checker'),
  langButtons: document.querySelectorAll('.lang-btn'),
  modeButtons: document.querySelectorAll('.mode-btn'),
  scaleButtons: document.querySelectorAll('.scale-btn'),
  citySelect: document.getElementById('city-select'),
  menuToggle: document.getElementById('menu-toggle'),
  primaryNav: document.getElementById('primary-nav'),
  sourceBadge: document.getElementById('source-badge'),
  statusBanner: document.getElementById('aqi-status-banner'),
  scenarioTitle: document.getElementById('scenario-title'),
  sourceDisclaimer: document.getElementById('source-disclaimer'),
  loadingBox: document.getElementById('aqi-loading-box'),
  errorBox: document.getElementById('aqi-error-box'),
  errorText: document.getElementById('aqi-error-text'),
  retryBtn: document.getElementById('retry-aqi-btn'),
  fallbackDemoBtn: document.getElementById('fallback-demo-btn'),
  aqiReadout: document.getElementById('aqi-readout'),
  aqiScoreRing: document.getElementById('aqi-score-ring'),
  aqiValue: document.getElementById('aqi-value'),
  aqiUnit: document.getElementById('aqi-unit'),
  aqiCategory: document.getElementById('aqi-category'),
  aqiScalePill: document.getElementById('aqi-scale-pill'),
  aqiAdvice: document.getElementById('aqi-advice'),
  aqiProvider: document.getElementById('aqi-provider'),
  aqiObserved: document.getElementById('aqi-observed'),
  aqiRefreshed: document.getElementById('aqi-refreshed'),
  cpcbNoteBox: document.getElementById('cpcb-note-box'),
  cpcbDominant: document.getElementById('cpcb-dominant'),
  cpcbAveraging: document.getElementById('cpcb-averaging'),
  cpcbSubindices: document.getElementById('cpcb-subindices'),
  valPm25: document.getElementById('val-pm25'),
  valPm10: document.getElementById('val-pm10'),
  valNo2: document.getElementById('val-no2'),
  valO3: document.getElementById('val-o3'),
  valSo2: document.getElementById('val-so2'),
  valCo: document.getElementById('val-co'),
  refreshBtn: document.getElementById('refresh-aqi-btn'),
  fetchStatusPill: document.getElementById('fetch-status-pill'),
  serverStatusPill: document.getElementById('server-status-pill'),
  // Chatbot elements
  chatAiBadge: document.getElementById('chat-ai-badge'),
  chatAiNote: document.getElementById('chat-ai-note'),
  chatProviderLabel: document.getElementById('chat-provider-label'),
  chatContextPill: document.getElementById('chat-context-pill'),
  chatMessages: document.getElementById('chat-messages'),
  chatLoadingBar: document.getElementById('chat-loading-bar'),
  chatErrorBar: document.getElementById('chat-error-bar'),
  chatErrorText: document.getElementById('chat-error-text'),
  chatRetryBtn: document.getElementById('chat-retry-btn'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  chatSendBtn: document.getElementById('chat-send-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  chipButtons: document.querySelectorAll('.chip-btn'),
  // Routine Planner elements
  routineForm: document.getElementById('routine-form'),
  routineCitySelect: document.getElementById('routine-city-select'),
  routineActivity: document.getElementById('routine-activity'),
  routineTime: document.getElementById('routine-time'),
  routineDuration: document.getElementById('routine-duration'),
  routineTransport: document.getElementById('routine-transport'),
  routineSubmitBtn: document.getElementById('routine-submit-btn'),
  routineSourceSync: document.getElementById('routine-source-sync'),
  routineDataBadge: document.getElementById('routine-data-badge'),
  routineDataNote: document.getElementById('routine-data-note'),
  routineLoadingBox: document.getElementById('routine-loading-box'),
  routineErrorBox: document.getElementById('routine-error-box'),
  routineErrorText: document.getElementById('routine-error-text'),
  routineRetryBtn: document.getElementById('routine-retry-btn'),
  routineDemoBtn: document.getElementById('routine-demo-btn'),
  routineOutput: document.getElementById('routine-output'),
  routineSafetyBanner: document.getElementById('routine-safety-banner'),
  routineSafetyTitle: document.getElementById('routine-safety-title'),
  routineSafetyDetail: document.getElementById('routine-safety-detail'),
  routineBestWindow: document.getElementById('routine-best-window'),
  routineExplanation: document.getElementById('routine-explanation'),
  routineTransportList: document.getElementById('routine-transport-list'),
  routineTimeline: document.getElementById('routine-timeline'),
  // Indoor Dashboard elements
  indoorCitySelect: document.getElementById('indoor-city-select'),
  indoorPurifierSelect: document.getElementById('indoor-purifier-select'),
  indoorCookingSelect: document.getElementById('indoor-cooking-select'),
  indoorSensitiveSelect: document.getElementById('indoor-sensitive-select'),
  indoorContextSummary: document.getElementById('indoor-context-summary'),
  indoorDataBadge: document.getElementById('indoor-data-badge'),
  indoorDataNote: document.getElementById('indoor-data-note'),
  indoorLoadingBox: document.getElementById('indoor-loading-box'),
  indoorErrorBox: document.getElementById('indoor-error-box'),
  indoorErrorText: document.getElementById('indoor-error-text'),
  indoorRetryBtn: document.getElementById('indoor-retry-btn'),
  indoorDemoBtn: document.getElementById('indoor-demo-btn'),
  indoorOutput: document.getElementById('indoor-output'),
  indoorWindowBanner: document.getElementById('indoor-window-banner'),
  indoorWindowTitle: document.getElementById('indoor-window-title'),
  indoorWindowDetail: document.getElementById('indoor-window-detail'),
  indoorCardsGrid: document.getElementById('indoor-cards-grid'),
  indoorChecklist: document.getElementById('indoor-checklist'),
  indoorChecklistProgress: document.getElementById('indoor-checklist-progress'),
  indoorProgressFill: document.getElementById('indoor-progress-fill'),
  indoorChecklistDoneBanner: document.getElementById('indoor-checklist-done-banner'),
  indoorResetChecksBtn: document.getElementById('indoor-reset-checks-btn'),
  indoorGeneralDisclaimer: document.getElementById('indoor-general-disclaimer'),
};

function getDict() {
  return TRANSLATIONS[state.lang] || TRANSLATIONS.en;
}

function formatLocalTime(isoOrDate) {
  if (!isoOrDate) return '--';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString(state.lang === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function saveSessionHistory() {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state.chatHistory.slice(-20)));
  } catch {
    // Ignore storage quota errors safely.
  }
}

function renderHealthStatus() {
  const dict = getDict();
  els.serverStatusPill.classList.remove('is-checking', 'is-connected', 'is-offline');

  if (state.healthStatus === 'connected') {
    els.serverStatusPill.classList.add('is-connected');
    els.serverStatusPill.textContent = dict.serverReady;
  } else if (state.healthStatus === 'offline') {
    els.serverStatusPill.classList.add('is-offline');
    els.serverStatusPill.textContent = dict.serverOffline;
  } else {
    els.serverStatusPill.classList.add('is-checking');
    els.serverStatusPill.textContent = dict.serverChecking;
  }
}

function renderChatModeStatus() {
  const dict = getDict();
  const isLive = Boolean(state.aiConfigured);

  els.chatAiBadge.classList.toggle('is-demo', !isLive);
  els.chatAiBadge.classList.toggle('is-live', isLive);
  els.chatAiBadge.textContent = isLive ? dict.chatBadgeLive : dict.chatBadgeDemo;
  els.chatAiNote.textContent = isLive ? dict.chatLiveNote : dict.chatDemoNote;
  els.chatProviderLabel.textContent = isLive ? dict.chatProviderLive : dict.chatProviderDemo;
}

function renderChatContext() {
  const dict = getDict();
  const report = state.lastReport;
  if (!report) {
    els.chatContextPill.textContent = dict.chatContextLoading;
    return;
  }

  const isHi = state.lang === 'hi';
  const cityName = isHi ? report.city.nameHi : report.city.nameEn;
  const scaleLabel = report.scale === 'cpcb' ? 'CPCB AQI' : 'US AQI';
  const sourceLabel = report.isDemo
    ? isHi
      ? 'डेमो'
      : 'Demo'
    : isHi
      ? 'लाइव मॉडल'
      : 'Live Modelled';
  const catLabel = isHi ? report.category.labelHi : report.category.labelEn;

  els.chatContextPill.textContent = `${cityName} • ${report.aqi ?? '--'} ${scaleLabel} (${catLabel}) • ${sourceLabel}`;
}

function createChatBubbleElement(entry) {
  const dict = getDict();
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${entry.role === 'user' ? 'is-user' : 'is-assistant'}`;

  const meta = document.createElement('div');
  meta.className = 'chat-bubble-meta';
  if (entry.role === 'user') {
    meta.textContent = dict.chatUserLabel;
  } else {
    meta.textContent = entry.isDemoAi ? dict.chatBotDemoLabel : dict.chatBotLiveLabel;
  }

  const body = document.createElement('div');
  body.textContent = entry.text;

  bubble.appendChild(meta);
  bubble.appendChild(body);
  return bubble;
}

function renderChatMessages() {
  const dict = getDict();
  els.chatMessages.innerHTML = '';

  if (state.chatHistory.length === 0) {
    els.chatMessages.appendChild(
      createChatBubbleElement({
        role: 'assistant',
        isDemoAi: !state.aiConfigured,
        text: dict.chatWelcome,
      })
    );
  } else {
    for (const entry of state.chatHistory) {
      els.chatMessages.appendChild(createChatBubbleElement(entry));
    }
  }

  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function renderFetchState(errorMessage = '') {
  const dict = getDict();
  const isLoading = state.fetchState === 'loading';

  els.aqiCard.setAttribute('aria-busy', String(isLoading));
  els.aqiReadout.classList.toggle('is-loading', isLoading);
  els.loadingBox.hidden = !isLoading;
  els.refreshBtn.disabled = isLoading;

  els.fetchStatusPill.classList.remove('is-success', 'is-error');
  if (isLoading) {
    els.errorBox.hidden = true;
    els.fetchStatusPill.textContent = dict.refreshingLabel;
  } else if (state.fetchState === 'success') {
    els.errorBox.hidden = true;
    els.fetchStatusPill.classList.add('is-success');
    const timeText = formatLocalTime(state.lastRefreshedAt);
    els.fetchStatusPill.textContent = `${dict.updatedSuccess}: ${timeText}`;
  } else if (state.fetchState === 'error') {
    els.errorBox.hidden = false;
    els.errorText.textContent = errorMessage || dict.updateFailed;
    els.fetchStatusPill.classList.add('is-error');
    els.fetchStatusPill.textContent = dict.updateFailed;
  } else {
    els.fetchStatusPill.textContent = '';
  }
}

function applyTranslations() {
  const dict = getDict();
  document.documentElement.lang = state.lang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (dict[key]) {
      node.textContent = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      node.setAttribute('placeholder', dict[key]);
    }
  });

  els.langButtons.forEach((btn) => {
    const isActive = btn.dataset.lang === state.lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  renderHealthStatus();
  renderChatModeStatus();
  renderChatContext();
  renderChatMessages();
  renderRoutineSyncBadge();
  renderFetchState(els.errorText.textContent);

  if (state.cities.length > 0) {
    renderCityOptions();
  }

  if (state.lastReport) {
    renderReport(state.lastReport);
  }

  if (state.lastRoutinePlan) {
    renderRoutinePlan(state.lastRoutinePlan);
  }

  if (state.lastIndoorPlan) {
    renderIndoorPlan(state.lastIndoorPlan);
  }
}

function renderCityOptions() {
  const current = state.city;
  const targets = [els.citySelect, els.routineCitySelect, els.indoorCitySelect].filter(Boolean);

  for (const selectEl of targets) {
    selectEl.innerHTML = '';
    for (const city of state.cities) {
      const option = document.createElement('option');
      option.value = city.key;
      option.textContent = state.lang === 'hi' ? city.nameHi : city.nameEn;
      if (city.key === current) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    }
  }
}

function formatMetric(value, decimals = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value.toFixed(decimals).replace(/\.0+$/, '');
}

function renderReport(report) {
  state.lastReport = report;
  const isHi = state.lang === 'hi';
  const dict = getDict();

  els.sourceBadge.classList.toggle('is-demo', report.isDemo);
  els.sourceBadge.classList.toggle('is-live', !report.isDemo);
  els.sourceBadge.textContent = report.isDemo ? dict.badgeDemo : dict.badgeLive;

  els.statusBanner.classList.toggle('is-demo', report.isDemo);
  els.statusBanner.classList.toggle('is-live', !report.isDemo);
  els.scenarioTitle.textContent = isHi ? report.scenarioHi : report.scenarioEn;
  els.sourceDisclaimer.textContent = isHi ? report.disclaimerHi : report.disclaimerEn;

  els.aqiScoreRing.className = `aqi-score-ring level-${report.category.code}`;
  els.aqiValue.textContent = report.aqi === null || report.aqi === undefined ? '--' : String(report.aqi);
  els.aqiUnit.textContent = report.scaleMeta?.unitLabel || (report.scale === 'cpcb' ? 'CPCB AQI' : 'US AQI');
  els.aqiScalePill.textContent = isHi ? report.scaleMeta?.labelHi : report.scaleMeta?.labelEn;
  els.aqiCategory.textContent = isHi ? report.category.labelHi : report.category.labelEn;
  els.aqiAdvice.textContent = isHi ? report.category.adviceHi : report.category.adviceEn;

  els.aqiProvider.textContent = report.provider;
  els.aqiObserved.textContent = isHi ? report.updatedLabelHi : report.updatedLabelEn;
  els.aqiRefreshed.textContent = formatLocalTime(state.lastRefreshedAt || report.fetchedAt);

  if (report.scale === 'cpcb' && report.cpcbDetails) {
    els.cpcbNoteBox.hidden = false;
    const { dominantPollutant, dominantSubIndex, subIndices, averagingNoteEn, averagingNoteHi } =
      report.cpcbDetails;

    els.cpcbDominant.textContent = dominantPollutant
      ? `${dict.cpcbDominantPrefix} ${dominantPollutant} (${dict.cpcbSubIndexWord} ${dominantSubIndex})`
      : isHi
        ? report.cpcbDetails.reasonHi
        : report.cpcbDetails.reasonEn;

    els.cpcbAveraging.textContent = isHi ? averagingNoteHi : averagingNoteEn;

    const subText = Object.values(subIndices || {})
      .map((item) => `${item.label}: ${item.subIndex}`)
      .join(' • ');
    els.cpcbSubindices.textContent = subText ? `${dict.cpcbSubIndicesPrefix} ${subText}` : '';
  } else {
    els.cpcbNoteBox.hidden = true;
  }

  els.valPm25.textContent = formatMetric(report.metrics.pm25);
  els.valPm10.textContent = formatMetric(report.metrics.pm10);
  els.valNo2.textContent = formatMetric(report.metrics.no2);
  els.valO3.textContent = formatMetric(report.metrics.o3);
  els.valSo2.textContent = formatMetric(report.metrics.so2);
  els.valCo.textContent = formatMetric(report.metrics.coMg, 2);

  renderChatContext();
}

function syncModeButtons() {
  els.modeButtons.forEach((btn) => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  renderRoutineSyncBadge();
}

function renderRoutineSyncBadge() {
  if (!els.routineSourceSync) return;
  const dict = getDict();
  els.routineSourceSync.textContent =
    state.mode === 'live' ? dict.routineSyncLive : dict.routineSyncDemo;
}

function renderRoutinePlan(plan) {
  state.lastRoutinePlan = plan;
  const isHi = state.lang === 'hi';

  els.routineErrorBox.hidden = true;
  els.routineOutput.hidden = false;

  els.routineDataBadge.classList.toggle('is-demo', plan.isDemo);
  els.routineDataBadge.classList.toggle('is-live', !plan.isDemo);
  els.routineDataBadge.textContent = isHi ? plan.dataLabel.badgeHi : plan.dataLabel.badgeEn;
  els.routineDataNote.textContent = isHi ? plan.dataLabel.noteHi : plan.dataLabel.noteEn;

  els.routineSafetyBanner.className = `safety-banner is-${plan.safetyWarning.level}`;
  els.routineSafetyTitle.textContent = isHi ? plan.safetyWarning.titleHi : plan.safetyWarning.titleEn;
  els.routineSafetyDetail.textContent = isHi ? plan.safetyWarning.detailHi : plan.safetyWarning.detailEn;

  els.routineBestWindow.textContent = plan.bestWindow?.label || '--';
  els.routineExplanation.textContent = isHi ? plan.explanationHi : plan.explanationEn;

  els.routineTransportList.innerHTML = '';
  const tips = isHi ? plan.transportAlternatives.tipsHi : plan.transportAlternatives.tipsEn;
  for (const tip of tips) {
    const li = document.createElement('li');
    li.textContent = tip;
    els.routineTransportList.appendChild(li);
  }

  els.routineTimeline.innerHTML = '';
  for (const slot of plan.timeline || []) {
    const tile = document.createElement('div');
    tile.className = `timeline-slot${slot.isRecommended ? ' is-recommended' : ''}`;
    tile.setAttribute('role', 'listitem');

    const hourEl = document.createElement('span');
    hourEl.className = 'timeline-hour';
    hourEl.textContent = slot.hourLabel;

    const aqiEl = document.createElement('span');
    aqiEl.className = `timeline-aqi level-${slot.categoryCode}`;
    aqiEl.textContent = slot.usAqi !== null ? String(slot.usAqi) : '--';

    const pmEl = document.createElement('span');
    pmEl.className = 'timeline-pm';
    pmEl.textContent = slot.pm25 !== null ? `${slot.pm25} µg` : '--';

    tile.appendChild(hourEl);
    tile.appendChild(aqiEl);
    tile.appendChild(pmEl);
    els.routineTimeline.appendChild(tile);
  }
}

const INDOOR_ICONS = {
  window:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  purifier:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="5"/></svg>',
  kitchen:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16M6 11V7a6 6 0 0 1 12 0v4"/><path d="M8 15c0 1.5-1 2-1 3.5M12 15c0 1.5-1 2-1 3.5M16 15c0 1.5-1 2-1 3.5"/></svg>',
  dust:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>',
  smoke:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m4.93 4.93 14.14 14.14"/></svg>',
};

function saveIndoorChecks() {
  try {
    localStorage.setItem(INDOOR_CHECKS_KEY, JSON.stringify(state.indoorChecks));
  } catch {
    // Ignore storage quota errors safely.
  }
}

function updateChecklistProgress(items) {
  const dict = getDict();
  const total = items.length;
  const checkedCount = items.filter((item) => Boolean(state.indoorChecks[item.id])).length;
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  els.indoorChecklistProgress.textContent = `${checkedCount} / ${total} ${dict.indoorCompletedWord}`;
  if (els.indoorProgressFill) {
    els.indoorProgressFill.style.width = `${pct}%`;
  }
  if (els.indoorChecklistDoneBanner) {
    els.indoorChecklistDoneBanner.hidden = total === 0 || checkedCount < total;
  }
}

function renderIndoorPlan(plan) {
  state.lastIndoorPlan = plan;
  const isHi = state.lang === 'hi';
  const dict = getDict();

  els.indoorErrorBox.hidden = true;
  els.indoorOutput.hidden = false;

  const cityName = isHi ? plan.city.nameHi : plan.city.nameEn;
  const scaleLabel = plan.scale === 'cpcb' ? 'CPCB AQI' : 'US AQI';
  const catLabel = isHi ? plan.category.labelHi : plan.category.labelEn;
  const timeText = isHi ? plan.updatedLabelHi : plan.updatedLabelEn;
  const sourceBadgeText = isHi ? plan.dataLabel.badgeHi : plan.dataLabel.badgeEn;
  els.indoorContextSummary.textContent = `${cityName} • ${plan.aqi ?? '--'} ${scaleLabel} (${catLabel}) • ${sourceBadgeText} • ${timeText}`;

  els.indoorDataBadge.classList.toggle('is-demo', plan.isDemo);
  els.indoorDataBadge.classList.toggle('is-live', !plan.isDemo);
  els.indoorDataBadge.textContent = sourceBadgeText;
  els.indoorDataNote.textContent = isHi ? plan.dataLabel.noteHi : plan.dataLabel.noteEn;

  const isClosed = plan.windowPlan.status === 'keep_closed';
  els.indoorWindowBanner.className = `safety-banner ${isClosed ? 'is-danger' : 'is-safe'}`;
  const prefix = isClosed ? dict.indoorWindowClosedPrefix : dict.indoorWindowOpenPrefix;
  const hours = isHi ? plan.windowPlan.recommendedHoursHi : plan.windowPlan.recommendedHoursEn;
  els.indoorWindowTitle.textContent = `${prefix} ${hours}`;
  els.indoorWindowDetail.textContent = isHi ? plan.windowPlan.detailHi : plan.windowPlan.detailEn;

  els.indoorCardsGrid.innerHTML = '';
  for (const card of plan.cards || []) {
    const cardEl = document.createElement('article');
    const isHigh = card.priority === 'high';
    cardEl.className = `indoor-card${isHigh ? ' is-high-priority' : ''}`;

    const top = document.createElement('div');
    top.className = 'indoor-card-top';

    const iconBox = document.createElement('div');
    iconBox.className = 'indoor-icon-box';
    iconBox.setAttribute('aria-hidden', 'true');
    iconBox.innerHTML = INDOOR_ICONS[card.icon] || INDOOR_ICONS.window;

    const titleWrap = document.createElement('div');
    titleWrap.className = 'indoor-card-title-wrap';

    const h3 = document.createElement('h3');
    h3.textContent = isHi ? card.titleHi : card.titleEn;

    const badgesWrap = document.createElement('div');
    badgesWrap.className = 'indoor-card-badges';

    const priorityPill = document.createElement('span');
    priorityPill.className = `indoor-priority-pill${isHigh ? ' is-high' : ''}`;
    priorityPill.textContent = isHigh ? dict.indoorPriorityHigh : dict.indoorPriorityNormal;

    const badge = document.createElement('span');
    badge.className = 'indoor-card-badge';
    badge.textContent = isHi ? card.badgeHi : card.badgeEn;

    badgesWrap.appendChild(priorityPill);
    badgesWrap.appendChild(badge);
    titleWrap.appendChild(h3);
    titleWrap.appendChild(badgesWrap);
    top.appendChild(iconBox);
    top.appendChild(titleWrap);

    const summary = document.createElement('p');
    summary.className = 'indoor-card-summary';
    summary.textContent = isHi ? card.summaryHi : card.summaryEn;

    const tipsBox = document.createElement('div');
    tipsBox.className = 'indoor-card-tips-box';

    const tipsLabel = document.createElement('span');
    tipsLabel.className = 'indoor-tips-label';
    tipsLabel.textContent = dict.indoorActionsLabel;

    const tipsList = document.createElement('ul');
    tipsList.className = 'indoor-card-tips';
    for (const tipText of isHi ? card.tipsHi : card.tipsEn) {
      const li = document.createElement('li');
      li.textContent = tipText;
      tipsList.appendChild(li);
    }

    tipsBox.appendChild(tipsLabel);
    tipsBox.appendChild(tipsList);

    cardEl.appendChild(top);
    cardEl.appendChild(summary);
    cardEl.appendChild(tipsBox);
    els.indoorCardsGrid.appendChild(cardEl);
  }

  els.indoorChecklist.innerHTML = '';
  const items = plan.checklist || [];
  for (const item of items) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checked = Boolean(state.indoorChecks[item.id]);
    label.className = `checklist-item${checked ? ' is-checked' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;

    const span = document.createElement('span');
    span.textContent = isHi ? item.titleHi : item.titleEn;

    const statusTag = document.createElement('em');
    statusTag.className = 'checklist-status-tag';
    statusTag.textContent = checked ? dict.indoorItemDone : dict.indoorItemPending;

    checkbox.addEventListener('change', () => {
      state.indoorChecks[item.id] = checkbox.checked;
      label.classList.toggle('is-checked', checkbox.checked);
      statusTag.textContent = checkbox.checked ? dict.indoorItemDone : dict.indoorItemPending;
      saveIndoorChecks();
      updateChecklistProgress(items);
    });

    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(statusTag);
    li.appendChild(label);
    els.indoorChecklist.appendChild(li);
  }
  updateChecklistProgress(items);

  els.indoorGeneralDisclaimer.textContent = isHi
    ? plan.generalDisclaimerHi
    : plan.generalDisclaimerEn;
}

async function fetchIndoorRecommendations() {
  if (state.activeIndoorController) {
    state.activeIndoorController.abort();
  }
  const controller = new AbortController();
  state.activeIndoorController = controller;

  els.indoorLoadingBox.hidden = false;
  els.indoorErrorBox.hidden = true;

  try {
    const response = await fetchWithTimeout('/api/indoor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: 12000,
      signal: controller.signal,
      body: JSON.stringify({
        city: state.city,
        mode: state.mode,
        scale: state.scale,
        hasPurifier: els.indoorPurifierSelect?.value === 'yes',
        cookingFuel: els.indoorCookingSelect?.value || 'gas',
        sensitiveMembers: els.indoorSensitiveSelect?.value === 'yes',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to load indoor recommendations`);
    }

    renderIndoorPlan(data);
  } catch (err) {
    if (
      err.name === 'AbortError' &&
      controller.signal.aborted &&
      state.activeIndoorController !== controller
    ) {
      return;
    }

    els.indoorErrorBox.hidden = false;
    els.indoorErrorText.textContent =
      err.name === 'AbortError'
        ? 'Timed out loading indoor recommendations. Please retry or switch to Demo mode.'
        : err.message;
  } finally {
    els.indoorLoadingBox.hidden = true;
  }
}

function syncAllCitySelects(cityKey) {
  state.city = cityKey;
  if (els.citySelect) els.citySelect.value = cityKey;
  if (els.routineCitySelect) els.routineCitySelect.value = cityKey;
  if (els.indoorCitySelect) els.indoorCitySelect.value = cityKey;
}

async function fetchRoutinePlan() {
  if (state.activeRoutineController) {
    state.activeRoutineController.abort();
  }
  const controller = new AbortController();
  state.activeRoutineController = controller;

  els.routineLoadingBox.hidden = false;
  els.routineErrorBox.hidden = true;
  els.routineSubmitBtn.disabled = true;

  try {
    const response = await fetchWithTimeout('/api/routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: 12000,
      signal: controller.signal,
      body: JSON.stringify({
        city: state.city,
        mode: state.mode,
        activity: els.routineActivity.value,
        preferredTime: els.routineTime.value,
        durationMinutes: Number(els.routineDuration.value),
        transportMode: els.routineTransport.value,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to generate routine plan`);
    }

    renderRoutinePlan(data);
  } catch (err) {
    if (
      err.name === 'AbortError' &&
      controller.signal.aborted &&
      state.activeRoutineController !== controller
    ) {
      return;
    }

    els.routineErrorBox.hidden = false;
    els.routineErrorText.textContent =
      err.name === 'AbortError'
        ? 'Timed out loading hourly air quality for routines. Retry or switch to Demo mode.'
        : err.message;
  } finally {
    els.routineLoadingBox.hidden = true;
    els.routineSubmitBtn.disabled = false;
  }
}

function syncScaleButtons() {
  els.scaleButtons.forEach((btn) => {
    const active = btn.dataset.scale === state.scale;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

async function fetchWithTimeout(url, { timeoutMs = 6000, signal, ...fetchOpts } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);

  const onParentAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', onParentAbort, { once: true });
  }

  try {
    return await fetch(url, { cache: 'no-store', ...fetchOpts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener('abort', onParentAbort);
    }
  }
}

async function checkBackendHealth({ applyDefaultMode = false } = {}) {
  state.healthStatus = 'checking';
  renderHealthStatus();

  try {
    const healthRes = await fetchWithTimeout('/api/health', { timeoutMs: 5000 });
    if (!healthRes.ok) {
      throw new Error(`HTTP ${healthRes.status}`);
    }

    const health = await healthRes.json();
    state.healthStatus = health.ok ? 'connected' : 'offline';
    state.aiConfigured = Boolean(health.aiConfigured);
    if (
      applyDefaultMode &&
      (health.defaultAqiMode === 'live' || health.defaultAqiMode === 'demo')
    ) {
      state.mode = health.defaultAqiMode;
      syncModeButtons();
    }
  } catch {
    state.healthStatus = 'offline';
  }

  renderHealthStatus();
  renderChatModeStatus();
  renderChatMessages();
}

async function loadCities() {
  try {
    const citiesRes = await fetchWithTimeout('/api/cities', { timeoutMs: 5000 });
    if (citiesRes.ok) {
      const data = await citiesRes.json();
      state.cities = data.cities || [];
      renderCityOptions();
    }
  } catch {
    // Keep static HTML options if /api/cities fails transiently.
  }
}

async function fetchAqi({ recheckHealth = false } = {}) {
  if (state.activeAqiController) {
    state.activeAqiController.abort();
  }
  const controller = new AbortController();
  state.activeAqiController = controller;

  state.fetchState = 'loading';
  renderFetchState();

  if (recheckHealth && state.healthStatus !== 'connected') {
    checkBackendHealth();
  }

  try {
    const params = new URLSearchParams({
      city: state.city,
      mode: state.mode,
      scale: state.scale,
    });

    const response = await fetchWithTimeout(`/api/aqi?${params.toString()}`, {
      timeoutMs: 12000,
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to load AQI reading`);
    }

    if (state.healthStatus !== 'connected') {
      state.healthStatus = 'connected';
      renderHealthStatus();
    }

    state.lastRefreshedAt = new Date();
    state.fetchState = 'success';
    renderReport(data);
    renderFetchState();
  } catch (err) {
    if (err.name === 'AbortError' && controller.signal.aborted && state.activeAqiController !== controller) {
      return;
    }

    const message =
      err.name === 'AbortError'
        ? 'The request timed out while fetching AQI data. Please try again or switch to Demo mode.'
        : err.message;

    state.fetchState = 'error';
    renderFetchState(message);
  }
}

function setChatLoading(loading) {
  state.chatLoading = loading;
  els.chatLoadingBar.hidden = !loading;
  els.chatSendBtn.disabled = loading;
  els.chipButtons.forEach((btn) => {
    btn.disabled = loading;
  });
}

async function sendChatMessage(rawText, { isRetry = false } = {}) {
  const dict = getDict();
  const text = String(rawText || '').trim();
  if (!text) {
    els.chatErrorBar.hidden = false;
    els.chatErrorText.textContent = dict.chatEmptyError;
    return;
  }

  if (state.chatLoading) return;

  els.chatErrorBar.hidden = true;
  state.lastFailedPrompt = null;

  if (!isRetry) {
    state.chatHistory.push({ role: 'user', text });
    saveSessionHistory();
    renderChatMessages();
    els.chatInput.value = '';
  }

  setChatLoading(true);
  try {
    const response = await fetchWithTimeout('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: 18000,
      body: JSON.stringify({
        message: text,
        lang: state.lang,
        history: state.chatHistory.slice(-8),
        aqiContext: state.lastReport,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}: Failed to get chatbot reply`);
    }

    state.chatHistory.push({
      role: 'assistant',
      isDemoAi: Boolean(data.isDemoAi),
      text: data.reply,
    });
    saveSessionHistory();
    renderChatMessages();
  } catch (err) {
    state.lastFailedPrompt = text;
    els.chatErrorBar.hidden = false;
    els.chatErrorText.textContent =
      err.name === 'AbortError'
        ? 'Chatbot request timed out. Please retry.'
        : err.message;
  } finally {
    setChatLoading(false);
  }
}

function bindEvents() {
  els.langButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang === 'hi' ? 'hi' : 'en';
      localStorage.setItem('smogsaathi_lang', state.lang);
      applyTranslations();
    });
  });

  els.modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode === 'live' ? 'live' : 'demo';
      syncModeButtons();
      fetchAqi();
      fetchRoutinePlan();
      fetchIndoorRecommendations();
    });
  });

  els.scaleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.scale = btn.dataset.scale === 'cpcb' ? 'cpcb' : 'us';
      localStorage.setItem('smogsaathi_scale', state.scale);
      syncScaleButtons();
      fetchAqi();
      fetchIndoorRecommendations();
    });
  });

  els.citySelect.addEventListener('change', (event) => {
    syncAllCitySelects(event.target.value);
    fetchAqi();
    fetchRoutinePlan();
    fetchIndoorRecommendations();
  });

  els.routineCitySelect.addEventListener('change', (event) => {
    syncAllCitySelects(event.target.value);
    fetchAqi();
    fetchRoutinePlan();
    fetchIndoorRecommendations();
  });

  els.indoorCitySelect.addEventListener('change', (event) => {
    syncAllCitySelects(event.target.value);
    fetchAqi();
    fetchRoutinePlan();
    fetchIndoorRecommendations();
  });

  [els.indoorPurifierSelect, els.indoorCookingSelect, els.indoorSensitiveSelect].forEach(
    (selectEl) => {
      selectEl?.addEventListener('change', () => {
        fetchIndoorRecommendations();
      });
    }
  );

  els.indoorRetryBtn.addEventListener('click', () => {
    fetchIndoorRecommendations();
  });

  els.indoorDemoBtn.addEventListener('click', () => {
    state.mode = 'demo';
    syncModeButtons();
    fetchAqi();
    fetchRoutinePlan();
    fetchIndoorRecommendations();
  });

  els.indoorResetChecksBtn.addEventListener('click', () => {
    state.indoorChecks = {};
    saveIndoorChecks();
    if (state.lastIndoorPlan) {
      renderIndoorPlan(state.lastIndoorPlan);
    }
  });

  els.routineForm.addEventListener('submit', (event) => {
    event.preventDefault();
    fetchRoutinePlan();
  });

  els.routineRetryBtn.addEventListener('click', () => {
    fetchRoutinePlan();
  });

  els.routineDemoBtn.addEventListener('click', () => {
    state.mode = 'demo';
    syncModeButtons();
    fetchAqi();
    fetchRoutinePlan();
  });

  els.refreshBtn.addEventListener('click', () => {
    fetchAqi({ recheckHealth: true });
    fetchIndoorRecommendations();
  });

  els.retryBtn.addEventListener('click', () => {
    fetchAqi({ recheckHealth: true });
  });

  els.fallbackDemoBtn.addEventListener('click', () => {
    state.mode = 'demo';
    syncModeButtons();
    fetchAqi();
    fetchRoutinePlan();
    fetchIndoorRecommendations();
  });

  els.chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChatMessage(els.chatInput.value);
  });

  els.chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sendChatMessage(btn.textContent);
    });
  });

  els.chatRetryBtn.addEventListener('click', () => {
    if (state.lastFailedPrompt) {
      sendChatMessage(state.lastFailedPrompt, { isRetry: true });
    }
  });

  els.clearChatBtn.addEventListener('click', () => {
    state.chatHistory = [];
    state.lastFailedPrompt = null;
    els.chatErrorBar.hidden = true;
    saveSessionHistory();
    renderChatMessages();
  });

  els.menuToggle.addEventListener('click', () => {
    const isOpen = els.primaryNav.classList.toggle('is-open');
    els.menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  els.primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      els.primaryNav.classList.remove('is-open');
      els.menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

async function init() {
  syncModeButtons();
  syncScaleButtons();
  bindEvents();
  applyTranslations();
  await Promise.all([checkBackendHealth({ applyDefaultMode: true }), loadCities()]);
  await Promise.all([fetchAqi(), fetchRoutinePlan(), fetchIndoorRecommendations()]);
}

init();
