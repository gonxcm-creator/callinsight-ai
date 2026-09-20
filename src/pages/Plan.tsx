/** Plan screen: three follow-up copy blocks with Copiar. */
/** Email, call script, WhatsApp filled from analysis templates. */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { CopyBlock } from '../components/CopyBlock'
import { getAnalysis } from '../db/history'
import { buildPlan } from '../engine/templates'
import type { HistoryRecord } from '../engine/types'

export function Plan() {
  const { id } = useParams<{ id: string }>()
  const [rec, setRec] = useState<HistoryRecord | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setRec(null)
      return
    }
    void getAnalysis(id).then((r) => setRec(r ?? null))
  }, [id])

  if (rec === undefined) {
    return (
      <Layout title="Plan">
        <p className="muted">Cargando plan…</p>
      </Layout>
    )
  }

  if (!rec) {
    return (
      <Layout title="Plan">
        <div className="empty">
          <p>No hay plan para este identificador. Genere un análisis desde el inicio.</p>
          <Link to="/">Volver al inicio</Link>
        </div>
      </Layout>
    )
  }

  const plan = buildPlan(rec.analysis)

  return (
    <Layout title="Plan de seguimiento">
      <Link className="back-link" to={`/informe/${rec.id}`}>
        ← Volver al informe
      </Link>
      <p className="muted" style={{ marginBottom: 16 }}>
        Tres textos listos para copiar. Revíselos antes de enviarlos al cliente.
      </p>
      <CopyBlock title="Email" text={plan.email} />
      <CopyBlock title="Guion de llamada" text={plan.llamada} />
      <CopyBlock title="WhatsApp" text={plan.whatsapp} />
    </Layout>
  )
}
