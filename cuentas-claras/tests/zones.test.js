import test from 'node:test';
import assert from 'node:assert/strict';

import { REGIONS, ZONES, zonesFor } from '../js/data.js';
import { ZONE_PRICES } from '../js/zone-prices.js';

test('todas las zonas tienen id único y comunidad válida', () => {
  const ids = new Set();
  const regionIds = new Set(REGIONS.map((region) => region.id));
  for (const zone of ZONES) {
    assert.ok(!ids.has(zone.id), `id repetido: ${zone.id}`);
    ids.add(zone.id);
    assert.ok(regionIds.has(zone.regionId), `comunidad desconocida: ${zone.regionId}`);
    assert.ok(zone.name && zone.city, `zona sin nombre o ciudad: ${zone.id}`);
  }
});

test('cada comunidad tiene al menos dos zonas', () => {
  for (const region of REGIONS) {
    assert.ok(zonesFor(region.id).length >= 2, `${region.id} sin zonas suficientes`);
  }
});

test('el precio de cada zona es el dato publicado de Fotocasa, con mes y lugar', () => {
  for (const zone of ZONES) {
    const published = ZONE_PRICES[zone.id];
    assert.ok(published, `${zone.id} sin precio publicado`);
    assert.equal(zone.market, published.perM2);
    assert.equal(zone.marketDate, published.date);
    assert.equal(zone.marketPlace, published.place);
    assert.match(zone.marketDate, /^\d{4}-\d{2}$/);
    assert.ok(zone.market > 200 && zone.market < 30000, `${zone.id}: €/m² fuera de rango`);
  }
});

test('los enlaces de búsqueda apuntan a cada portal y a la zona', () => {
  for (const zone of ZONES) {
    assert.match(zone.fotocasa, /^https:\/\/www\.fotocasa\.es\/es\/comprar\/viviendas\/.+\/l$/);
    assert.match(zone.pisos, /^https:\/\/www\.pisos\.com\/venta\/pisos-.+\/$/);
  }
});
