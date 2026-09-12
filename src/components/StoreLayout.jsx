import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StoreLayout() {
  const location = useLocation()
  const [logoUrl, setLogoUrl] = useState(null)
  const [menu, setMenu] = useState([])

  useEffect(() => {
    // Conta só 1 visita por sessão de navegador (aba aberta), não uma pra
    // cada página que a pessoa clica — assim o número reflete visitantes
    // de verdade, não cliques dentro do próprio site.
    if (!sessionStorage.getItem('rg_visita_registrada')) {
      sessionStorage.setItem('rg_visita_registrada', '1')
      supabase.from('site_visits').insert({ path: location.pathname }).then(() => {})
    }
  }, [])

  useEffect(() => {
    // Presença em tempo real: enquanto essa aba estiver aberta no site,
    // ela "avisa" o canal — o app soma quantas abas estão conectadas agora.
    const canal = supabase.channel('site-presence', {
      config: { presence: { key: crypto.randomUUID() } }
    })
    canal.subscribe((status) => {
      if (status === 'SUBSCRIBED') canal.track({ em: location.pathname, desde: new Date().toISOString() })
    })
    return () => { supabase.removeChannel(canal) }
  }, [])

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Rei Games" className="h-9 w-auto" />
            ) : (
              <>
                <span className="font-display text-2xl font-bold uppercase tracking-wide text-gold">Rei</span>
                <span className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Games</span>
              </>
            )}
          </Link>
          <nav className="flex items-center gap-6 text-sm text-mist">
            <Link to="/minha-conta" className="hover:text-ink">Minha conta</Link>
            {menu.map((item) => (
              <Link key={item.slug} to={`/pagina/${item.slug}`} className="hover:text-ink">
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
