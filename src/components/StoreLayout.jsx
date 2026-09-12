import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function StoreLayout() {
  const location = useLocation()
  const [logoUrl, setLogoUrl] = useState(null)
  const [menu, setMenu] = useState([])
  const [config, setConfig] = useState({ instagram_url: null, whatsapp_numero: null, ano_fundacao: null })

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
    supabase.from('site_settings').select('logo_url, ano_fundacao').single().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url)
      setConfig((c) => ({ ...c, ano_fundacao: data?.ano_fundacao || null }))
    })
    supabase.rpc('site_contato_dono').then(({ data }) => {
      const contato = data?.[0]
      if (contato) setConfig((c) => ({ ...c, whatsapp_numero: contato.whatsapp, instagram_url: contato.instagram_url }))
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
        <div className="mb-3 flex items-center justify-center gap-5">
          {config.whatsapp_numero && (
            <a
              href={`https://wa.me/55${config.whatsapp_numero.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald"
              aria-label="WhatsApp"
            >
              WhatsApp
            </a>
          )}
          {config.instagram_url && (
            <a href={config.instagram_url} target="_blank" rel="noreferrer" className="hover:text-gold" aria-label="Instagram">
              Instagram
            </a>
          )}
        </div>
        <p>
          © {config.ano_fundacao && config.ano_fundacao < new Date().getFullYear()
            ? `${config.ano_fundacao}–${new Date().getFullYear()}`
            : new Date().getFullYear()}{' '}
          Rei Games — contas verificadas, entrega com garantia.
        </p>
      </footer>

      {config.whatsapp_numero && (
        <a
          href={`https://wa.me/55${config.whatsapp_numero.replace(/\D/g, '')}?text=${encodeURIComponent('Oi! Vim pelo site e queria tirar uma dúvida.')}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-white shadow-lg transition-transform hover:scale-105"
          aria-label="Chamar no WhatsApp"
        >
          <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current">
            <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.393.696 4.62 1.897 6.494L4 29l7.687-1.87A11.93 11.93 0 0 0 16 27c6.628 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.75c-1.988 0-3.845-.58-5.406-1.578l-.388-.244-4.56 1.11 1.145-4.44-.253-.406A9.71 9.71 0 0 1 5.25 15c0-5.937 4.813-10.75 10.75-10.75S26.75 9.063 26.75 15 21.938 24.75 16.001 24.75zm5.9-8.06c-.322-.161-1.907-.94-2.203-1.047-.296-.107-.512-.161-.727.161-.215.322-.834 1.047-1.023 1.263-.188.215-.376.242-.698.081-.322-.161-1.36-.501-2.591-1.598-.958-.855-1.605-1.91-1.793-2.232-.188-.322-.02-.496.141-.657.145-.144.322-.376.483-.564.161-.188.215-.322.322-.537.107-.215.054-.403-.027-.564-.081-.161-.727-1.753-.996-2.401-.262-.63-.528-.545-.727-.555l-.618-.011c-.215 0-.564.081-.86.403-.296.322-1.128 1.103-1.128 2.69s1.155 3.122 1.316 3.337c.161.215 2.271 3.468 5.505 4.863.769.332 1.369.53 1.837.679.772.245 1.474.211 2.03.128.619-.092 1.907-.78 2.176-1.532.269-.752.269-1.398.188-1.532-.08-.134-.295-.215-.617-.376z" />
          </svg>
        </a>
      )}
    </div>
  )
}
