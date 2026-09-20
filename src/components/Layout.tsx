/** Shared shell: brand header and nav to Historial / Ajustes. */
/** Wraps all hash-routed screens. */
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function Layout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <strong>CallInsight AI</strong>
          <span>{title ?? 'Llamadas → leads'}</span>
        </Link>
        <nav className="nav-links" aria-label="Principal">
          <Link to="/historial">Historial</Link>
          <Link to="/ajustes">Ajustes</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
