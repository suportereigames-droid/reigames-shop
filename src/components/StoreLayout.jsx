import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StoreLayout() {
  const location = useLocation()

  useEffect(() => {
    // Registra a visita de forma anônima (a policy de RLS só permite INSERT,
    // ninguém de fora consegue ler essa tabela — só o admin no app TT).
    supabase.from('site_visits').insert({ path: location.pathname }).then(() => {})
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold uppercase tracking-wide text-gold">Rei</span>
            <span className="font-display text-2xl font-bold uppercase tracking-wide text-white">Games</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-mist">
            <a href="#catalogo" className="hover:text-white">Catálogo</a>
            <a href="https://wa.me/" target="_blank" rel="noreferrer" className="hover:text-white">Fale conosco</a>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-line py-8 text-center text-sm text-mist">
        © {new Date().getFullYear()} Rei Games — contas verificadas, entrega com garantia.
      </footer>
    </div>
  )
}
