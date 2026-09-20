/** Informe screen: score, urgency/sentiment/budget, client, objections. */
/** Link to Ver plan; loads record from IndexedDB by :id. */
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Banner } from '../components/Banner'
import { getAnalysis } from '../db/history'
import type { HistoryRecord } from '../engine/types'

export function Informe() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [rec, setRec] = useState<HistoryRecord | null | undefined>(undefined)
  const groqFallback =
    (location.state as { groqFallback?: boolean } | null)?.groqFallback || rec?.groqFallback

  useEffect(() => {
    if (!id) {
      setRec(null)
      return
    }
    void getAnalysis(id).then((r) => setRec(r ?? null))
  }, [id])

  if (rec === undefined) {
    return (
      <Layout title="Informe">
        <p className="muted">Cargando informe…</p>
      </Layout>
    )
  }

  if (!rec) {
    return (
      <Layout title="Informe">
        <div className="empty">
          <p>No encontramos este informe. Puede haber sido borrado o el enlace no es válido.</p>
          <Link to="/">Volver al inicio</Link>
        </div>
      </Layout>
    )
  }

  const a = rec.analysis
  const score = Math.max(0, Math.min(100, a.puntuacion_lead))

  return (
    <Layout title="Informe">
      <Link className="back-link" to="/">
        ← Inicio
      </Link>

      {groqFallback && (
        <Banner warn>
          Análisis con motor local (Groq no disponible). Los demos y el motor local siguen siendo válidos.
        </Banner>
      )}

      <section className="card score-hero fade-in">
        <div className="score-number">{a.puntuacion_lead}</div>
        <div className="score-label">Score lead</div>
        <div className="score-track">
          <div className="score-fill" style={{ width: `${score}%` }} />
        </div>
        <div className="pill-row" style={{ justifyContent: 'center' }}>
          <span className={`pill${a.urgencia === 'alta' ? ' pill-accent' : ''}`}>
            <strong>Urgencia</strong> {a.urgencia}
          </span>
          <span className="pill">
            <strong>Sentimiento</strong> {a.sentimiento}
          </span>
          <span className="pill">
            <strong>Presupuesto</strong> {a.presupuesto}
          </span>
          <span className="pill">
            <strong>Intención</strong> {a.intencion}
          </span>
        </div>
        <p className="muted tip" style={{ marginTop: 8, marginBottom: 0 }}>
          {groqFallback ? 'IA externa caída, análisis local' : 'Sin red = motor local'}
        </p>
      </section>

      <section className="card fade-in">
        <h2>Resumen</h2>
        <p>{a.resumen}</p>
      </section>

      <section className="card fade-in">
        <h2>Cliente</h2>
        <div className="kv">
          <div className="kv-row">
            <span>Nombre</span>
            <span>{a.cliente.nombre}</span>
          </div>
          <div className="kv-row">
            <span>Teléfono</span>
            <span>{a.cliente.telefono}</span>
          </div>
          <div className="kv-row">
            <span>Email</span>
            <span>{a.cliente.email}</span>
          </div>
          <div className="kv-row">
            <span>Zona</span>
            <span>{a.cliente.zona}</span>
          </div>
        </div>
      </section>

      <section className="card fade-in">
        <h2>Objeciones</h2>
        {a.objeciones.length === 0 ? (
          <p className="muted">No se detectaron objeciones claras.</p>
        ) : (
          <ul className="clean">
            {a.objeciones.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card fade-in">
        <h2>Competencia</h2>
        {a.competencia.length === 0 ? (
          <p className="muted">No se mencionó competencia explícita.</p>
        ) : (
          <ul className="clean">
            {a.competencia.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card fade-in">
        <h2>Autopsia de la llamada</h2>
        <p className="muted">Errores</p>
        <ul className="clean">
          {a.autopsia.errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="muted" style={{ marginTop: 12 }}>
          Qué mejorar / qué salió bien
        </p>
        <ul className="clean">
          {a.autopsia.mejor.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="card fade-in">
        <h2>Próximos pasos</h2>
        <ul className="clean">
          {a.proximos_pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <div className="sticky-cta">
        <Link className="btn btn-primary btn-block" to={`/plan/${rec.id}`}>
          Ver plan
        </Link>
      </div>
    </Layout>
  )
}
