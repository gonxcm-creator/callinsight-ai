import {
  DEFAULT_STATE,
  REGIONS,
  REGION_BY_ID,
  SOURCES,
  ZONES,
  zonesFor,
  fmtDate,
  LOCALES,
} from './data.js';
import { amortization, annuity, computeState, maxPrice, tae } from './engine.js';
import { translate, isLocale } from './i18n.js';
import { money, moneyCompact, number, percent, signedPercent } from './format.js';
import { donut, wealthChart, amortBars, yieldBars } from './charts.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE = 'cc.state.v2';
const LOCALE_KEY = 'cc.locale';
const REPORTS_KEY = 'cc.reports.v1';
const MAX_CLOUD = 20;

let state = loadState();
let locale = loadLocale();
let result = computeState(state);
let session = null;
let activeTab = 'buy';
let zoneSort = 'price';
let localReports = loadReports();
let cloudReports = [];
let funnel = null;
let funnelError = false;
let funnelDenied = false;
const FUNNEL_EVENTS = ['calc_view', 'zone_applied', 'cta_view', 'cta_submit', 'lead_sent'];
let toastTimer = null;

function t(key, vars) {
  return translate(locale, key, vars);
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE));
    if (raw && typeof raw === 'object') return migrateState({ ...DEFAULT_STATE, ...raw });
  } catch (error) {
    /* almacenamiento no disponible */
  }
  return { ...DEFAULT_STATE };
}

/**
 * Las sesiones antiguas no guardaban de dónde salía el €/m². Se deduce una sola vez y queda
 * escrito, para que la pista y el pie del KPI no dependan de comparar importes.
 */
function migrateState(next) {
  if (!['region', 'zone', 'manual'].includes(next.marketSource)) {
    const hasRef =
      next.marketRef !== null && next.marketRef !== undefined && next.marketRef !== '';
    const zone = hasRef
      ? ZONES.find(
          (item) =>
            item.regionId === next.regionId && Number(item.market) === Number(next.marketRef),
        )
      : null;
    next.marketSource = !hasRef ? 'region' : zone ? 'zone' : 'manual';
    next.marketZoneId = zone ? zone.id : null;
  }
  if (next.marketSource !== 'zone') next.marketZoneId = null;
  return next;
}

function loadLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch (error) {
    /* sin localStorage */
  }
  // Producto para el mercado español: español por defecto, no el idioma del navegador.
  return 'es';
}

function loadReports() {
  try {
    const raw = JSON.parse(localStorage.getItem(REPORTS_KEY));
    return Array.isArray(raw) ? raw.slice(0, 50) : [];
  } catch (error) {
    return [];
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch (error) {
    /* modo privado */
  }
}

function regionName(region) {
  return region.name[locale] || region.name.es;
}

function typeLabel() {
  return t(`mortgage.${state.mortgageType}`);
}

function rateRange(region) {
  const rates = region.itp.map(([, r]) => r * 100);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const fmt = (v) => number(v, locale, 2);
  return min === max ? `${fmt(min)} %` : `${fmt(min)}–${fmt(max)} %`;
}

function shortMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000000) return `${number(n / 1000000, locale, 1)} M€`;
  if (Math.abs(n) >= 1000) return `${number(n / 1000, locale, 0)} k€`;
  return money(n, locale);
}

function benchmark() {
  if (state.marketRef !== null && state.marketRef !== undefined && state.marketRef !== '') {
    return Number(state.marketRef) || 0;
  }
  return result.region.market;
}

/* ------------------------------------------------------------------ */
/* i18n y controles                                                    */
/* ------------------------------------------------------------------ */

function applyStaticI18n() {
  document.documentElement.lang = locale;
  document.title = t('meta.title');
  const desc = $('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('meta.description'));

  $$('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $$('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  $$('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
  const lang = $('#lang');
  if (lang) lang.value = locale;
  populateRegions();
}

function populateRegions() {
  const select = $('#regionId');
  if (!select) return;
  select.innerHTML = REGIONS.map(
    (region) => `<option value="${region.id}">${esc(regionName(region))}</option>`,
  ).join('');
  select.value = state.regionId;
}

function syncControls() {
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    const value = state[key];
    if (el.type === 'radio' || el.tagName === 'SELECT') return;
    if (key === 'price') {
      el.value = value ? number(value, locale) : '';
    } else if (key === 'marketRef' || key === 'reformPerM2') {
      el.value = value === null || value === undefined || value === '' ? '' : String(value);
    } else {
      el.value = value === null || value === undefined ? '' : String(value);
    }
  });

  $$('input[name="propertyType"]').forEach((el) => {
    el.checked = el.value === state.propertyType;
  });
  $$('input[name="mortgageType"]').forEach((el) => {
    el.checked = el.value === state.mortgageType;
  });
  const regionSelect = $('#regionId');
  if (regionSelect) regionSelect.value = state.regionId;

  $$('[data-rate]').forEach((el) => {
    el.hidden = el.dataset.rate !== state.mortgageType;
  });

  updateHints();
}

function updateHints() {
  const hint = $('#market-hint');
  if (hint) hint.textContent = marketHintText();
  const refInput = $('#marketRef');
  if (refInput) refInput.placeholder = number(benchmark(), locale);
  const euriborHint = $('#euribor-hint');
  if (euriborHint) {
    euriborHint.textContent = t('mortgage.euriborHint', {
      rate: number(state.euribor, locale, 2),
    });
  }
  const mixedHint = $('#mixed-hint');
  if (mixedHint) {
    mixedHint.textContent = t('mortgage.mixedHint', {
      rate: number(state.tin, locale, 2),
      years: state.fixedYears,
      spread: number(state.spread, locale, 2),
    });
  }
}

function parseNum(raw) {
  const clean = String(raw).replace(/\s/g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function readControl(el) {
  const key = el.dataset.bind;
  if (el.dataset.money !== undefined) {
    const digits = el.value.replace(/\D/g, '');
    return digits === '' ? 0 : parseInt(digits, 10);
  }
  const raw = el.value.trim();
  if (key === 'marketRef' || key === 'reformPerM2') {
    return raw === '' ? null : Math.max(0, parseNum(raw));
  }
  if (el.type === 'number') return raw === '' ? 0 : parseNum(raw);
  return raw;
}

function bindControls() {
  $$('[data-bind]').forEach((el) => {
    el.addEventListener('input', () => {
      const key = el.dataset.bind;
      state[key] = readControl(el);
      if (key === 'label') state.label = String(state.label).slice(0, 60);
      if (key === 'marketRef') {
        state.marketSource = state.marketRef === null ? 'region' : 'manual';
        state.marketZoneId = null;
      }
      computeAndRender({ sync: false });
    });
    el.addEventListener('change', () => {
      const key = el.dataset.bind;
      if (key === 'regionId') {
        state.regionId = el.value;
        state.marketRef = null;
        state.marketSource = 'region';
        state.marketZoneId = null;
        const refInput = $('#marketRef');
        if (refInput) refInput.value = '';
      }
      if (key === 'price') el.value = state.price ? number(state.price, locale) : '';
      if (key === 'conditionId') state.conditionId = el.value;
      syncControls();
      computeAndRender({ sync: false });
    });
    if (el.dataset.money !== undefined) {
      el.addEventListener('blur', () => {
        el.value = state.price ? number(state.price, locale) : '';
      });
    }
  });

  $$('input[name="propertyType"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!el.checked) return;
      state.propertyType = el.value;
      computeAndRender({ sync: false });
    });
  });

  $$('input[name="mortgageType"]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!el.checked) return;
      state.mortgageType = el.value;
      syncControls();
      computeAndRender({ sync: false });
    });
  });

  const lang = $('#lang');
  if (lang) {
    lang.addEventListener('change', () => setLocale(lang.value));
  }

  const theme = $('#theme');
  if (theme) {
    theme.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('cc.theme', next);
      } catch (error) {
        /* sin almacenamiento */
      }
    });
  }

  const reset = $('#reset');
  if (reset) {
    reset.addEventListener('click', () => {
      if (!window.confirm(t('common.resetConfirm'))) return;
      state = { ...DEFAULT_STATE };
      saveState();
      syncControls();
      computeAndRender();
      toast(t('common.resetToast'));
    });
  }

  const save = $('#save');
  if (save) save.addEventListener('click', openSaveDialog);
  const copy = $('#copy');
  if (copy) copy.addEventListener('click', copySummary);
  const print = $('#print');
  if (print) print.addEventListener('click', () => window.print());

  $$('.tabs [role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => setTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = $$('.tabs [role="tab"]');
      const index = tabs.indexOf(tab);
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      setTab(tabs[next].dataset.tab);
    });
  });

  const zones = $('#zone-grid');
  if (zones) {
    zones.addEventListener('click', (event) => {
      const button = event.target.closest('[data-zone-apply]');
      if (!button) return;
      applyZone(button.dataset.zoneApply);
    });
  }

  const sort = $('#zones-sort');
  if (sort) {
    sort.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-sort]');
      if (!chip) return;
      zoneSort = chip.dataset.sort;
      $$('#zones-sort .chip').forEach((item) => item.classList.toggle('is-active', item === chip));
      renderZones();
      syncSortChips();
    });
  }

  const reports = $('#reports-list');
  if (reports) {
    reports.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id, scope } = button.dataset;
      if (action === 'open') openReport(scope, id);
      if (action === 'export') exportReport(scope, id);
      if (action === 'delete') await deleteReport(scope, id);
    });
  }
}

function setLocale(next) {
  if (!isLocale(next)) return;
  locale = next;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch (error) {
    /* sin almacenamiento */
  }
  applyStaticI18n();
  syncControls();
  computeAndRender();
  renderData();
  renderAccount();
}

function setTab(name) {
  activeTab = name;
  $$('.tabs [role="tab"]').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
  $$('.tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
}

/* ------------------------------------------------------------------ */
/* Render principal                                                    */
/* ------------------------------------------------------------------ */

function computeAndRender({ sync = true } = {}) {
  result = computeState(state);
  const budget = maxPrice(state);
  if (sync) syncControls();
  renderKpis();
  renderBuy();
  renderMortgage();
  renderRent();
  renderInvest();
  renderZones(budget);
  renderDiag(budget);
  renderSummaryBar(budget);
  renderCompare();
  renderHeroData();
  updateHints();
  renderDisclaimer();
  saveState();
}

/* ------------------------------------------------------------------ */
/* Fuente de la referencia de mercado                                  */
/* ------------------------------------------------------------------ */

function marketReference() {
  const ref = benchmark();
  const zone =
    state.marketSource === 'zone' && state.marketZoneId
      ? ZONES.find((item) => item.id === state.marketZoneId) || null
      : null;
  if (zone) return { ref, source: 'zone', date: zone.marketDate, place: zone.marketPlace, zone };
  if (state.marketSource === 'manual') {
    return {
      ref,
      source: 'manual',
      date: result.region.marketDate,
      place: regionName(result.region),
    };
  }
  return { ref, source: 'region', date: result.region.marketDate, place: regionName(result.region) };
}

function marketSourceName() {
  const { source } = marketReference();
  if (source === 'zone') return 'Fotocasa';
  if (source === 'manual') return t('common.ownFigure');
  return 'idealista';
}

function marketHintText() {
  const market = marketReference();
  const price = number(market.ref, locale);
  if (market.source === 'zone') {
    return t('property.marketHintZone', {
      price,
      date: fmtDate(market.date, locale),
      place: market.place,
    });
  }
  if (market.source === 'manual') {
    return t('property.marketHintManual', { price, region: regionName(result.region) });
  }
  return t('property.marketHint', {
    price,
    date: fmtDate(market.date, locale),
    region: regionName(result.region),
  });
}

function marketFootText() {
  const market = marketReference();
  const ref = number(result.market.benchmark, locale);
  if (market.source === 'zone') {
    return t('kpi.marketFootZone', { ref, date: fmtDate(market.date, locale) });
  }
  if (market.source === 'manual') return t('kpi.marketFootManual', { ref });
  return t('kpi.marketFoot', { ref, date: fmtDate(market.date, locale) });
}

/* ------------------------------------------------------------------ */
/* Zonas, presupuesto y viviendas                                      */
/* ------------------------------------------------------------------ */

const reduceMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setMoneyKpi(el, value, unit = '') {
  if (!el) return;
  const to = Number(value) || 0;
  const from = Number(el.dataset.value);
  el.dataset.value = String(to);
  if (el._raf) cancelAnimationFrame(el._raf);
  if (reduceMotion() || !Number.isFinite(from) || from === 0 || from === to) {
    el.innerHTML = `${money(to, locale)}${unit}`;
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / 420);
    const eased = 1 - Math.pow(1 - p, 3);
    if (p < 1) {
      el.innerHTML = `${money(from + (to - from) * eased, locale)}${unit}`;
      el._raf = requestAnimationFrame(tick);
    } else {
      el.innerHTML = `${money(to, locale)}${unit}`;
    }
  };
  el._raf = requestAnimationFrame(tick);
}

function zonePayment(price) {
  const downPct = clamp(Number(state.downPct) || 0, 0, 100);
  const loan = Math.max(0, price * (1 - downPct / 100));
  const years = clamp(Math.round(Number(state.years) || 30), 1, 40);
  const rate =
    state.mortgageType === 'variable'
      ? Number(state.euribor || 0) + Number(state.spread || 0)
      : Number(state.tin || 0);
  return annuity(loan, rate, years);
}

function zoneRow(zone, budget) {
  const real = zone.market ?? null;
  const perM2 = real || Math.round(result.region.market * zone.index);
  const m2 = Math.max(1, Number(state.m2) || 1);
  const price = perM2 * m2;
  const ratio = budget.price > 0 ? price / budget.price : 2;
  return {
    zone,
    perM2,
    real: Boolean(real),
    price,
    payment: zonePayment(price),
    tone: ratio <= 0.98 ? 'good' : ratio <= 1.08 ? 'warn' : 'bad',
    fits: budget.price > 0 ? Math.max(0, Math.floor(budget.price / perM2)) : 0,
    ratio,
  };
}

function renderBudget(budget = maxPrice(state)) {
  const label = $('#budget-label');
  if (!label) return;
  label.textContent = t('zones.budgetLabel', {
    income: money(state.income, locale),
    savings: money(state.savings, locale),
  });
  setMoneyKpi($('#budget-value'), budget.price);
  const foot = $('#budget-foot');
  if (foot) {
    const tied = budget.price > 0 && Math.abs(budget.byCash - budget.byLoan) < budget.price * 0.03;
    foot.textContent =
      budget.price <= 0
        ? t('zones.budgetNone')
        : tied
          ? t('zones.budgetFootBoth')
          : budget.limitedBy === 'cash'
            ? t('zones.budgetFootCash')
            : t('zones.budgetFootLoan');
  }
  const top = Math.max(budget.byCash, budget.byLoan, 1);
  const bars = $('#budget-bars');
  if (bars) {
    bars.innerHTML = [
      ['cash', t('zones.barCash'), budget.byCash],
      ['loan', t('zones.barLoan'), budget.byLoan],
    ]
      .map(
        ([kind, name, value]) => `<div class="budget-bar" data-kind="${kind}">
          <div class="budget-bar-top"><span>${esc(name)}</span><b>${esc(
            money(value, locale),
          )}</b></div>
          <div class="budget-track"><span style="width:${clamp(
            (value / top) * 100,
            0,
            100,
          ).toFixed(1)}%"></span></div>
        </div>`,
      )
      .join('');
  }
}

function renderZones(budget = maxPrice(state)) {
  const grid = $('#zone-grid');
  if (!grid) return;
  const region = result.region;
  const sub = $('#zones-sub');
  if (sub) sub.textContent = t('zones.sub', { region: regionName(region) });
  renderBudget(budget);
  syncSortChips();

  const zones = zonesFor(region.id);
  const note = $('#zones-note');
  if (!zones.length) {
    grid.innerHTML = `<div class="empty">${esc(t('zones.empty'))}</div>`;
    const count = $('#zones-count');
    if (count) count.textContent = '';
    if (note) note.textContent = '';
    return;
  }

  const rows = zones.map((zone) => zoneRow(zone, budget));
  const dated = rows.find((row) => row.zone.marketDate);
  if (note) {
    note.textContent = t('zones.note', {
      region: regionName(region),
      date: fmtDate(dated ? dated.zone.marketDate : region.marketDate, locale),
    });
  }
  if (zoneSort === 'fit') {
    rows.sort((a, b) => {
      const aFits = a.ratio <= 1;
      const bFits = b.ratio <= 1;
      if (aFits !== bFits) return aFits ? -1 : 1;
      return aFits ? b.ratio - a.ratio : a.ratio - b.ratio;
    });
  } else {
    rows.sort((a, b) => a.price - b.price);
  }

  const count = $('#zones-count');
  if (count) {
    count.textContent = t('zones.count', {
      fit: rows.filter((row) => row.ratio <= 1).length,
      total: rows.length,
    });
  }

  const m2 = Math.max(1, Number(state.m2) || 1);
  const maxPerM2 = Math.max(...rows.map((row) => row.perM2));
  grid.innerHTML = rows
    .map((row, i) => {
      const zone = row.zone;
      const badge =
        row.tone === 'good'
          ? t('zones.badgeIn')
          : row.tone === 'warn'
            ? t('zones.badgeTight')
            : t('zones.badgeOut');
      const width = clamp((row.perM2 / maxPerM2) * 100, 4, 100);
      return `<article class="zone" style="--i:${i}" data-zone="${esc(zone.id)}">
        <header class="zone-head">
          <div>
            <h3>${esc(zone.name)}</h3>
            <span class="zone-city">${esc(zone.city)}</span>
          </div>
          <span class="zone-badge" data-tone="${row.tone}">${esc(badge)}</span>
        </header>
        <p class="zone-price"><strong>${esc(number(row.perM2, locale))}</strong>
          <span>${esc(t('zones.perM2'))} · ${esc(
            row.real
              ? `${t('zones.priceSource')} ${fmtDate(zone.marketDate, locale)}`
              : t('zones.priceEstimated'),
          )}</span></p>
        <div class="zone-meter" aria-hidden="true"><span style="width:${width}%"></span></div>
        <dl class="zone-stats">
          <div><dt>${esc(t('zones.forM2', { m2: `${number(m2, locale)} m²` }))}</dt><dd>${esc(
            money(row.price, locale),
          )}</dd></div>
          <div><dt>${esc(t('zones.paymentLabel'))}</dt><dd>${esc(
            money(row.payment, locale),
          )}${esc(t('common.perMonth'))}</dd></div>
          <div><dt>${esc(t('zones.fitsLabel'))}</dt><dd>${esc(
            `${number(row.fits, locale)} m²`,
          )}</dd></div>
        </dl>
        <div class="zone-actions">
          <button type="button" class="btn btn-outline btn-xs" data-zone-apply="${esc(
            zone.id,
          )}">${esc(t('zones.apply'))}</button>
          <span class="zone-links">
            <a class="zone-link" href="${esc(zone.fotocasa)}" target="_blank" rel="noopener noreferrer"
              aria-label="${esc(t('zones.searchAria', { zone: zone.name, portal: 'Fotocasa' }))}">Fotocasa ↗</a>
            <a class="zone-link" href="${esc(zone.pisos)}" target="_blank" rel="noopener noreferrer"
              aria-label="${esc(t('zones.searchAria', { zone: zone.name, portal: 'pisos.com' }))}">pisos.com ↗</a>
          </span>
        </div>
      </article>`;
    })
    .join('');

  const portals = $('#portal-list');
  if (portals) {
    portals.innerHTML = [
      ['Fotocasa', 'https://www.fotocasa.es/es/comprar/viviendas/espana/todas-las-zonas/l'],
      ['pisos.com', 'https://www.pisos.com/'],
    ]
      .map(
        ([name, url]) =>
          `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a></li>`,
      )
      .join('');
  }
}

function syncSortChips() {
  $$('#zones-sort .chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.sort === zoneSort));
  });
}

function applyZone(zoneId) {
  const zone = ZONES.find((item) => item.id === zoneId);
  if (!zone) return;
  state.marketRef = zone.market || Math.round(result.region.market * zone.index);
  state.marketSource = 'zone';
  state.marketZoneId = zone.id;
  track('zone_applied');
  state.label = `${zone.name} · ${zone.city}`.slice(0, 60);
  const labelInput = $('#label');
  if (labelInput) labelInput.value = state.label;
  computeAndRender();
  const target = document.getElementById('calculadora');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(t('zones.appliedToast', { zone: zone.name }));
}

function renderKpis() {
  setMoneyKpi($('#kpi-cash'), result.cash);
  $('#kpi-cash-foot').textContent = t('kpi.cashFoot', {
    down: money(result.down, locale),
    closing: money(result.closing, locale),
  });
  setMoneyKpi($('#kpi-cost'), result.totalCost);
  $('#kpi-cost-foot').textContent = t('kpi.costFoot', {
    interest: money(result.totalInterest, locale),
    years: result.years,
  });
  setMoneyKpi(
    $('#kpi-payment'),
    result.payment,
    `<span class="unit">${esc(t('common.perMonth'))}</span>`,
  );
  $('#kpi-payment-foot').textContent = t('kpi.paymentFoot', {
    type: typeLabel(),
    rate: number(result.rate, locale, 2),
    years: result.years,
  });
  const market = $('#kpi-market');
  const diff = result.market.diffPct;
  market.textContent = result.market.benchmark > 0 ? signedPercent(diff, locale, 1) : t('common.noData');
  market.dataset.tone = diff <= -0.15 ? 'good' : diff >= 0.1 ? 'bad' : 'neutral';
  $('#kpi-market-foot').textContent =
    result.market.benchmark > 0 ? marketFootText() : t('kpi.marketNoRef');
}

function row(label, value, note = '') {
  return `<div class="row"><div><span class="row-name">${esc(label)}</span>${
    note ? `<span class="row-note">${esc(note)}</span>` : ''
  }</div><span class="row-value">${esc(value)}</span></div>`;
}

function stat(label, value, note = '') {
  return `<dl class="stat"><dt>${esc(label)}</dt><dd>${value}${
    note ? `<small>${esc(note)}</small>` : ''
  }</dd></dl>`;
}

function renderBuy() {
  const r = result;
  const region = r.region;
  const newBuild = state.propertyType === 'nueva';
  $('#buy-region').textContent = `${regionName(region)} · ${
    newBuild ? t('property.nueva') : t('property.usada')
  }`;

  const rows = [];
  rows.push(row(t('buy.price'), money(r.price, locale)));
  rows.push(row(t('buy.down', { pct: number(state.downPct, locale) }), money(r.down, locale)));
  rows.push(row(t('buy.mortgage'), money(r.loan, locale)));

  if (newBuild) {
    const vatKey = ['canarias', 'ceuta', 'melilla'].includes(region.id) ? 'buy.igic' : 'buy.iva';
    rows.push(
      row(
        t(vatKey, { rate: percent(region.iva, locale, 0) }),
        money(r.taxes.iva, locale),
        t('data.ivaGeneral'),
      ),
    );
    rows.push(
      row(
        t('buy.ajd', { rate: percent(region.ajd, locale, 2) }),
        money(r.taxes.ajd, locale),
      ),
    );
  } else {
    rows.push(
      row(
        t('buy.itp', { rate: rateRange(region) }),
        money(r.taxes.itp, locale),
        region.itp.length > 1 ? t('data.tramos') : t('data.flat'),
      ),
    );
  }

  rows.push(row(t('buy.notary'), money(r.fees.notary, locale)));
  rows.push(row(t('buy.registry'), money(r.fees.registry, locale)));
  rows.push(row(t('buy.gestoria'), money(r.fees.gestoria, locale)));
  if (r.fees.appraisal > 0) rows.push(row(t('buy.appraisal'), money(r.fees.appraisal, locale)));
  if (r.fees.agency > 0) rows.push(row(t('buy.agency'), money(r.fees.agency, locale)));
  if (r.fees.opening > 0) rows.push(row(t('buy.opening'), money(r.fees.opening, locale)));
  if (r.reform > 0) {
    rows.push(
      row(
        t('buy.reform', { rate: number(r.reformPerM2, locale) }),
        money(r.reform, locale),
        `${number(r.m2, locale)} m²`,
      ),
    );
  }
  if (r.furniture > 0) rows.push(row(t('buy.furniture'), money(r.furniture, locale)));
  $('#buy-rows').innerHTML = rows.join('');

  $('#buy-totals').innerHTML = `
    <div><span>${esc(t('buy.closing'))}</span><strong>${money(r.closing, locale)}</strong></div>
    <div><span>${esc(t('buy.cash'))}</span><strong>${money(r.cash, locale)}</strong></div>
    <div><span>${esc(t('buy.financed'))}</span><strong>${money(r.loan, locale)}</strong></div>
    <div><span>${esc(t('buy.total'))}</span><strong>${money(r.totalCost, locale)}</strong></div>`;

  renderMarket();
  renderTco();
}

function renderMarket() {
  const r = result;
  const m = r.market;
  const tag = $('#market-tag');
  const box = $('#market-box');
  if (m.benchmark <= 0) {
    tag.textContent = '';
    tag.className = 'tag';
    box.innerHTML = `<div class="empty">${esc(t('market.noRef'))}</div>`;
    $('#buy-donut').innerHTML = '';
    return;
  }
  const label =
    m.verdict === 'opportunity'
      ? t('market.opportunity')
      : m.verdict === 'expensive'
        ? t('market.expensive')
        : t('market.fair');
  const verdict =
    m.verdict === 'opportunity'
      ? t('market.verdictOpportunity')
      : m.verdict === 'expensive'
        ? t('market.verdictExpensive')
        : t('market.verdictFair');
  const tone = m.verdict === 'opportunity' ? 'good' : m.verdict === 'expensive' ? 'bad' : 'warn';
  tag.textContent = label;
  tag.className = `tag ${tone}`;

  const pos = clamp((m.diffPct + 0.3) / 0.6, 0, 1) * 100;
  const gap = Math.abs(r.price - m.fairValue);
  const gapLabel = m.diffPct > 0 ? t('market.overpay') : t('market.underpay');

  box.innerHTML = `
    <div class="verdict ${tone}">
      <div><strong>${esc(verdict)}</strong><span>${esc(
        t('market.diff', { pct: signedPercent(m.diffPct, locale, 1) }),
      )}</span></div>
    </div>
    <p class="hint">${esc(
      t('market.perM2', {
        price: number(m.pricePerM2, locale),
        ref: number(m.benchmark, locale),
      }),
    )}</p>
    <div class="meter"><i style="left:${pos.toFixed(1)}%"></i></div>
    <div class="meter-labels"><span>${esc(t('market.meterLow'))}</span><span>${esc(
      t('market.meterMid'),
    )}</span><span>${esc(t('market.meterHigh'))}</span></div>
    <div class="rows" style="margin-top:.6rem">
      ${row(t('market.estimate'), money(m.fairValue, locale))}
      ${row(gapLabel, money(gap, locale))}
    </div>`;

  const segments = [
    {
      value: r.price,
      label: t('buy.price'),
      cls: 'seg-price',
      color: 'var(--seg-price)',
    },
    {
      value: r.taxes.total,
      label: t('buy.taxes'),
      cls: 'seg-tax',
      color: 'var(--seg-tax)',
    },
    {
      value:
        r.fees.notary + r.fees.registry + r.fees.gestoria + r.fees.appraisal + r.fees.agency + r.fees.opening,
      label: t('buy.notary') + ' + ' + t('buy.registry'),
      cls: 'seg-fees',
      color: 'var(--seg-fees)',
    },
    {
      value: r.reform + r.furniture,
      label: t('adv.reformPerM2'),
      cls: 'seg-extra',
      color: 'var(--seg-extra)',
    },
  ];
  $('#buy-donut').innerHTML = donut(segments, shortMoney(r.totalCost), t('buy.total'));
}

function renderTco() {
  const r = result;
  const h = r.horizon;
  const opex = r.horizonCosts.opexPaid;
  const interest = r.horizonCosts.interestPaid;
  const total = r.totalCost + interest + opex;
  $('#tco-tag').textContent = t('buy.tco.tag');
  $('#tco-grid').innerHTML = [
    stat(t('buy.tco.purchase'), money(r.totalCost, locale)),
    stat(t('buy.tco.interest', { years: h }), money(interest, locale)),
    stat(t('buy.tco.opex', { years: h }), money(opex, locale), `${money(state.opexYear, locale)}${t('common.perYear')}`),
    stat(t('buy.tco.total', { years: h }), money(total, locale)),
    stat(t('buy.tco.perMonth'), money(total / (h * 12), locale)),
    stat(t('buy.tco.perM2'), money(total / r.m2, locale)),
  ].join('');
}

function renderMortgage() {
  const r = result;
  const extra = Math.max(0, Number(state.extraMonthly) || 0);
  const lump = Math.max(0, Number(state.lumpAmount) || 0);
  const lumpYear = clamp(Math.round(Number(state.lumpYear) || 1), 1, r.years);
  const hasEarly = extra > 0 || lump > 0;
  const amended = hasEarly
    ? amortization(
        r.loan,
        r.rate,
        r.years,
        extra,
        lump > 0 ? { month: (lumpYear - 1) * 12, amount: lump } : null,
      )
    : null;

  const typeText =
    state.mortgageType === 'fixed'
      ? t('mortgage.fixedNote')
      : state.mortgageType === 'variable'
        ? t('mortgage.revision', { spread: number(state.spread, locale, 2) })
        : t('mortgage.mixedHint', {
            rate: number(state.tin, locale, 2),
            years: state.fixedYears,
            spread: number(state.spread, locale, 2),
          });
  $('#mortgage-tag').textContent = typeLabel();

  const stats = [
    stat(t('mortgage.amount'), money(r.loan, locale)),
    stat(t('mortgage.payment'), money(r.payment, locale) + t('common.perMonth')),
    stat(t('mortgage.rate'), `${number(r.rate, locale, 2)} %`),
    stat(t('mortgage.tae'), `${number(r.tae, locale, 2)} %`),
    stat(t('mortgage.interest'), money(r.totalInterest, locale)),
    stat(t('mortgage.months'), number(Math.round(r.years * 12), locale)),
    stat(t('mortgage.totalPaid'), money(r.loan + r.totalInterest, locale)),
    stat(t('mortgage.ltv'), percent(r.ltv, locale, 0)),
  ];
  if (r.mixedPayment > 0) {
    stats.push(
      stat(t('mortgage.afterFixed'), money(r.mixedPayment, locale) + t('common.perMonth')),
    );
  }
  $('#mortgage-stats').innerHTML = stats.join('');
  $('#mortgage-tag').title = typeText;

  const earlyHint = $('#early-hint');
  if (!hasEarly) {
    earlyHint.textContent = t('mortgage.noEarly');
  } else {
    const savedInterest = Math.max(0, r.totalInterest - amended.totalInterest);
    const savedMonths = Math.max(0, Math.round(r.years * 12) - amended.months);
    const parts = [];
    if (extra > 0) parts.push(t('mortgage.extraPart', { value: money(extra, locale) }));
    if (lump > 0) parts.push(t('mortgage.lumpPart', { value: money(lump, locale), year: lumpYear }));
    earlyHint.textContent = t('mortgage.earlyResult', {
      parts: parts.join(' + '),
      interest: money(savedInterest, locale),
      months: number(savedMonths, locale),
    });
  }

  renderStress();
  renderSensitivity();

  const scheduleRows = amended ? amended.rows : r.amort.rows;
  const scheduleYears = Math.ceil((amended ? amended.months : r.years * 12) / 12);
  $('#schedule-tag').textContent = t('mortgage.sched.tag', {
    years: scheduleYears,
    type: typeLabel(),
  });
  const chart = $('#amort-chart');
  chart.innerHTML = amortBars(scheduleRows, locale);
  const amortLegend = $('#amort-legend');
  if (amortLegend) {
    amortLegend.innerHTML = `<span><i class="line principal"></i>${esc(
      t('mortgage.sched.principal'),
    )}</span><span><i class="line interest"></i>${esc(t('mortgage.sched.interest'))}</span>`;
  }

  const totalPrincipal = scheduleRows.reduce((sum, x) => sum + x.principal, 0);
  const totalInterest = scheduleRows.reduce((sum, x) => sum + x.interest, 0);
  $('#amort-table').innerHTML = `
    <thead><tr>
      <th>${esc(t('mortgage.sched.year'))}</th>
      <th>${esc(t('mortgage.sched.principal'))}</th>
      <th>${esc(t('mortgage.sched.interest'))}</th>
      <th>${esc(t('mortgage.sched.balance'))}</th>
    </tr></thead>
    <tbody>
      ${scheduleRows
        .map(
          (x) => `<tr>
            <td>${x.year}</td>
            <td>${money(x.principal, locale)}</td>
            <td>${money(x.interest, locale)}</td>
            <td>${money(x.balance, locale)}</td>
          </tr>`,
        )
        .join('')}
    </tbody>
    <tfoot><tr>
      <td class="strong">${esc(t('mortgage.sched.total'))}</td>
      <td class="strong">${money(totalPrincipal, locale)}</td>
      <td class="strong">${money(totalInterest, locale)}</td>
      <td>—</td>
    </tr></tfoot>`;
}

function renderStress() {
  const r = result;
  const dti = r.dti;
  const tone = dti > 0.43 ? 'bad' : dti > 0.35 ? 'warn' : 'good';
  const label =
    tone === 'bad'
      ? t('mortgage.stress.bad')
      : tone === 'warn'
        ? t('mortgage.stress.warn')
        : t('mortgage.stress.good');
  $('#stress-box').innerHTML = `
    <div class="stress">
      <div class="stress-row"><span>${esc(t('mortgage.stress.base'))}</span><strong>${money(
        r.payment,
        locale,
      )}${t('common.perMonth')}</strong></div>
      <div class="stress-row"><span>${esc(t('mortgage.stress.plus2'))}</span><strong>${money(
        r.stressPayment,
        locale,
      )}${t('common.perMonth')}</strong></div>
      <div class="stress-row"><span>${esc(t('mortgage.stress.dti'))}</span><span class="tag ${tone}">${percent(
        dti,
        locale,
        0,
      )} · ${esc(label)}</span></div>
      <div class="dti-bar ${tone}"><i style="width:${clamp(dti * 100, 0, 100).toFixed(1)}%"></i></div>
      <p class="hint">${esc(
        t('mortgage.stress.dtiFoot', {
          payment: money(r.payment, locale),
          debts: money(state.otherDebts, locale),
          income: money(state.income, locale),
        }),
      )}</p>
      <p class="hint">${esc(t('mortgage.stress.rule'))}</p>
    </div>`;
}

function renderSensitivity() {
  const s = result.sensitivity;
  const header = `<thead><tr><th>${esc(t('mortgage.sens.rate'))}</th>${s.terms
    .map((term) => `<th>${term} ${esc(t('common.yearsShort'))}</th>`)
    .join('')}</tr></thead>`;
  const body = s.rows
    .map(
      (rowData) => `<tr>
        <td class="${Math.abs(rowData.rate - result.rate) < 0.001 ? 'strong' : ''}">${number(
          rowData.rate,
          locale,
          2,
        )} %</td>
        ${rowData.cells
          .map(
            (payment, index) =>
              `<td class="${
                Math.abs(rowData.rate - result.rate) < 0.001 && s.terms[index] === result.years
                  ? 'strong'
                  : ''
              }">${money(payment, locale)}</td>`,
          )
          .join('')}
      </tr>`,
    )
    .join('');
  $('#sensitivity-table').innerHTML = header + `<tbody>${body}</tbody>`;
  const maxPayment = Math.max(0, state.income * 0.35 - state.otherDebts);
  $('#sensitivity-hint').textContent = t('mortgage.sens.hint', {
    max: money(maxPayment, locale),
  });
}

function renderRent() {
  const r = result;
  const rv = r.rentVsBuy;
  const diff = rv.finalBuyer - rv.finalRenter;
  const threshold = Math.max(Math.abs(rv.finalBuyer), Math.abs(rv.finalRenter)) * 0.02;
  const verdict = Math.abs(diff) < threshold ? 'tie' : diff > 0 ? 'buy' : 'rent';
  $('#rent-verdict').textContent =
    verdict === 'tie'
      ? t('rent.tie', { horizon: r.horizon })
      : t(verdict === 'buy' ? 'rent.verdictBuy' : 'rent.verdictRent', {
          diff: money(Math.abs(diff), locale),
          horizon: r.horizon,
        });
  $('#rent-tag').textContent = t('rent.horizonTag', { years: r.horizon });

  $('#rent-chart').innerHTML = wealthChart(rv.series, locale, {
    year: t('mortgage.sched.year'),
    aria: t('rent.title'),
  });
  $('#rent-legend').innerHTML = `
    <span><i class="line"></i>${esc(t('rent.buyer'))}</span>
    <span><i class="line dashed"></i>${esc(t('rent.renter'))}</span>`;

  $('#rent-stats').innerHTML = [
    stat(t('rent.finalBuyer'), money(rv.finalBuyer, locale)),
    stat(t('rent.finalRenter'), money(rv.finalRenter, locale)),
    stat(t('rent.diff'), money(Math.abs(diff), locale), verdict === 'buy' ? t('rent.buyer') : verdict === 'rent' ? t('rent.renter') : ''),
    stat(
      t('rent.breakEven'),
      rv.breakEven ? t('common.years', { n: rv.breakEven }) : t('rent.noBreakEven'),
    ),
    stat(
      t('rent.monthlyBuy'),
      money(r.payment + Number(state.opexYear) / 12, locale) + t('common.perMonth'),
    ),
    stat(t('rent.monthlyRent'), money(state.rent, locale) + t('common.perMonth')),
  ].join('');

  $('#rent-assumptions').innerHTML = [
    row(t('rent.aEntry'), money(r.cash, locale)),
    row(
      t('rent.aDiff'),
      money(r.payment + Number(state.opexYear) / 12 - Number(state.rent), locale) +
        t('common.perMonth'),
    ),
    row(t('rent.aReturn'), `${number(state.altReturnPct, locale, 1)} %`),
    row(t('rent.aGrowth'), `${number(state.appreciationPct, locale, 1)} %`),
    row(t('rent.aRentGrowth'), `${number(state.rentGrowthPct, locale, 1)} %`),
    row(t('rent.aSell'), `${number(state.sellingCostPct, locale, 1)} %`),
    row(t('rent.aRent'), money(state.rent, locale) + t('common.perMonth')),
    row(t('rent.aOpex'), money(state.opexYear, locale) + t('common.perYear')),
  ].join('');
}

function renderInvest() {
  const r = result;
  const inv = r.investment;
  $('#invest-tag').textContent = t('invest.tag', { rent: number(state.rent, locale) });
  $('#invest-stats').innerHTML = [
    stat(t('invest.gross'), percent(inv.grossYield, locale, 1)),
    stat(t('invest.net'), percent(inv.netYield, locale, 1)),
    stat(t('invest.cashOnCash'), percent(inv.cashOnCash, locale, 1)),
    stat(t('invest.capRate'), percent(inv.capRate, locale, 1)),
    stat(t('invest.noi'), money(inv.noi, locale)),
    stat(
      t('invest.cashflowAfterTax'),
      money(inv.afterTaxCashFlow, locale),
      t('invest.cashflowLabel'),
    ),
    stat(
      t('invest.payback'),
      inv.payback
        ? t('invest.paybackYears', { n: number(inv.payback, locale, 1) })
        : t('invest.paybackNever'),
    ),
    stat(t('invest.equity', { years: r.horizon }), money(r.horizonCosts.equity, locale)),
  ].join('');

  $('#invest-bars').innerHTML = yieldBars([
    { label: t('invest.gross'), value: inv.grossYield, display: percent(inv.grossYield, locale, 1) },
    { label: t('invest.net'), value: inv.netYield, display: percent(inv.netYield, locale, 1) },
    { label: t('invest.capRate'), value: inv.capRate, display: percent(inv.capRate, locale, 1) },
    {
      label: t('invest.cashOnCash'),
      value: inv.cashOnCash,
      display: percent(inv.cashOnCash, locale, 1),
    },
  ]);

  const flow = inv.cashFlow;
  $('#invest-note').innerHTML = `<div class="cashflow"><strong class="${flow >= 0 ? 'good-text' : 'bad-text'}">${money(
    Math.abs(flow),
    locale,
  )}${t('common.perYear')}</strong><span class="hint">${esc(
    t(flow >= 0 ? 'invest.positive' : 'invest.negative', { value: money(Math.abs(flow), locale) }),
  )}</span></div><p class="hint">${esc(t('invest.note'))}</p>`;

  const years = Math.min(10, r.horizon);
  const rows = [];
  for (let y = 1; y <= years; y += 1) {
    const rentYear = inv.annualRent * Math.pow(1 + state.rentGrowthPct / 100, y - 1);
    const effective = rentYear * (1 - state.vacancyPct / 100);
    const management = (effective * state.managementPct) / 100;
    const interest = r.amort.rows[y - 1]?.interest ?? 0;
    const tax = Math.max(0, effective - state.opexYear - management - interest) * (state.taxRatePct / 100);
    const cashFlow = effective - state.opexYear - management - inv.annualDebt - tax;
    const equity = r.price * Math.pow(1 + state.appreciationPct / 100, y) - (r.amort.rows[y - 1]?.balance ?? 0);
    rows.push({ y, rentYear, interest, tax, cashFlow, equity });
  }
  $('#invest-ten-tag').textContent = t('common.years', { n: years });
  $('#invest-table').innerHTML = `
    <thead><tr>
      <th>${esc(t('invest.years'))}</th>
      <th>${esc(t('invest.rentIncome'))}</th>
      <th>${esc(t('invest.interest'))}</th>
      <th>${esc(t('invest.tax'))}</th>
      <th>${esc(t('invest.cashflowLabel'))}</th>
      <th>${esc(t('invest.equityLabel'))}</th>
    </tr></thead>
    <tbody>${rows
      .map(
        (x) => `<tr>
          <td>${x.y}</td>
          <td>${money(x.rentYear, locale)}</td>
          <td>${money(x.interest, locale)}</td>
          <td>${money(x.tax, locale)}</td>
          <td class="${x.cashFlow < 0 ? 'bad-text' : 'good-text'}">${money(x.cashFlow, locale)}</td>
          <td>${money(x.equity, locale)}</td>
        </tr>`,
      )
      .join('')}</tbody>`;
}

function renderDisclaimer() {
  $('#disclaimer').textContent = t('footnote.disclaimer', {
    date: fmtDate('2026-11', locale),
  });
}

/* ------------------------------------------------------------------ */
/* Datos                                                               */
/* ------------------------------------------------------------------ */

function renderData() {
  if (!$('#tax-table')) return;
  $('#tax-table').innerHTML = `
    <thead><tr>
      <th>${esc(t('data.ccaa'))}</th>
      <th>${esc(t('data.itp'))}</th>
      <th>${esc(t('data.ajd'))}</th>
      <th>${esc(t('data.iva'))}</th>
      <th>${esc(t('data.source'))}</th>
    </tr></thead>
    <tbody>${REGIONS.map(
      (region) => `<tr>
        <td class="strong">${esc(regionName(region))}</td>
        <td>${rateRange(region)}${
          region.itp.length > 1
            ? `<span class="row-note">${esc(t('data.tramos'))}</span>`
            : ''
        }</td>
        <td>${percent(region.ajd, locale, 2)}</td>
        <td>${percent(region.iva, locale, 1)}</td>
        <td><a href="${esc(region.taxUrl)}" target="_blank" rel="noopener noreferrer">${esc(
          t('data.source'),
        )}</a></td>
      </tr>`,
    ).join('')}</tbody>`;

  $('#market-table').innerHTML = `
    <thead><tr>
      <th>${esc(t('data.ccaa'))}</th>
      <th>${esc(t('data.market'))}</th>
      <th>${esc(t('data.date'))}</th>
      <th>${esc(t('data.source'))}</th>
    </tr></thead>
    <tbody>${REGIONS.map(
      (region) => `<tr>
        <td class="strong">${esc(regionName(region))}</td>
        <td>${number(region.market, locale)}</td>
        <td>${esc(fmtDate(region.marketDate, locale))}</td>
        <td><a href="${esc(region.marketUrl)}" target="_blank" rel="noopener noreferrer">idealista</a></td>
      </tr>`,
    ).join('')}</tbody>`;

  $('#sources').innerHTML = SOURCES.map((source) => {
    const label = source.label[locale] || source.label.es;
    return `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(
      label,
    )}</a><br><span>${esc(fmtDate(source.date, locale))}</span></li>`;
  }).join('');

  const method = [
    ['method.itpTitle', 'method.itpText'],
    ['method.paymentTitle', 'method.paymentText'],
    ['method.taeTitle', 'method.taeText'],
    ['method.rentTitle', 'method.rentText'],
    ['method.investTitle', 'method.investText'],
    ['method.taxTitle', 'method.taxText'],
  ];
  $('#method').innerHTML = method
    .map(([title, text]) => `<p><strong>${esc(t(title))}.</strong> ${esc(t(text))}</p>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* Cuenta y guardados                                                  */
/* ------------------------------------------------------------------ */

async function loadSession() {
  try {
    const res = await fetch('/auth/freebuff/session', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      session = data && data.user ? { user: data.user } : null;
    }
  } catch (error) {
    session = null;
  }
  renderAccount();
  if (session) {
    loadCloud();
    loadFunnel();
  } else {
    funnel = null;
    renderFunnel();
  }
}

async function loadCloud() {
  if (!session) {
    cloudReports = [];
    renderReports();
    return;
  }
  try {
    const res = await fetch('/api/reports', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) {
      session = null;
      cloudReports = [];
      renderAccount();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      cloudReports = Array.isArray(data.reports) ? data.reports : [];
    }
  } catch (error) {
    cloudReports = [];
  }
  renderReports();
}

async function loadFunnel() {
  if (!session) {
    funnel = null;
    funnelDenied = false;
    renderFunnel();
    return;
  }
  try {
    const res = await fetch('/api/events', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) {
      funnel = null;
      funnelDenied = false;
      renderFunnel();
      return;
    }
    if (res.status === 403) {
      funnel = null;
      funnelDenied = true;
      funnelError = false;
      renderFunnel();
      return;
    }
    if (!res.ok) throw new Error('funnel');
    funnel = await res.json();
    funnelDenied = false;
    funnelError = false;
  } catch (error) {
    funnel = null;
    funnelDenied = false;
    funnelError = true;
  }
  renderFunnel();
}

function renderAccount() {
  const link = $('#account-link span');
  if (link) {
    link.textContent = session?.user
      ? session.user.name?.split(' ')[0] || t('nav.account')
      : t('account.signinShort');
  }
  const box = $('#auth-box');
  if (!box) return;
  if (session?.user) {
    const user = session.user;
    const avatar = user.picture
      ? `<img class="avatar" src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer" />`
      : `<span class="avatar">${esc((user.name || user.email || '?').slice(0, 1).toUpperCase())}</span>`;
    box.innerHTML = `
      <div class="auth-user">${avatar}<div><strong>${esc(user.name || t('account.signedIn'))}</strong><span>${esc(
        user.email || '',
      )}</span></div></div>
      <p><span class="tag good">${esc(t('account.cloudOn'))}</span></p>
      <p class="hint" style="margin:.6rem 0 1rem">${esc(t('account.cloud'))}</p>
      <form method="post" action="/auth/freebuff/signout">
        <button class="btn btn-outline btn-sm" type="submit">${esc(t('account.signout'))}</button>
      </form>`;
  } else {
    box.innerHTML = `
      <h3>${esc(t('account.signinTitle'))}</h3>
      <p class="lead" style="margin:.5rem 0 1rem">${esc(t('account.signinBody'))}</p>
      <a class="btn btn-primary" href="/auth/freebuff/signin?returnTo=%2F%23cuenta">${esc(
        t('account.signinCta'),
      )}</a>
      <p class="hint" style="margin-top:.7rem">${esc(t('account.local'))}</p>`;
  }
  renderReports();
  renderFunnel();
}

function renderReports() {
  const list = $('#reports-list');
  if (!list) return;
  const count = localReports.length + cloudReports.length;
  $('#reports-count').textContent = String(count);
  const groups = [];

  groups.push(`<p class="panel-eyebrow">${esc(t('account.localTitle'))}</p>`);
  groups.push(
    localReports.length
      ? localReports.map((report) => reportItem(report, 'local')).join('')
      : `<div class="empty">${esc(t('account.emptyLocal'))}</div>`,
  );

  groups.push(`<p class="panel-eyebrow" style="margin-top:.8rem">${esc(t('account.cloudTitle'))}</p>`);
  if (!session) {
    groups.push(
      `<div class="empty"><a href="/auth/freebuff/signin?returnTo=%2F%23cuenta">${esc(
        t('account.loginForCloud'),
      )}</a></div>`,
    );
  } else if (!cloudReports.length) {
    groups.push(`<div class="empty">${esc(t('account.empty'))}</div>`);
  } else {
    groups.push(cloudReports.map((report) => reportItem(report, 'cloud')).join(''));
  }
  list.innerHTML = groups.join('');
}

function renderFunnel() {
  const box = $('#funnel-panel');
  if (!box) return;
  if (!session) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  const title = `<div><h3>${esc(t('account.funnelTitle'))}</h3><p class="hint">${esc(
    t('account.funnelSub'),
  )}</p></div>`;
  const head = `<div class="card-head funnel-head">${title}<span class="tag">${esc(
    t('account.funnelWindow'),
  )}</span></div>`;
  if (funnelDenied) {
    box.innerHTML = `<div class="card-head funnel-head">${title}</div><div class="empty">${esc(
      t('account.funnelDenied', { email: session?.user?.email || '' }),
    )}</div>`;
    return;
  }
  if (funnelError) {
    box.innerHTML = `${head}<div class="empty">${esc(t('account.funnelError'))}</div>`;
    return;
  }
  if (!funnel) {
    box.innerHTML = `${head}<div class="empty">…</div>`;
    return;
  }
  const totals = funnel.totals || {};
  const days = Array.isArray(funnel.days) ? funnel.days : [];
  const tiles = FUNNEL_EVENTS.map(
    (key) =>
      `<div class="funnel-tile"><span>${esc(t(`account.funnel.${key}`))}</span><b>${number(
        Number(totals[key]) || 0,
        locale,
      )}</b></div>`,
  ).join('');
  const leadsTile = `<div class="funnel-tile is-lead"><span>${esc(
    t('account.funnelLeads'),
  )}</span><b>${number(Number(funnel.leads) || 0, locale)}</b></div>`;
  const headRow = `<tr><th scope="col">${esc(t('account.funnelDay'))}</th>${FUNNEL_EVENTS.map(
    (key) => `<th scope="col">${esc(t(`account.funnel.${key}`))}</th>`,
  ).join('')}</tr>`;
  const body = days.length
    ? days
        .map((entry) => {
          const events = entry.events || {};
          return `<tr><th scope="row">${esc(funnelDay(entry.day))}</th>${FUNNEL_EVENTS.map(
            (key) => `<td>${number(Number(events[key]) || 0, locale)}</td>`,
          ).join('')}</tr>`;
        })
        .join('')
    : `<tr><td colspan="${FUNNEL_EVENTS.length + 1}" class="funnel-empty">${esc(
        t('account.funnelEmpty'),
      )}</td></tr>`;
  box.innerHTML = `${head}
    <div class="funnel-tiles">${tiles}${leadsTile}</div>
    <div class="funnel-table-wrap">
      <table class="funnel-table" aria-label="${esc(t('account.funnelTitle'))}">
        <thead>${headRow}</thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row">${esc(t('account.funnelTotal'))}</th>${FUNNEL_EVENTS.map(
          (key) => `<td>${number(Number(totals[key]) || 0, locale)}</td>`,
        ).join('')}</tr></tfoot>
      </table>
    </div>`;
}

function funnelDay(day) {
  const date = new Date(`${day}T00:00:00Z`);
  if (!day || Number.isNaN(date.getTime())) return String(day || '');
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function reportItem(report, scope) {
  const s = report.state || {};
  const region = REGION_BY_ID[s.regionId] || REGION_BY_ID.madrid;
  const date = report.createdAt ? fmtDate(report.createdAt.slice(0, 7), locale) : '';
  return `<div class="report-item">
    <div>
      <strong>${esc(report.name || t('property.title'))}</strong>
      <span>${esc(regionName(region))} · ${money(s.price, locale)} · ${esc(date)}</span>
    </div>
    <div class="report-actions">
      <button type="button" data-action="open" data-scope="${scope}" data-id="${esc(report.id)}">${esc(
        t('common.open'),
      )}</button>
      <button type="button" data-action="export" data-scope="${scope}" data-id="${esc(report.id)}">${esc(
        t('common.export'),
      )}</button>
      <button type="button" data-action="delete" data-scope="${scope}" data-id="${esc(report.id)}">${esc(
        t('common.delete'),
      )}</button>
    </div>
  </div>`;
}

function openSaveDialog() {
  if ($('#save-dialog')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'save-dialog';
  dialog.className = 'modal';
  const suggested =
    state.label || `${regionName(result.region)} · ${number(state.m2, locale)} m²`;
  dialog.innerHTML = `
    <form class="modal-card" method="dialog">
      <h3>${esc(t('account.saveTitle'))}</h3>
      <label class="field" style="margin-top:.8rem">
        <span>${esc(t('account.saveName'))}</span>
        <input id="save-name" maxlength="60" value="${esc(suggested)}" autocomplete="off" />
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline btn-sm" data-close>${esc(t('common.cancel'))}</button>
        <button type="submit" class="btn btn-primary btn-sm">${esc(t('account.saveCta'))}</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  const input = $('#save-name', dialog);
  input.focus();
  input.select();
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      toast(t('account.nameRequired'));
      input.focus();
      return;
    }
    await saveReport(name);
    dialog.close();
  });
}

async function saveReport(name) {
  const report = {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 60),
    createdAt: new Date().toISOString(),
    state: { ...state, label: name.slice(0, 60) },
  };
  state.label = report.name;
  const labelInput = $('#label');
  if (labelInput) labelInput.value = report.name;
  saveState();

  const saveLocal = () => {
    localReports.unshift(report);
    localReports = localReports.slice(0, 50);
    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(localReports));
    } catch (error) {
      /* sin almacenamiento */
    }
  };

  if (!session) {
    saveLocal();
    toast(t('account.savedToast'));
  } else {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: report.name, state: report.state }),
      });
      if (res.status === 401) {
        session = null;
        saveLocal();
        toast(t('account.cloudError'));
      } else if (res.status === 409) {
        saveLocal();
        toast(t('account.limit'));
      } else if (!res.ok) {
        saveLocal();
        toast(t('account.cloudError'));
      } else {
        const data = await res.json();
        if (data.report) cloudReports.unshift(data.report);
        toast(t('account.savedToast'));
      }
    } catch (error) {
      saveLocal();
      toast(t('account.cloudError'));
    }
  }
  renderAccount();
}

function findReport(scope, id) {
  return (scope === 'cloud' ? cloudReports : localReports).find((r) => r.id === id);
}

function openReport(scope, id) {
  const report = findReport(scope, id);
  if (!report) return;
  state = { ...DEFAULT_STATE, ...report.state };
  state.label = report.name || state.label;
  saveState();
  syncControls();
  computeAndRender();
  document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(t('account.loadedToast'));
}

function exportReport(scope, id) {
  const report = findReport(scope, id);
  if (!report) return;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(report.name || 'cuentas-claras').replace(/[^\w\-]+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(t('account.exportedToast'));
}

async function deleteReport(scope, id) {
  if (!window.confirm(t('account.deleteConfirm'))) return;
  if (scope === 'local') {
    localReports = localReports.filter((r) => r.id !== id);
    try {
      localStorage.setItem(REPORTS_KEY, JSON.stringify(localReports));
    } catch (error) {
      /* sin almacenamiento */
    }
  } else {
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('delete');
      cloudReports = cloudReports.filter((r) => r.id !== id);
    } catch (error) {
      toast(t('account.error'));
      return;
    }
  }
  renderReports();
  toast(t('account.deletedToast'));
}

async function copySummary() {
  const lines = [
    `${t('property.title')}: ${state.label || `${regionName(result.region)} · ${state.m2} m²`}`,
    `${t('buy.price')}: ${money(result.price, locale)}`,
    `${t('buy.closing')}: ${money(result.closing, locale)}`,
    `${t('buy.cash')}: ${money(result.cash, locale)}`,
    `${t('mortgage.payment')}: ${money(result.payment, locale)}${t('common.perMonth')} · ${t(
      'mortgage.tae',
    )} ${number(result.tae, locale, 2)} %`,
    `${t('kpi.market')}: ${signedPercent(result.market.diffPct, locale, 1)}`,
    `${t('rent.title')}: ${$('#rent-verdict').textContent}`,
    `${t('data.sources')}: ${marketSourceName()} · Banco de España`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    toast(t('actions.copied'));
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = lines.join('\n');
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast(t('actions.copied'));
    } catch (err) {
      toast(t('actions.copyError'));
    }
    area.remove();
  }
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 3200);
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

function renderHeroData() {
  const box = $('#hero-data');
  if (!box) return;
  const chips = [
    [t('hero.stripEuribor'), `${number(state.euribor, locale, 2)} %`],
    [
      t('hero.stripMarket', { region: regionName(result.region) }),
      `${number(result.region.market, locale)} €/m²`,
    ],
    [t('hero.stripZones'), String(zonesFor(result.region.id).length)],
  ];
  box.innerHTML = chips
    .map(
      ([label, value]) =>
        `<div class="hero-chip"><span>${esc(label)}</span><b>${esc(value)}</b></div>`,
    )
    .join('');
}

function renderSummaryBar(budget = maxPrice(state)) {
  const cash = $('#sum-cash');
  if (!cash) return;
  cash.textContent = money(result.cash, locale);
  $('#sum-payment').textContent = `${money(result.payment, locale)}${t('common.perMonth')}`;
  $('#sum-budget').textContent = money(budget.price, locale);
}

function renderDiag(budget = maxPrice(state)) {
  const list = $('#diag-list');
  if (!list) return;
  const items = [];
  let score = 0;
  const income = Number(state.income) || 0;
  const debts = Number(state.otherDebts) || 0;
  const savings = Number(state.savings) || 0;
  const dti = income > 0 ? (result.payment + debts) / income : 0;

  if (income <= 0) {
    items.push({ tone: 'warn', text: t('diag.noIncome') });
  } else if (dti <= 0.35) {
    items.push({ tone: 'good', text: t('diag.dtiGood', { pct: percent(dti, locale, 0) }) });
    score += 1;
  } else if (dti <= 0.43) {
    items.push({ tone: 'warn', text: t('diag.dtiWarn', { pct: percent(dti, locale, 0) }) });
  } else {
    items.push({ tone: 'bad', text: t('diag.dtiBad', { pct: percent(dti, locale, 0) }) });
    score -= 1;
  }

  if (savings <= 0) {
    items.push({ tone: 'warn', text: t('diag.cashNone') });
  } else if (result.cash <= savings) {
    items.push({
      tone: 'good',
      text: t('diag.cashOk', {
        cash: money(result.cash, locale),
        left: money(savings - result.cash, locale),
      }),
    });
    score += 1;
  } else {
    items.push({
      tone: 'bad',
      text: t('diag.cashShort', {
        missing: money(result.cash - savings, locale),
        cash: money(result.cash, locale),
      }),
    });
    score -= 1;
  }

  if (result.market.benchmark > 0) {
    const diff = result.market.diffPct;
    if (diff <= -0.05) {
      items.push({ tone: 'good', text: t('diag.marketCheap', { pct: percent(-diff, locale, 0) }) });
      score += 1;
    } else if (diff >= 0.05) {
      items.push({
        tone: 'bad',
        text: t('diag.marketExpensive', { pct: percent(diff, locale, 0) }),
      });
      score -= 1;
    } else {
      items.push({ tone: 'neutral', text: t('diag.marketFair') });
    }
  }

  const { zone } = marketReference();
  if (zone) {
    items.push({
      tone: 'neutral',
      text: t('diag.zone', {
        zone: `${zone.name} · ${zone.city}`,
        perM2: number(zone.market, locale),
      }),
    });
  }

  if (budget.price > 0) {
    if (result.price <= budget.price) {
      items.push({
        tone: 'good',
        text: t('diag.budgetFits', { budget: money(budget.price, locale) }),
      });
      score += 1;
    } else {
      items.push({
        tone: 'bad',
        text: t('diag.budgetOver', {
          budget: money(budget.price, locale),
          gap: money(result.price - budget.price, locale),
        }),
      });
      score -= 1;
    }
  }

  const tone = score >= 2 ? 'good' : score >= 0 ? 'warn' : 'bad';
  const tag = $('#diag-score');
  if (tag) {
    tag.className = `tag ${tone}`;
    tag.textContent =
      tone === 'good' ? t('diag.vGood') : tone === 'warn' ? t('diag.vWarn') : t('diag.vBad');
  }
  list.innerHTML = items
    .map((item) => `<li data-tone="${item.tone}">${esc(item.text)}</li>`)
    .join('');
}

function mortgageRows() {
  const downPct = clamp(Number(state.downPct) || 0, 0, 100);
  const loan = Math.max(0, result.price * (1 - downPct / 100));
  const years = clamp(Math.round(Number(state.years) || 30), 1, 40);
  const months = years * 12;
  const opening = (loan * clamp(Number(state.openingFeePct) || 0, 0, 5)) / 100;
  const fixed = Number(state.tin) || 0;
  const variable = (Number(state.euribor) || 0) + (Number(state.spread) || 0);

  const balanceAfter = (principal, annualRate, totalMonths, paidMonths) => {
    if (principal <= 0) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return principal * (1 - paidMonths / totalMonths);
    const growth = Math.pow(1 + r, totalMonths);
    return (principal * (growth - Math.pow(1 + r, paidMonths))) / (growth - 1);
  };

  const rows = [
    { id: 'fixed', rate: fixed },
    { id: 'variable', rate: variable },
    { id: 'mixed', rate: fixed },
  ].map((type) => {
    const payment = annuity(loan, type.rate, years);
    return {
      ...type,
      payment,
      stress: annuity(loan, type.rate + 2, years),
      interest: Math.max(0, payment * months - loan),
      apr: loan > 0 ? tae(loan, payment, months, opening) : 0,
    };
  });

  // La mixta: cuota del tramo fijo y la de después, con el Euríbor de hoy.
  const fixedYears = clamp(Math.round(Number(state.fixedYears) || 5), 1, years - 1);
  const fixedMonths = fixedYears * 12;
  const p1 = annuity(loan, fixed, years);
  const balanceAtFix = balanceAfter(loan, fixed, months, fixedMonths);
  const p2 = annuity(balanceAtFix, variable, years - fixedYears);
  const mixed = rows.find((row) => row.id === 'mixed');
  mixed.payment = p1;
  mixed.later = p2;
  mixed.fixedYears = fixedYears;
  mixed.interest = Math.max(
    0,
    p1 * fixedMonths - (loan - balanceAtFix) + p2 * (months - fixedMonths) - balanceAtFix,
  );
  mixed.stress = annuity(loan, variable + 2, years);

  return rows;
}

function renderCompare() {
  const table = $('#compare-table');
  if (!table) return;
  const rows = mortgageRows();
  const best = rows.reduce((min, row) => (row.interest < min.interest ? row : min), rows[0]);
  const tag = $('#compare-tag');
  if (tag) tag.textContent = `${t('compare.best')}: ${t(`mortgage.${best.id}`)}`;
  table.innerHTML = `
    <thead><tr>
      <th></th>
      <th>${esc(t('compare.payment'))}</th>
      <th>${esc(t('compare.stress'))}</th>
      <th>${esc(t('compare.tae'))}</th>
      <th>${esc(t('compare.interest'))}</th>
    </tr></thead>
    <tbody>${rows
      .map(
        (row) => `<tr${row.id === best.id ? ' class="is-best"' : ''}>
          <td class="strong">${esc(t(`mortgage.${row.id}`))}${
            row.id === best.id
              ? ` <span class="tag good">${esc(t('compare.best'))}</span>`
              : ''
          }</td>
          <td>${esc(money(row.payment, locale))}${
            row.later ? ` → ${esc(money(row.later, locale))}` : ''
          }</td>
          <td>${esc(money(row.stress, locale))}</td>
          <td>${esc(number(row.apr, locale, 2))} %</td>
          <td>${esc(money(row.interest, locale))}</td>
        </tr>`,
      )
      .join('')}</tbody>`;
}

/* ------------------------------------------------------------------ */
/* Embudo: eventos propios, sin cookies ni datos personales            */
/* ------------------------------------------------------------------ */

function track(name) {
  try {
    fetch('/api/events', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  } catch (error) {
    /* la analítica es best-effort: nunca rompe la página */
  }
}

function setLeadAlert(message) {
  const alert = $('#lead-alert');
  if (!alert) return;
  alert.textContent = message || '';
  alert.hidden = !message;
}

function setupLeadForm() {
  const form = $('#lead-form');
  if (!form) return;
  form.addEventListener('input', () => setLeadAlert(''));
  const cta = $('#cta-broker');
  if (cta && typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        track('cta_view');
      },
      { threshold: 0.35 },
    );
    observer.observe(cta);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('#lead-name').value.trim();
    const phone = $('#lead-phone').value.trim();
    const email = $('#lead-email').value.trim();
    const consent = $('#lead-consent').checked;
    const digits = phone.replace(/\D/g, '');
    if (name.length < 2 || !consent) return toast(t('cta.required'));
    if (digits.length < 9) return toast(t('cta.invalidPhone'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast(t('cta.invalidEmail'));

    const button = $('#lead-submit');
    button.disabled = true;
    button.textContent = t('cta.sending');
    setLeadAlert('');
    track('cta_submit');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          consent: true,
          consentText: t('cta.consent'),
          source: 'cta-broker',
          company: $('#lead-company').value,
          context: {
            price: result.price,
            down: result.down,
            years: result.years,
            payment: Math.round(result.payment),
            cash: result.cash,
            savings: Number(state.savings) || 0,
            region: state.regionId,
            zone: state.marketSource === 'zone' ? state.marketZoneId || '' : '',
            marketRef: Number(state.marketRef) || 0,
          },
        }),
      });
      if (res.status === 429) {
        // El aviso es concreto: cuánto esperar y que no se ha guardado nada.
        const retry = Number(res.headers.get('Retry-After') || 0);
        const minutes = Math.max(1, Math.ceil((retry || 900) / 60));
        setLeadAlert(t('cta.rateLimited', { minutes }));
        button.disabled = false;
        button.textContent = t('cta.submit');
        return;
      }
      if (!res.ok) throw new Error('lead');
      track('lead_sent');
      form.innerHTML = `<p class="eyebrow">${esc(t('cta.doneEyebrow'))}</p><h4>${esc(
        t('cta.doneTitle'),
      )}</h4><p class="hint">${esc(t('cta.doneText'))}</p>`;
      toast(t('cta.doneTitle'));
    } catch (error) {
      button.disabled = false;
      button.textContent = t('cta.submit');
      toast(t('cta.error'));
    }
  });
}

function setupSummaryBar() {
  const bar = $('#summary-bar');
  const target = document.getElementById('calculadora');
  if (!bar || !target) return;
  bar.inert = true;
  bar.setAttribute('aria-hidden', 'true');
  let frame = 0;
  let shown = false;
  const update = () => {
    frame = 0;
    const rect = target.getBoundingClientRect();
    const show = rect.top < -120;
    if (show === shown) return;
    shown = show;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    bar.inert = !show;
    document.body.classList.toggle('has-summary', show);
  };
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  schedule();
}

function setupReveal() {
  const items = $$('.reveal');
  if (!items.length) return;
  if (reduceMotion() || typeof IntersectionObserver !== 'function') {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  items.forEach((item) => observer.observe(item));
}

function init() {
  applyStaticI18n();
  syncControls();
  bindControls();
  computeAndRender();
  renderData();
  renderAccount();
  setTab(activeTab);
  setupReveal();
  setupSummaryBar();
  setupLeadForm();
  track('calc_view');
  loadSession();
}

init();
