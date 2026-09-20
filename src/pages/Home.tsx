/** Home: paste transcript, run analysis, or load Demo 1/2/3. */
/** Legal notice + links; works offline via local engine. */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Banner } from '../components/Banner'
import { analyzeLocal } from '../engine/analyzeLocal'
import { FIXTURES } from '../engine/fixtures'
import { analyzeWithGroq, getGroqKey } from '../engine/groq'
import { newId, saveAnalysis } from '../db/history'

export function Home() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  async function runAnalysis(raw: string) {
    setError(null)
    setBanner(null)
    const trimmed = raw.trim()
    if (!trimmed) {
      setError('Pegue una transcripción o elija una demo para analizar.')
      return
    }
    setBusy(true)
    try {
      const key = getGroqKey()
      let analysis = analyzeLocal(trimmed)
      let source: 'local' | 'groq' = 'local'
      let groqFallback = false

      if (key) {
        try {
          analysis = await analyzeWithGroq(trimmed, key)
          source = 'groq'
        } catch {
          groqFallback = true
          analysis = analyzeLocal(trimmed)
          source = 'local'
          setBanner(
            'No se pudo usar Groq. Se ha aplicado el motor local. Revise la clave en Ajustes o inténtelo más tarde.',
          )
        }
      }

      const id = newId()
      await saveAnalysis({
        id,
        createdAt: Date.now(),
        transcript: trimmed,
        analysis,
        source,
        groqFallback,
      })
      navigate(`/informe/${id}`, { state: { groqFallback } })
    } catch (e) {
      if (e instanceof Error && e.message === 'EMPTY') {
        setError('Pegue una transcripción o elija una demo para analizar.')
      } else {
        setError('No se pudo analizar la transcripción. Pruebe de nuevo o use una demo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Inicio">
      <div className="legal" role="note">
        Solo analiza texto que tú pegas. No grabamos llamadas. Úsalo con consentimiento.
      </div>

      {banner && <Banner warn>{banner}</Banner>}
      {error && <div className="error-box">{error}</div>}

      <section className="card fade-in">
        <h1>De la llamada a la ficha del lead, en un pegado.</h1>
        <p className="muted">
          Resumen, score 0–100, objeciones y 3 textos listos. Sin subir audios.
        </p>
        <label className="muted" htmlFor="transcript">
          Transcripción
        </label>
        <textarea
          id="transcript"
          className="textarea"
          placeholder="Pegue aquí el texto de la llamada…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={() => runAnalysis(text)}
          >
            {busy ? 'Analizando…' : 'Analizar'}
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 8 }}>
          Demos (motor local, sin Groq):
        </p>
        <div className="btn-row">
          {FIXTURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              title={f.name}
              onClick={() => {
                setText(f.text)
                void runAnalysis(f.text)
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <p className="muted">
        <Link to="/historial">Ver historial</Link>
        {' · '}
        <Link to="/ajustes">Ajustes (clave Groq opcional)</Link>
      </p>
    </Layout>
  )
}
