import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../store/auth'

function navClass({ isActive }: { isActive: boolean }): string {
  return clsx(
    'relative py-1 text-sm transition-colors',
    isActive ? 'text-gold' : 'text-paper/60 hover:text-paper',
    'after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:scale-x-0 after:bg-gold/70 after:transition-transform after:duration-200',
    isActive && 'after:scale-x-100',
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-ink text-paper">
      <div aria-hidden className="app-canvas pointer-events-none fixed inset-0 -z-10" />

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink/72 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between px-5">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/35 bg-gold/10 font-serif text-sm text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition group-hover:border-gold/60 group-hover:bg-gold/15">
              预
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-serif text-[15px] tracking-[0.16em] text-paper transition group-hover:text-gold">
                答辩预演官
              </span>
              <span className="mt-1 text-[9px] tracking-[0.34em] text-paper/30">
                DEFENSE REHEARSAL
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <NavLink to="/setup" className={navClass}>
              开始预演
            </NavLink>
            <NavLink to="/history" className={navClass}>
              历史记录
            </NavLink>
            <NavLink to="/account" className={navClass}>
              {user ? '账号' : '登录'}
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10">{children}</main>

      <footer className="mt-16 border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-xs text-paper/35 md:flex-row md:items-center md:justify-between">
          <p>未登录时记录只在本机；登录后材料文本与答辩记录同步到云端，原始文件不上传。</p>
          <p className="tracking-[0.18em]">答辩预演官 · AI 多评委模拟</p>
        </div>
      </footer>
    </div>
  )
}
