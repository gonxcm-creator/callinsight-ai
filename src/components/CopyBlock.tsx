/** Copyable text block for email / call / WhatsApp plan. */
/** Shows Spanish confirmation after clipboard write. */
import { useState } from 'react'

export function CopyBlock({ title, text }: { title: string; text: string }) {
  const [ok, setOk] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setOk(true)
      setTimeout(() => setOk(false), 1000)
    } catch {
      setOk(false)
    }
  }

  return (
    <div className="copy-block card">
      <h2>{title}</h2>
      <pre>{text}</pre>
      <button type="button" className="btn btn-primary" onClick={onCopy}>
        {ok ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
