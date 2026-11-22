/**
 * Lista blanca del embudo. Sin dependencias de Cloudflare para poder probarla con Node.
 * `FUNNEL_EMAILS` admite varios correos separados por comas, puntos y coma o espacios.
 */
export function parseFunnelEmails(value) {
  return String(value ?? '')
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canSeeFunnel(list, email) {
  const who = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!who) return false;
  return parseFunnelEmails(list).includes(who);
}
