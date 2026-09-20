/** Lead score 0–100 from intention, budget, contact, urgency, signals. */
/** Caps at 100; mirrors product brief scoring rules. */
import type { Analisis } from './types'

export function computeScore(partial: Omit<Analisis, 'puntuacion_lead'>): number {
  let score = 40
  const { intencion, presupuesto, cliente, urgencia, sentimiento, competencia, resumen, objeciones } =
    partial
  const blob = [
    resumen,
    ...objeciones,
    ...partial.proximos_pasos,
    ...partial.autopsia.mejor,
    ...partial.autopsia.errores,
  ]
    .join(' ')
    .toLowerCase()

  if (intencion === 'compra' || intencion === 'inversion') score += 25
  if (presupuesto && presupuesto !== 'no indicado' && presupuesto.trim() !== '') score += 20
  if ((cliente.telefono && cliente.telefono !== 'no indicado') || (cliente.email && cliente.email !== 'no indicado'))
    score += 15
  if (urgencia === 'alta') score += 15
  if (/visita|ver el piso|quedamos|cita|enseñar/.test(blob)) score += 10
  if (/solo mirando|solo estoy mirando|solo info|solo información|sin prisa/.test(blob) || intencion === 'solo_info')
    score -= 15
  if (competencia.length > 0) score -= 10
  if (sentimiento === 'negativo') score -= 10

  return Math.max(0, Math.min(100, score))
}
