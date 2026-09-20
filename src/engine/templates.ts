/** Fill email / call / WhatsApp copy from analysis placeholders. */
/** Used by Plan screen; Spanish tone, ready to paste. */
import type { Analisis, PlanCopy } from './types'

const intentLabel: Record<Analisis['intencion'], string> = {
  compra: 'compra',
  alquiler: 'alquiler',
  inversion: 'inversión',
  solo_info: 'información',
}

export function buildPlan(a: Analisis): PlanCopy {
  const nombre = a.cliente.nombre !== 'no indicado' ? a.cliente.nombre : 'hola'
  const zona = a.cliente.zona !== 'no indicada' ? a.cliente.zona : 'la zona que comentamos'
  const presupuesto = a.presupuesto !== 'no indicado' ? a.presupuesto : 'su presupuesto'
  const paso = a.proximos_pasos[0] ?? 'seguir con la visita'
  const obj = a.objeciones[0] ?? 'las dudas que comentó'

  const email = `Asunto: Siguiente paso — inmueble en ${zona}

Hola ${nombre},

Gracias por la conversación de hoy sobre su interés de ${intentLabel[a.intencion]} en ${zona}.

Resumen: presupuesto orientativo ${presupuesto}, urgencia ${a.urgencia}. Para avanzar, propongo: ${paso}.

Si le parece bien, le confirmo franja y le envío la documentación pendiente. Quedo atento/a a lo de «${obj}».

Un saludo,
CallInsight Inmobiliaria`

  const llamada = `Guion de llamada (2 min)
1. Saludo: «Hola ${nombre}, le llamo de CallInsight para retomar lo de ${zona}.»
2. Valor: recordar presupuesto ${presupuesto} e intención de ${intentLabel[a.intencion]}.
3. Objeción: abordar «${obj}» con dato concreto.
4. Cierre: confirmar ${paso} y canal (WhatsApp/email).
5. Si no coge: SMS/WhatsApp con misma propuesta.`

  const whatsapp = `Hola ${nombre} 👋 Soy de CallInsight. Como hablamos, le propongo avanzar con ${zona} (${intentLabel[a.intencion]}, presupuesto ${presupuesto}). Siguiente paso: ${paso}. ¿Le va bien? Si quiere, también aclaramos lo de ${obj}.`

  return { email, llamada, whatsapp }
}
