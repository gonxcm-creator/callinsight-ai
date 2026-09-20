/** Ajustes: optional Groq API key (password), how-to, clear data. */
/** Key stored only in localStorage; never sent elsewhere by us. */
import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { Banner } from '../components/Banner'
import { clearAnalyses, listAnalyses } from '../db/history'
import { getGroqKey, setGroqKey } from '../engine/groq'

export function Ajustes() {
  const [key, setKey] = useState(() => getGroqKey())
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [count, setCount] = useState(0)
  const [keySaved, setKeySaved] = useState(() => getGroqKey().trim().length > 0)

  useEffect(() => {
    void listAnalyses().then((items) => setCount(items.length))
  }, [cleared])

  function saveKey() {
    const trimmed = key.trim()
    setGroqKey(trimmed)
    setKeySaved(trimmed.length > 0)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function onClear() {
    if (!confirm('¿Borrar historial de este dispositivo?')) return
    await clearAnalyses()
    setCleared(true)
    setTimeout(() => setCleared(false), 2500)
  }

  const check = (done: boolean) => (done ? '●' : '○')

  return (
    <Layout title="Ajustes">
      <section className="card fade-in">
        <h1>Clave Groq (opcional)</h1>
        <p className="muted">
          Si guarda una clave, el análisis intentará usar Llama 3.1 8B Instant vía api.groq.com (JSON). Si falla, se
          usa el motor local y verá un aviso.
        </p>
        <p className="muted tip">La key solo vive en este navegador.</p>
        <label className="field">
          <span>API key</span>
          <div className="key-row">
            <input
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              placeholder="gsk_…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={saveKey}>
            Guardar clave
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setKey('')
              setGroqKey('')
              setKeySaved(false)
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }}
          >
            Quitar clave
          </button>
        </div>
        {saved && <Banner>Preferencias de clave actualizadas.</Banner>}
      </section>

      <section className="card fade-in">
        <h2>Cómo obtener una clave Groq</h2>
        <ul className="checklist">
          <li>
            {check(keySaved)} Entra en console.groq.com y crea cuenta.
          </li>
          <li>
            {check(keySaved)} API Keys → Create API Key → copia la key.
          </li>
          <li>
            {check(keySaved)} Pégala aquí (solo este navegador). Opcional: sin key usas motor local.
          </li>
        </ul>
      </section>

      <section className="card fade-in">
        <h2>Datos en este dispositivo</h2>
        <p className="muted">
          {count} análisis en este dispositivo
        </p>
        <p className="muted">
          El historial vive en IndexedDB. Borrar datos no elimina la clave Groq (quítala arriba si lo desea).
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void onClear()}>
          Borrar historial
        </button>
        {cleared && <Banner>Historial borrado.</Banner>}
      </section>
    </Layout>
  )
}
