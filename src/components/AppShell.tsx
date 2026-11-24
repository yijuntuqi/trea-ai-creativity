import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/10 bg-ink-soft/60 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link to="/" className="font-serif text-lg tracking-[0.2em] text-gold">
            答辩预演官
          </Link>
          <nav className="flex items-center gap-5 text-sm text-paper/70">
            <Link to="/setup" className="transition hover:text-gold">
              开始预演
            </Link>
            <Link to="/history" className="transition hover:text-gold">
              历史记录
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
