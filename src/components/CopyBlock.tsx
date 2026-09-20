/** Copyable text block for email / call / WhatsApp plan. */
/** Shows Spanish confirmation after clipboard write (with fallback). */
import { useState } from 'react'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function CopyBlock({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  async function onCopy() {
    const ok = await copyText(text)
    setStatus(ok ? 'ok' : 'err')
    window.setTimeout(() => setStatus('idle'), 2500)
  }

  const label =
    status === 'ok' ? 'Copiado' : status === 'err' ? 'No se pudo copiar' : 'Copiar'

  return (
    <div className="copy-block card">
      <h2>{title}</h2>
      <pre>{text}</pre>
      <button
        type="button"
        className={`btn btn-primary${status === 'ok' ? ' is-copied' : ''}`}
        onClick={() => void onCopy()}
        aria-live="polite"
      >
        {label}
      </button>
    </div>
  )
}
