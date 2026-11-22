import test from 'node:test';
import assert from 'node:assert/strict';

import { canSeeFunnel, parseFunnelEmails } from '../worker/access.js';

test('el embudo falla en cerrado sin lista configurada', () => {
  assert.equal(canSeeFunnel('', 'gonxcm@gmail.com'), false);
  assert.equal(canSeeFunnel(undefined, 'gonxcm@gmail.com'), false);
  assert.equal(canSeeFunnel('   ', 'gonxcm@gmail.com'), false);
});

test('acepta varios correos, mayúsculas y separadores distintos', () => {
  const list = ' Gonxcm@Gmail.com, otro@example.com;tercero@example.com ';
  assert.deepEqual(parseFunnelEmails(list), [
    'gonxcm@gmail.com',
    'otro@example.com',
    'tercero@example.com',
  ]);
  assert.equal(canSeeFunnel(list, 'gonxcm@gmail.com'), true);
  assert.equal(canSeeFunnel(list, 'OTRO@EXAMPLE.COM'), true);
});

test('rechaza correos fuera de la lista o vacíos', () => {
  const list = 'gonxcm@gmail.com';
  assert.equal(canSeeFunnel(list, 'otra@example.com'), false);
  assert.equal(canSeeFunnel(list, ''), false);
  assert.equal(canSeeFunnel(list, undefined), false);
  assert.equal(canSeeFunnel(list, 'gonxcm@gmail.com '), true);
});
