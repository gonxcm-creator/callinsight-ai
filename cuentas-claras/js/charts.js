import { moneyCompact, number } from './format.js';

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Donut de composición. segments: [{ value, label, cls, color }] */
export function donut(segments, centerTitle, centerLabel) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) return '';
  let offset = 0;
  const circles = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = (s.value / total) * 100;
      const dash = `stroke-dasharray="${pct.toFixed(3)} ${(100 - pct).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"`;
      offset += pct;
      return `<circle class="${s.cls}" cx="60" cy="60" r="48" pathLength="100" ${dash}></circle>`;
    })
    .join('');

  const legend = segments
    .filter((s) => s.value > 0)
    .map(
      (s) =>
        `<li><span class="lg-name"><i class="dot" style="background:${s.color}"></i>${esc(s.label)}</span><strong>${Math.round((s.value / total) * 100)} %</strong></li>`,
    )
    .join('');

  return `
    <div class="donut">
      <svg viewBox="0 0 120 120" role="presentation">
        <circle class="track" cx="60" cy="60" r="48"></circle>
        ${circles}
      </svg>
      <div class="donut-center"><strong>${esc(centerTitle)}</strong><span>${esc(centerLabel)}</span></div>
    </div>
    <ul class="donut-legend">${legend}</ul>`;
}

/** Gráfico de líneas de patrimonio. series: [{ year, buyer, renter }] */
export function wealthChart(series, locale, labels = {}) {
  if (!series.length) return '';
  const W = 640;
  const H = 260;
  const pad = { left: 56, right: 14, top: 14, bottom: 28 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const values = series.flatMap((d) => [d.buyer, d.renter, 0]);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) max = min + 1;
  const span = max - min;
  min = Math.floor((min - span * 0.08) / 1000) * 1000;
  max = Math.ceil((max + span * 0.08) / 1000) * 1000;

  const x = (i) => pad.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / (max - min)) * innerH;

  const path = (key) =>
    series.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');

  const area = `${path('buyer')} L${x(series.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const grid = ticks
    .map((t) => {
      const value = min + t * (max - min);
      const yy = y(value);
      return `<line class="grid-line" x1="${pad.left}" y1="${yy.toFixed(1)}" x2="${W - pad.right}" y2="${yy.toFixed(1)}"></line>
        <text class="axis-text" x="${pad.left - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${esc(moneyCompact(value, locale))}</text>`;
    })
    .join('');

  const xTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  const xs = xTicks
    .map((i) => {
      const label = String(series[i].year);
      const anchor = i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle';
      return `<text class="axis-text" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${esc(labels.year || '')} ${label}</text>`;
    })
    .join('');

  const last = series.at(-1);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(labels.aria || '')}">
    ${grid}
    <path class="buyer-area" d="${area}"></path>
    <path class="renter-line" d="${path('renter')}"></path>
    <path class="buyer-line" d="${path('buyer')}"></path>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last.buyer).toFixed(1)}" r="3.2" fill="var(--accent)"></circle>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last.renter).toFixed(1)}" r="3.2" fill="var(--clay)"></circle>
    ${xs}
  </svg>`;
}

/** Barras anuales de amortización: principal vs intereses. */
export function amortBars(rows, locale) {
  if (!rows.length) return '';
  const max = Math.max(...rows.map((r) => r.principal + r.interest), 1);
  const bars = rows
    .map((r) => {
      const p = (r.principal / max) * 100;
      const i = (r.interest / max) * 100;
      return `<div class="amort-year" title="${esc(`${locale === 'es' ? 'Año' : locale === 'fr' ? 'Année' : 'Year'} ${r.year}: ${number(r.principal, locale)} € + ${number(r.interest, locale)} €`)}">
        <span class="bar interest" style="height:${i.toFixed(2)}%"></span>
        <span class="bar principal" style="height:${p.toFixed(2)}%"></span>
      </div>`;
    })
    .join('');
  return bars;
}

/** Filas de barras horizontales para rentabilidades (0–max visual). */
export function yieldBars(items) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0.0001);
  return items
    .map(
      (item) => `<div class="yield-row">
        <span>${esc(item.label)}</span>
        <div class="bar-track"><i style="width:${Math.min(100, (Math.abs(item.value) / max) * 100).toFixed(1)}%"></i></div>
        <strong>${esc(item.display)}</strong>
      </div>`,
    )
    .join('');
}
