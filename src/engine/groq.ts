/** Optional Groq Llama JSON analysis; key only in localStorage. */
/** On failure caller falls back to analyzeLocal + banner. */
import type { Analisis } from './types'

const GROQ_KEY = 'callinsight_groq_key'
const MODEL = 'llama-3.1-8b-instant'

export function getGroqKey(): string {
  try {
    return localStorage.getItem(GROQ_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setGroqKey(key: string): void {
  if (!key) localStorage.removeItem(GROQ_KEY)
  else localStorage.setItem(GROQ_KEY, key)
}

const SYSTEM = `Eres un analista inmobiliario en España. Devuelves SOLO un JSON (json_object) con esta forma exacta:
{
  "resumen": string,
  "cliente": {"nombre": string, "telefono": string, "email": string, "zona": string},
  "intencion": "compra"|"alquiler"|"inversion"|"solo_info",
  "urgencia": "alta"|"media"|"baja",
  "sentimiento": "positivo"|"neutro"|"negativo"|"mixto",
  "presupuesto": string,
  "objeciones": string[],
  "competencia": string[],
  "proximos_pasos": string[],
  "puntuacion_lead": number,
  "autopsia": {"errores": string[], "mejor": string[]}
}
puntuacion_lead 0-100. Si falta un dato usa "no indicado" / lista vacía. Responde en español.`

export async function analyzeWithGroq(text: string, apiKey: string): Promise<Analisis> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Analiza esta transcripción de llamada:\n\n${text}` },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Groq HTTP ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq sin contenido')
  const parsed = JSON.parse(content) as Analisis
  if (typeof parsed.puntuacion_lead !== 'number') {
    parsed.puntuacion_lead = Math.max(0, Math.min(100, Number(parsed.puntuacion_lead) || 0))
  }
  return parsed
}
