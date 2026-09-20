/** Inline status / fallback banner (e.g. Groq fail → local). */
/** Visual variants: info (default) and warn. */
export function Banner({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return <div className={`banner${warn ? ' warn' : ''}`}>{children}</div>
}
