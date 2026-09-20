/** Local heuristic engine: extract lead card from Spanish call transcript. */
/** Powers demos without Groq; returns full Analisis JSON schema. */
import { computeScore } from './score'
import type { Analisis, Intencion, Sentimiento, Urgencia } from './types'

function pick(re: RegExp, text: string, group = 1): string | null {
  const m = text.match(re)
  return m?.[group]?.trim() || null
}

function findNombre(text: string): string {
  const patterns = [
    /soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
    /hablo con\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
    /me llamo\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i,
    /Cliente:\s*(?:Hola[, ]*)?(?:soy\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
  ]
  for (const p of patterns) {
    const n = pick(p, text)
    if (n && n.length > 2) return n
  }
  return 'no indicado'
}

function findTelefono(text: string): string {
  const m = text.match(/(?:\+34\s?)?(?:6|7|8|9)[\d\s.]{8,12}\d/)
  if (!m) return 'no indicado'
  return m[0].replace(/\s+/g, ' ').trim()
}

function findEmail(text: string): string {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return m ? m[0] : 'no indicado'
}

function findZona(text: string): string {
  const zonas = [
    'Chamberí',
    'Embajadores',
    'Salamanca',
    'Trafalgar',
    'Lavapiés',
    'Alonso Martínez',
    'Goya',
    'Lista',
    'Nuevos Ministerios',
    'Malasaña',
    'Retiro',
    'Chamartín',
  ]
  const found = zonas.filter((z) => new RegExp(z, 'i').test(text))
  return found.length ? found.join(' / ') : 'no indicada'
}

function findIntencion(text: string): Intencion {
  const t = text.toLowerCase()
  if (/inversi[oó]n|rentabilidad|alquilar despu[eé]s|inversor/.test(t)) return 'inversion'
  if (/para alquilar|busca(?:r)? alquiler|solo busca(?:r)? alquiler|es de alquiler|el alquiler del/.test(t) && !/comprar/.test(t))
    return 'alquiler'
  if (/solo mirando|solo info|solo informaci[oó]n|sin compromiso de compra/.test(t) && !/quiero (comprar|mudarme)/.test(t))
    return 'solo_info'
  if (/comprar|para compra|busco.*comprar|estoy buscando para comprar|mudarme/.test(t)) return 'compra'
  if (/alquiler|alquilar/.test(t)) return 'alquiler'
  return 'solo_info'
}

function findUrgencia(text: string): Urgencia {
  const t = text.toLowerCase()
  if (/urgencia alta|menos de dos meses|esta misma semana|mañana|esta semana|sin prisa extrema/.test(t) === false &&
      /cerrar en este trimestre|semana que viene/.test(t))
    return 'media'
  if (/urgencia alta|menos de dos meses|esta misma semana|mañana a las|hoy mismo|muy urgente|necesito.*ya/.test(t))
    return 'alta'
  if (/sin prisa|no tengo prisa|cuando sea|solo mirando/.test(t)) return 'baja'
  if (/esta semana|semana que viene|este mes|este trimestre/.test(t)) return 'media'
  return 'media'
}

function findSentimiento(text: string): Sentimiento {
  const t = text.toLowerCase()
  const neg = /cabread[ao]|harta|enfadad|decepcion|no me parece serio|paso de vosotros|fallasteis|cabreada|preocupa/.test(t)
  const pos = /ilusionad|encantad|perfecto|genial|interesad|gracias|me encaja|bastante ilusionado/.test(t)
  if (neg && pos) return 'mixto'
  if (neg) return 'negativo'
  if (pos) return 'positivo'
  return 'neutro'
}

function findPresupuesto(text: string): string {
  const patterns = [
    /presupuesto(?:\s+(?:m[aá]ximo|de|entre))?\s*(?:de\s*)?(?:hasta\s*)?(?:unos?\s*)?([\d.,]+\s*(?:\.?\d{3})*\s*(?:€|euros?)(?:\s*al mes)?)/i,
    /hasta unos?\s*([\d.,]+\s*(?:€|euros?))/i,
    /entre\s*([\d.,]+\s*(?:y|–|-)\s*[\d.,]+\s*(?:€|euros?))/i,
    /([\d.]{3,}\s*€(?:\s*al mes)?)/,
    /(1[.\s]?0\d0\s*€(?:\s*al mes)?)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim()
  }
  const m2 = text.match(/(?:hasta|m[aá]ximo|presupuesto)[^\d]{0,20}([\d]{1,3}(?:[.\s]\d{3})*(?:,\d+)?)\s*(€|euros?)/i)
  if (m2) return `${m2[1]} ${m2[2]}`.replace(/\s+/g, ' ')
  return 'no indicado'
}

function findObjeciones(text: string): string[] {
  const out: string[] = []
  const t = text.toLowerCase()
  if (/ibi|comunidad/.test(t)) out.push('Dudas sobre IBI / cuotas de comunidad')
  if (/fianza/.test(t)) out.push('Fianza percibida como excesiva')
  if (/mascotas?|gato/.test(t)) out.push('Necesita que admitan mascotas')
  if (/tipos de inter[eé]s|intereses/.test(t)) out.push('Incertidumbre por tipos de interés')
  if (/precio.*discrepan|web.*idealista|idealista.*web|1\.050|1\.150/.test(t))
    out.push('Discrepancia de precio entre portales y web')
  if (/nadie apareci[oó]|fallo de agenda|perdí una hora/.test(t))
    out.push('Visita fallida / falta de puntualidad de la agencia')
  if (/ascensor|trastero/.test(t) && /preocupa|duda|¿/.test(text))
    out.push('Quiere confirmar ascensor / trastero')
  if (out.length === 0 && /preocupa|duda|me frena/.test(t)) out.push('Reservas generales del cliente')
  return out
}

function findCompetencia(text: string): string[] {
  const out: string[] = []
  if (/idealista/i.test(text)) out.push('Idealista')
  if (/fotocasa/i.test(text)) out.push('Fotocasa')
  if (/engel\s*(&|y)\s*v(?:ö|o)lkers/i.test(text)) out.push('Engel & Völkers')
  if (/particulares/i.test(text)) out.push('Anuncios de particulares')
  if (/otras agencias|otra agencia/i.test(text)) out.push('Otras agencias')
  return [...new Set(out)]
}

function findProximosPasos(text: string, intencion: Intencion): string[] {
  const steps: string[] = []
  const t = text.toLowerCase()
  if (/jueves|visita.*semana|mañana a las|semana que viene|cita/.test(t)) {
    const visita = pick(/((?:el )?jueves[^.]*|mañana a las[^.]*(?:\.|,)|semana que viene[^.]*)/i, text, 1)
    steps.push(visita ? `Confirmar visita: ${visita.replace(/\s+/g, ' ').trim()}` : 'Confirmar visita presencial')
  } else {
    steps.push('Proponer franja de visita en 48 h')
  }
  if (/whatsapp|nota simple|comparativa|contrato/.test(t)) {
    steps.push('Enviar documentación acordada (nota simple / comparativa / contrato)')
  } else {
    steps.push('Enviar ficha del inmueble y condiciones por escrito')
  }
  if (intencion === 'inversion') steps.push('Preparar estimado de rentabilidad bruta')
  if (intencion === 'alquiler') steps.push('Aclarar fianza, mascotas y fecha de entrada')
  if (intencion === 'compra') steps.push('Calificar financiación y plazo de mudanza')
  steps.push('Seguimiento comercial en 24–48 h')
  return steps.slice(0, 5)
}

function buildResumen(
  cliente: string,
  intencion: Intencion,
  zona: string,
  urgencia: Urgencia,
  presupuesto: string,
): string {
  const intentLabel =
    intencion === 'compra'
      ? 'compra'
      : intencion === 'alquiler'
        ? 'alquiler'
        : intencion === 'inversion'
          ? 'inversión'
          : 'información'
  return `${cliente} contacta por un inmueble orientado a ${intentLabel} en ${zona}. Urgencia ${urgencia}; presupuesto ${presupuesto}.`
}

function buildAutopsia(text: string, sentimiento: Sentimiento): { errores: string[]; mejor: string[] } {
  const errores: string[] = []
  const mejor: string[] = []
  const t = text.toLowerCase()
  if (/nadie apareci[oó]|fallo de agenda/.test(t)) errores.push('No se respetó la cita acordada')
  if (/precio.*1\.050|discrepan/.test(t) || (/idealista/.test(t) && /web/.test(t)))
    errores.push('Precios incoherentes entre canales')
  if (sentimiento === 'negativo' || sentimiento === 'mixto')
    errores.push('El tono del cliente indica fricción; priorizar empatía')
  if (errores.length === 0) errores.push('No se cerró del todo la objeción de gastos / condiciones')

  if (/tel[eé]fono|correo|email/.test(t)) mejor.push('Se capturaron datos de contacto')
  if (/visita|jueves|mañana/.test(t)) mejor.push('Se avanzó hacia una visita concreta')
  if (/presupuesto|hasta unos|entre \d/.test(t)) mejor.push('Se calificó el presupuesto')
  if (mejor.length === 0) mejor.push('Hay interés suficiente para un seguimiento estructurado')
  return { errores, mejor }
}

/** Analyze transcript locally and return full schema with score. */
export function analyzeLocal(text: string): Analisis {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('EMPTY')
  }

  const cliente = {
    nombre: findNombre(trimmed),
    telefono: findTelefono(trimmed),
    email: findEmail(trimmed),
    zona: findZona(trimmed),
  }
  const intencion = findIntencion(trimmed)
  const urgencia = findUrgencia(trimmed)
  const sentimiento = findSentimiento(trimmed)
  const presupuesto = findPresupuesto(trimmed)
  const objeciones = findObjeciones(trimmed)
  const competencia = findCompetencia(trimmed)
  const proximos_pasos = findProximosPasos(trimmed, intencion)
  const autopsia = buildAutopsia(trimmed, sentimiento)
  const resumen = buildResumen(cliente.nombre, intencion, cliente.zona, urgencia, presupuesto)

  const base = {
    resumen,
    cliente,
    intencion,
    urgencia,
    sentimiento,
    presupuesto,
    objeciones,
    competencia,
    proximos_pasos,
    autopsia,
  }

  return {
    ...base,
    puntuacion_lead: computeScore(base),
  }
}
