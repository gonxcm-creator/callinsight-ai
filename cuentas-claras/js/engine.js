/**
 * Motor de cálculo de Cuentas Claras.
 * Funciones puras: no tocan el DOM ni hacen red. Se prueban en tests/engine.test.js
 */

import { CONDITION_BY_ID, DEFAULT_STATE, REGION_BY_ID } from './data.js';

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function resolveState(partial = {}) {
  return { ...DEFAULT_STATE, ...partial };
}

/** ITP con tramos marginales. `price` en euros. */
export function itpFor(region, price) {
  if (!region || !price || price <= 0) return 0;
  let tax = 0;
  let previous = 0;
  for (const [limit, rate] of region.itp) {
    if (price <= previous) break;
    const cap = limit == null ? Infinity : limit;
    const slice = Math.min(price, cap) - previous;
    if (slice > 0) tax += slice * rate;
    if (price <= cap) break;
    previous = cap;
  }
  return tax;
}

export function itpLabel(region) {
  if (!region) return '';
  const rates = region.itp.map(([, r]) => r * 100);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const fmt = (v) => String(Number(v.toFixed(2))).replace('.', ',');
  return min === max ? `${fmt(min)} %` : `${fmt(min)}–${fmt(max)} %`;
}

export function annuity(principal, annualRatePct, years) {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  const rate = Math.max(0, annualRatePct) / 100 / 12;
  const n = Math.round(years * 12);
  if (rate === 0) return principal / n;
  return (principal * rate) / (1 - Math.pow(1 + rate, -n));
}

/**
 * Amortización francesa con cuota extra mensual y/o aportación puntual.
 * `lump` = { month, amount } con month empezando en 0.
 */
export function amortization(principal, annualRatePct, years, extraMonthly = 0, lump = null) {
  const payment = annuity(principal, annualRatePct, years);
  const monthlyRate = Math.max(0, annualRatePct) / 100 / 12;
  const maxMonths = Math.round(years * 12) + 600;
  const rows = [];
  let balance = Math.max(0, principal);
  let totalInterest = 0;
  let month = 0;
  let yearInterest = 0;
  let yearPrincipal = 0;

  while (balance > 0.01 && month < maxMonths) {
    const interest = balance * monthlyRate;
    let principalPart = payment - interest + (extraMonthly > 0 ? extraMonthly : 0);
    if (lump && month === num(lump.month)) principalPart += num(lump.amount);
    if (principalPart <= 0) break;
    if (principalPart > balance) principalPart = balance;
    balance -= principalPart;
    totalInterest += interest;
    yearInterest += interest;
    yearPrincipal += principalPart;
    month += 1;
    if (month % 12 === 0 || balance <= 0.01) {
      rows.push({
        year: Math.ceil(month / 12),
        interest: yearInterest,
        principal: yearPrincipal,
        balance,
      });
      yearInterest = 0;
      yearPrincipal = 0;
    }
  }

  return { payment, months: month, totalInterest, rows };
}

/** TAE a partir de los flujos reales del préstamo (incluye comisión de apertura). */
export function tae(principal, payment, months, openingFee = 0) {
  if (!principal || !payment || !months) return 0;
  const npv = (r) => {
    let value = principal - openingFee;
    for (let m = 1; m <= months; m += 1) value -= payment / Math.pow(1 + r, m);
    return value;
  };
  let low = -0.9999;
  let high = 1;
  let fLow = npv(low);
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (fLow * fMid <= 0) {
      high = mid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  const monthly = (low + high) / 2;
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

/**
 * Impuestos y gastos de una compra para un precio dado. Se usa en computeState y en
 * maxPrice para que el presupuesto y el desglose nunca discrepen.
 */
function buyCosts({ price, loan, region, newBuild, agencyPct, openingFeePct }) {
  const taxes = newBuild
    ? { itp: 0, iva: price * region.iva, ajd: price * region.ajd, total: 0 }
    : { itp: itpFor(region, price), iva: 0, ajd: 0, total: 0 };
  taxes.total = taxes.itp + taxes.iva + taxes.ajd;

  const notary = price ? clamp(600 + price * 0.0008, 650, 1800) : 0;
  const registry = price ? clamp(380 + price * 0.0005, 420, 1200) : 0;
  const gestoria = price ? 500 : 0;
  const appraisal = loan > 0 ? 450 : 0;
  const agency = (price * clamp(num(agencyPct), 0, 15)) / 100;
  const opening = (loan * clamp(num(openingFeePct), 0, 5)) / 100;

  return {
    taxes,
    notary,
    registry,
    gestoria,
    appraisal,
    agency,
    opening,
    closing: taxes.total + notary + registry + gestoria + appraisal + agency + opening,
  };
}

function rateFor(state) {
  if (state.mortgageType === 'variable') {
    return clamp(num(state.euribor) + num(state.spread), 0, 20);
  }
  return clamp(num(state.tin), 0, 20);
}

export function computeState(partial = {}) {
  const state = resolveState(partial);
  const region = REGION_BY_ID[state.regionId] || REGION_BY_ID.madrid;
  const condition = CONDITION_BY_ID[state.conditionId] || CONDITION_BY_ID.good;

  const price = Math.max(0, num(state.price));
  const m2 = Math.max(1, num(state.m2, 1));
  const downPct = clamp(num(state.downPct, 20), 0, 100);
  const down = (price * downPct) / 100;
  const loan = Math.max(0, price - down);
  const years = clamp(Math.round(num(state.years, 30)), 1, 40);
  const newBuild = state.propertyType === 'nueva';

  const { taxes, notary, registry, gestoria, appraisal, agency, opening, closing } = buyCosts({
    price,
    loan,
    region,
    newBuild,
    agencyPct: state.agencyPct,
    openingFeePct: state.openingFeePct,
  });

  const reformPerM2 =
    state.reformPerM2 === null || state.reformPerM2 === undefined
      ? condition.reformPerM2
      : Math.max(0, num(state.reformPerM2));
  const reform = reformPerM2 * m2;
  const furniture = Math.max(0, num(state.furniture));

  const cash = down + closing + reform + furniture;
  const totalCost = price + closing + reform + furniture;

  const rate = rateFor(state);
  const payment = annuity(loan, rate, years);
  const amort = amortization(loan, rate, years);
  const totalInterest = amort.totalInterest;
  const openingFee = (loan * clamp(num(state.openingFeePct), 0, 5)) / 100;
  const taeValue = loan > 0 ? tae(loan, payment, Math.round(years * 12), openingFee) : 0;
  const stressPayment = annuity(loan, rate + 2, years);

  let mixedPayment = 0;
  if (state.mortgageType === 'mixed' && loan > 0) {
    const fixedYears = clamp(Math.round(num(state.fixedYears, 5)), 1, years - 1);
    const fixedMonths = fixedYears * 12;
    const row = amort.rows[Math.min(fixedYears - 1, amort.rows.length - 1)];
    const balanceAtFix = row ? row.balance : loan;
    mixedPayment = annuity(balanceAtFix, num(state.euribor) + num(state.spread), years - fixedYears);
  }

  const income = Math.max(0, num(state.income));
  const otherDebts = Math.max(0, num(state.otherDebts));
  const dti = income > 0 ? (payment + otherDebts) / income : 0;
  const ltv = price > 0 ? loan / price : 0;

  const benchmark = Math.max(0, num(state.marketRef) || region.market);
  const pricePerM2 = price / m2;
  const diffPct = benchmark > 0 ? pricePerM2 / benchmark - 1 : 0;
  const fairValue = benchmark * m2 * condition.factor;
  const verdict = diffPct <= -0.15 ? 'opportunity' : diffPct >= 0.1 ? 'expensive' : 'fair';

  const annualRent = Math.max(0, num(state.rent)) * 12;
  const effectiveRent = annualRent * (1 - clamp(num(state.vacancyPct), 0, 100) / 100);
  const opexYear = Math.max(0, num(state.opexYear));
  const management = (effectiveRent * clamp(num(state.managementPct), 0, 30)) / 100;
  const noi = effectiveRent - opexYear - management;
  const annualDebt = payment * 12;
  const firstYearInterest = amort.rows[0] ? amort.rows[0].interest : 0;
  const taxAnnual = Math.max(0, noi - firstYearInterest) * (clamp(num(state.taxRatePct), 0, 60) / 100);
  const cashFlow = noi - annualDebt;
  const afterTaxCashFlow = cashFlow - taxAnnual;

  const grossYield = totalCost > 0 ? annualRent / totalCost : 0;
  const netYield = totalCost > 0 ? noi / totalCost : 0;
  const capRate = price > 0 ? noi / price : 0;
  const cashOnCash = cash > 0 ? cashFlow / cash : 0;
  const payback = afterTaxCashFlow > 0 ? cash / afterTaxCashFlow : null;

  const horizon = clamp(Math.round(num(state.horizon, 10)), 1, 40);
  const gratitude = clamp(num(state.appreciationPct), -10, 15) / 100;
  const rentGrowth = clamp(num(state.rentGrowthPct), -5, 15) / 100;
  const altReturn = clamp(num(state.altReturnPct), 0, 15) / 100;
  const sellingCost = clamp(num(state.sellingCostPct), 0, 10) / 100;

  // Alquilar vs comprar: el inquilino invierte la entrada y la diferencia mensual.
  let portfolio = cash;
  let balance = loan;
  const monthlyAlt = altReturn / 12;
  const series = [];
  let breakEven = null;

  for (let m = 1; m <= horizon * 12; m += 1) {
    const yearIndex = Math.floor((m - 1) / 12);
    const rentMonth = num(state.rent) * Math.pow(1 + rentGrowth, yearIndex);
    const mortgageMonth = balance > 0.01 ? payment : 0;
    const buyerMonth = mortgageMonth + opexYear / 12;
    portfolio = portfolio * (1 + monthlyAlt) + (buyerMonth - rentMonth);

    if (balance > 0.01) {
      const interest = balance * (rate / 100 / 12);
      balance = Math.max(0, balance - (payment - interest));
    }

    if (m % 12 === 0) {
      const year = m / 12;
      const homeValue = price * Math.pow(1 + gratitude, year);
      const buyerNet = homeValue * (1 - sellingCost) - balance;
      const renterNet = portfolio;
      series.push({ year, buyer: buyerNet, renter: renterNet });
      if (breakEven === null && buyerNet >= renterNet) breakEven = year;
    }
  }

  let interestPaid = 0;
  for (const row of amort.rows) {
    if (row.year > horizon) break;
    interestPaid += row.interest;
  }
  const balanceAtHorizon = balance;

  const sensitivityRates = [...new Set([-1, -0.5, 0, 0.5, 1, 2].map((d) => Math.max(0, Number((rate + d).toFixed(2)))))];
  const sensitivityTerms = [15, 20, 25, 30, 35];
  const sensitivity = sensitivityRates.map((r) => ({
    rate: r,
    cells: sensitivityTerms.map((term) => annuity(loan, r, term)),
  }));

  return {
    state,
    region,
    condition,
    price,
    m2,
    down,
    loan,
    ltv,
    years,
    rate,
    taxes,
    fees: { notary, registry, gestoria, appraisal, agency, opening },
    closing,
    reform,
    reformPerM2,
    furniture,
    cash,
    totalCost,
    payment,
    mixedPayment,
    totalInterest,
    tae: taeValue,
    stressPayment,
    dti,
    amort,
    market: {
      benchmark,
      pricePerM2,
      diffPct,
      fairValue,
      fairLow: fairValue * 0.92,
      fairHigh: fairValue * 1.08,
      verdict,
      date: region.marketDate,
    },
    investment: {
      annualRent,
      effectiveRent,
      opexYear,
      noi,
      grossYield,
      netYield,
      capRate,
      annualDebt,
      cashFlow,
      cashOnCash,
      taxAnnual,
      afterTaxCashFlow,
      payback,
    },
    rentVsBuy: { series, breakEven, finalBuyer: series.at(-1)?.buyer ?? 0, finalRenter: series.at(-1)?.renter ?? 0 },
    horizonCosts: {
      interestPaid,
      opexPaid: opexYear * horizon,
      nonRecoverable: closing + reform + furniture + interestPaid + opexYear * horizon,
      equity: price * Math.pow(1 + gratitude, horizon) - balanceAtHorizon,
    },
    sensitivity: { rates: sensitivityRates, terms: sensitivityTerms, rows: sensitivity },
    horizon,
  };
}

/**
 * Precio máximo alcanzable con los ingresos y los ahorros del análisis.
 * Tope 1 (cuota): la mensualidad no pasa del 35 % de los ingresos netos menos otras deudas.
 * Tope 2 (ahorro): los ahorros cubren entrada + gastos de compra + reforma + muebles.
 * Usa el mismo cálculo de gastos que computeState para que nunca discrepen.
 */
export function maxPrice(partial = {}) {
  const state = resolveState(partial);
  const region = REGION_BY_ID[state.regionId] || REGION_BY_ID.madrid;
  const condition = CONDITION_BY_ID[state.conditionId] || CONDITION_BY_ID.good;
  const newBuild = state.propertyType === 'nueva';
  const downPct = clamp(num(state.downPct, 20), 0, 100);
  const years = clamp(Math.round(num(state.years, 30)), 1, 40);
  const rate = rateFor(state);
  const savings = Math.max(0, num(state.savings));
  const income = Math.max(0, num(state.income));
  const otherDebts = Math.max(0, num(state.otherDebts));
  const maxMonthly = Math.max(0, income * 0.35 - otherDebts);

  const reformPerM2 =
    state.reformPerM2 === null || state.reformPerM2 === undefined
      ? condition.reformPerM2
      : Math.max(0, num(state.reformPerM2));
  const extras =
    reformPerM2 * Math.max(1, num(state.m2, 1)) + Math.max(0, num(state.furniture));

  const monthlyRate = Math.max(0, rate) / 100 / 12;
  const months = years * 12;
  const loanMax =
    maxMonthly <= 0
      ? 0
      : monthlyRate === 0
        ? maxMonthly * months
        : (maxMonthly * (1 - Math.pow(1 + monthlyRate, -months))) / monthlyRate;

  const cashFor = (price) => {
    const down = (price * downPct) / 100;
    const loan = Math.max(0, price - down);
    const costs = buyCosts({
      price,
      loan,
      region,
      newBuild,
      agencyPct: state.agencyPct,
      openingFeePct: state.openingFeePct,
    });
    return down + costs.closing + extras;
  };

  let byCash = 0;
  if (savings > 0) {
    let low = 0;
    let high = savings * 20 + 100000;
    for (let i = 0; i < 60; i += 1) {
      const mid = (low + high) / 2;
      if (cashFor(mid) > savings) high = mid;
      else low = mid;
    }
    byCash = Math.max(0, Math.floor(low));
  }

  const byLoan = downPct >= 100 ? byCash : loanMax / (1 - downPct / 100);
  const price = Math.max(0, Math.min(byCash, byLoan));
  const down = (price * downPct) / 100;
  const loan = Math.max(0, price - down);

  return {
    price,
    down,
    loan,
    payment: loan > 0 ? annuity(loan, rate, years) : 0,
    cash: price > 0 ? cashFor(price) : 0,
    maxMonthly,
    loanMax,
    byCash,
    byLoan,
    limitedBy: byCash <= byLoan ? 'cash' : 'loan',
    dtiLimit: 0.35,
  };
}
