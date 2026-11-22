import { REGION_BY_ID } from '../js/data.js';
import { parseFunnelEmails } from './access.js';

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Cuentas Claras <onboarding@resend.dev>';

export function notificationAddress(env) {
  const explicit = String(env.LEAD_NOTIFY_TO || '').trim();
  if (explicit) return explicit;
  return parseFunnelEmails(env.FUNNEL_EMAILS)[0] || '';
}

export function isNotifyConfigured(env) {
  return Boolean(String(env.RESEND_API_KEY || '').trim() && notificationAddress(env));
}

function valueOrDash(value, unit) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return `${number.toLocaleString('es-ES', { useGrouping: 'always' })}${unit ? ` ${unit}` : ''}`;
}

/** Texto plano del aviso: solo lo necesario para devolver la llamada con contexto. */
export function leadEmail(lead, context = {}) {
  const region = REGION_BY_ID[context.region];
  const lines = [
    `Nombre: ${lead.name}`,
    `Teléfono: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Consentimiento: ${lead.consentAt}`,
    '',
    `Precio: ${valueOrDash(context.price, '€')}`,
    `Entrada: ${valueOrDash(context.down, '€')}`,
    `Plazo: ${valueOrDash(context.years, 'años')}`,
    `Cuota: ${valueOrDash(context.payment, '€/mes')}`,
    `Efectivo necesario: ${valueOrDash(context.cash, '€')}`,
    `Ahorros: ${valueOrDash(context.savings, '€')}`,
    `Comunidad: ${region ? region.name.es : context.region || '—'}`,
    `Zona: ${context.zone || '—'}`,
    `€/m² de referencia: ${valueOrDash(context.marketRef, '€/m²')}`,
    '',
    `Responde directamente a ${lead.email}.`,
  ];
  return {
    subject: `Nuevo lead: ${lead.name} · ${lead.phone}`,
    text: lines.join('\n'),
  };
}

/**
 * Best-effort: el lead ya está guardado antes de llamar aquí. Si Resend no está
 * configurado o falla, se devuelve el motivo y la API sigue respondiendo 201.
 */
export async function sendLeadEmail(env, lead, context) {
  const key = String(env.RESEND_API_KEY || '').trim();
  const to = notificationAddress(env);
  if (!key || !to) return { sent: false, reason: 'not-configured' };

  const from = String(env.LEAD_FROM || '').trim() || DEFAULT_FROM;
  const { subject, text } = leadEmail(lead, context);
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], reply_to: lead.email, subject, text }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { sent: false, reason: `http-${res.status}` };
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: 'network' };
  }
}
