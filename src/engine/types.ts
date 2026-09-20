/** Shared analysis schema for local engine and optional Groq path. */
/** Used by UI screens, IndexedDB history, and copy templates. */

export type Intencion = 'compra' | 'alquiler' | 'inversion' | 'solo_info'
export type Urgencia = 'alta' | 'media' | 'baja'
export type Sentimiento = 'positivo' | 'neutro' | 'negativo' | 'mixto'

export interface Cliente {
  nombre: string
  telefono: string
  email: string
  zona: string
}

export interface Analisis {
  resumen: string
  cliente: Cliente
  intencion: Intencion
  urgencia: Urgencia
  sentimiento: Sentimiento
  presupuesto: string
  objeciones: string[]
  competencia: string[]
  proximos_pasos: string[]
  puntuacion_lead: number
  autopsia: {
    errores: string[]
    mejor: string[]
  }
}

export interface HistoryRecord {
  id: string
  createdAt: number
  transcript: string
  analysis: Analisis
  source: 'local' | 'groq'
  groqFallback?: boolean
}

export interface PlanCopy {
  email: string
  llamada: string
  whatsapp: string
}
