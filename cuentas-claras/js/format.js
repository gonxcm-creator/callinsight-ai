const cache = new Map();

function nf(locale, options) {
  const key = locale + JSON.stringify(options);
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale, options));
  return cache.get(key);
}

export function money(value, locale = 'es', decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return nf(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: 'always',
  }).format(n);
}

export function moneyCompact(value, locale = 'es') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return (
    nf(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n) + ' €'
  );
}

export function number(value, locale = 'es', decimals = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return nf(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: 'always',
  }).format(n);
}

export function percent(value, locale = 'es', decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return nf(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function signedPercent(value, locale = 'es', decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const text = percent(Math.abs(n), locale, decimals);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${text}`;
}
