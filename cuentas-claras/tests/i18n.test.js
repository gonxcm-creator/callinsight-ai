import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { STRINGS } from '../js/i18n.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'js/app.js'), 'utf8');
const charts = readFileSync(join(root, 'js/charts.js'), 'utf8');

const keysOf = (obj) => Object.keys(obj).sort();
const esKeys = keysOf(STRINGS.es);

test('los tres idiomas tienen exactamente las mismas claves', () => {
  for (const locale of ['en', 'fr']) {
    assert.deepEqual(keysOf(STRINGS[locale]), esKeys, `paridad de ${locale}`);
  }
});

test('no hay textos vacíos', () => {
  for (const [locale, dict] of Object.entries(STRINGS)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(String(value).trim().length > 0, `${locale}:${key} vacío`);
    }
  }
});

test('las variables de interpolación coinciden entre idiomas', () => {
  const vars = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of esKeys) {
    const expected = vars(STRINGS.es[key]);
    for (const locale of ['en', 'fr']) {
      assert.deepEqual(vars(STRINGS[locale][key]), expected, `${locale}:${key}`);
    }
  }
});

test('no se usan variables no declaradas', () => {
  const vars = (text) => new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  for (const key of esKeys) {
    for (const locale of ['en', 'fr']) {
      assert.deepEqual(vars(STRINGS[locale][key]), vars(STRINGS.es[key]), `${locale}:${key}`);
    }
  }
});

test('todas las claves de index.html existen en español', () => {
  const used = [...html.matchAll(/data-i18n(?:-placeholder|-aria-label)?="([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.ok(used.length > 80);
  for (const key of used) assert.ok(STRINGS.es[key], `falta ${key}`);
});

test('todas las claves literales de app.js y charts.js existen', () => {
  const used = [...`${app}\n${charts}`.matchAll(/\bt\('([a-z][a-zA-Z0-9.]+)'/g)].map(
    (m) => m[1],
  );
  assert.ok(used.length > 40);
  for (const key of used) assert.ok(STRINGS.es[key], `falta ${key}`);
});
