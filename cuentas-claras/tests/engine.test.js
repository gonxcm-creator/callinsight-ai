import test from 'node:test';
import assert from 'node:assert/strict';

import { REGION_BY_ID } from '../js/data.js';
import { annuity, amortization, computeState, itpFor, tae } from '../js/engine.js';

const near = (actual, expected, tolerance = 1) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ${expected} ±${tolerance}, recibido ${actual}`,
  );

test('ITP Madrid: 6 % plano', () => {
  near(itpFor(REGION_BY_ID.madrid, 400000), 24000);
  near(itpFor(REGION_BY_ID.madrid, 0), 0);
});

test('ITP Cataluña: tramos 10/11/12/13 %', () => {
  near(itpFor(REGION_BY_ID.cataluna, 700000), 600000 * 0.1 + 100000 * 0.11);
  near(itpFor(REGION_BY_ID.cataluna, 2000000), 60000 + 33000 + 72000 + 65000);
});

test('ITP Baleares: escala hasta el 13 %', () => {
  near(itpFor(REGION_BY_ID.baleares, 2500000), 32000 + 18000 + 40000 + 120000 + 65000);
});

test('Cuota francesa: 200.000 € al 3,2 % a 30 años', () => {
  const payment = annuity(200000, 3.2, 30);
  near(payment, 864.9, 2);
});

test('Amortización completa y con cuota extra', () => {
  const base = amortization(200000, 3.2, 30);
  assert.equal(base.months, 360);
  near(base.totalInterest, 111160, 1200);

  const extra = amortization(200000, 3.2, 30, 200);
  assert.ok(extra.months < 360);
  assert.ok(extra.totalInterest < base.totalInterest);
});

test('TAE: iguala al TIN sin comisiones y sube con apertura', () => {
  const payment = annuity(200000, 3.2, 30);
  near(tae(200000, payment, 360), 3.2, 0.2);
  const withFee = tae(200000, payment, 360, 2000);
  assert.ok(withFee > 3.2);
});

test('Compra por defecto en Madrid: gastos y efectivo', () => {
  const result = computeState();
  near(result.taxes.itp, 25200);
  near(result.closing, 25200 + 936 + 590 + 500 + 450);
  near(result.cash, 84000 + 27676);
  near(result.totalCost, 447676);
  assert.ok(result.payment > 1400 && result.payment < 1500);
  assert.ok(result.market.diffPct < 0);
  assert.equal(result.rentVsBuy.series.length, 10);
  assert.ok(Number.isFinite(result.rentVsBuy.finalBuyer));
});

test('Obra nueva en Canarias usa IGIC y AJD', () => {
  const result = computeState({
    regionId: 'canarias',
    propertyType: 'nueva',
    price: 300000,
  });
  near(result.taxes.iva, 21000);
  near(result.taxes.ajd, 2250);
  assert.equal(result.taxes.itp, 0);
});

test('Sin precio no produce NaN', () => {
  const result = computeState({ price: 0, rent: 0, income: 0 });
  assert.equal(result.cash, 0);
  assert.equal(result.payment, 0);
  assert.ok(Number.isFinite(result.investment.netYield));
  assert.ok(Number.isFinite(result.rentVsBuy.finalBuyer));
});

test('Más entrada reduce préstamo y cuota', () => {
  const base = computeState({ downPct: 10 });
  const more = computeState({ downPct: 40 });
  assert.ok(more.loan < base.loan);
  assert.ok(more.payment < base.payment);
  assert.ok(more.cash > base.cash);
});
