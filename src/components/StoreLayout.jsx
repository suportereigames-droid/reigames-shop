import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StoreLayout() {
  const location = useLocation()
  const [logoUrl, setLogoUrl] = useState(null)
  const [menu, setMenu] = useState([])

  useEffect(() => {
    // Registra a visita de forma anônima (a policy de RLS só permite INSERT,
    // ninguém de fora consegue ler essa tabela — só o admin no app TT).
    supabase.from('site_visits').insert({ path: location.pathname }).then(() => {})
  }, [location.pathname])

  useEffect(() => {
    supabase.from('site_settings').select('logo_url').single().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url)
    })
    supabase
      .from('site_pages')
      .select('slug, menu_label')
      .eq('show_in_menu', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setMenu(data || []))
  }, [])

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Rei Games" className="h-9 w-auto" />
            ) : (
              <>
                <span className="font-display text-2xl font-bold uppercase tracking-wide text-gold">Rei</span>
                <span className="font-display text-2xl font-bold uppercase tracking-wide text-white">Games</span>
              </>
            )}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-mist">
            <a href="/#catalogo" className="hover:text-white">Catálogo</a>
            {menu.map((item) => (
              <Link key={item.slug} to={`/pagina/${item.slug}`} className="hover:text-white">
                {item.menu_label}
              </Link>
            ))}
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
