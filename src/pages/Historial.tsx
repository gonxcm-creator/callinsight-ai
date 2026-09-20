/** Historial: list past analyses from IndexedDB, newest first. */
/** Empty state in Spanish when there are no records. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { listAnalyses } from '../db/history'
import type { HistoryRecord } from '../engine/types'

function relativeWhen(ts: number): string {
  const diffMs = Date.now() - ts
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days === 1 ? '' : 's'}`
}

export function Historial() {
  const [items, setItems] = useState<HistoryRecord[] | null>(null)

  useEffect(() => {
    void listAnalyses().then(setItems)
  }, [])

  return (
    <Layout title="Historial">
      <section className="card fade-in">
        <h1>Historial</h1>
        <p className="muted">Análisis guardados en este dispositivo (IndexedDB).</p>
        {items === null && <p className="muted">Cargando…</p>}
        {items && items.length === 0 && (
          <div className="empty">
            <p>Aún no hay análisis.</p>
            <Link to="/">Ir al inicio</Link>
          </div>
        )}
        {items && items.length > 0 && (
          <div>
            {items.map((r) => (
              <Link key={r.id} className="history-item" to={`/informe/${r.id}`}>
                <div className="history-row">
                  <div className="history-main">
                    <strong>
                      {r.analysis.cliente.nombre} · {r.analysis.cliente.zona}
                    </strong>
                    <span className="muted">{relativeWhen(r.createdAt)}</span>
                  </div>
                  <span className="history-score">{r.analysis.puntuacion_lead}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
