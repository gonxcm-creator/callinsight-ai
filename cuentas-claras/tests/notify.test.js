import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isNotifyConfigured,
  leadEmail,
  notificationAddress,
  sendLeadEmail,
} from '../worker/notify.js';

test('el destinatario explícito manda sobre la lista del embudo', () => {
  assert.equal(notificationAddress({ FUNNEL_EMAILS: 'a@example.com, b@example.com' }), 'a@example.com');
  assert.equal(
    notificationAddress({ FUNNEL_EMAILS: 'a@example.com', LEAD_NOTIFY_TO: 'avisos@example.com' }),
    'avisos@example.com',
  );
  assert.equal(notificationAddress({}), '');
});

test('el aviso solo se considera configurado con clave y destinatario', () => {
  assert.equal(isNotifyConfigured({}), false);
  assert.equal(isNotifyConfigured({ RESEND_API_KEY: 're_x' }), false);
  assert.equal(
    isNotifyConfigured({ RESEND_API_KEY: 're_x', FUNNEL_EMAILS: 'a@example.com' }),
    true,
  );
});

test('el correo lleva los datos útiles del lead y nada de HTML', () => {
  const { subject, text } = leadEmail(
    { name: 'Ana Pérez', phone: '600 111 222', email: 'ana@example.com', consentAt: '2026-11-22T10:00:00Z' },
    { price: 420000, region: 'madrid', zone: 'chamberi', marketRef: 4100 },
  );
  assert.equal(subject, 'Nuevo lead: Ana Pérez · 600 111 222');
  assert.match(text, /ana@example\.com/);
  assert.match(text, /420\.000 €/);
  assert.match(text, /Comunidad de Madrid/);
  assert.match(text, /4\.100 €\/m²/);
  assert.doesNotMatch(text, /<[a-z]/i);
});

test('sin clave no se intenta enviar ni se lanza', async () => {
  const result = await sendLeadEmail({ FUNNEL_EMAILS: 'a@example.com' }, {
    name: 'Ana',
    phone: '600111222',
    email: 'ana@example.com',
    consentAt: '2026-11-22T10:00:00Z',
  }, {});
  assert.deepEqual(result, { sent: false, reason: 'not-configured' });
});
