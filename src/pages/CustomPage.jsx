import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CustomPage() {
  const { slug } = useParams()
  const [pagina, setPagina] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [altura, setAltura] = useState(800)
  const [galeriaPaginas, setGaleriaPaginas] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    setPagina(null)
    setNaoEncontrado(false)
    setGaleriaPaginas(null)
    supabase
      .from('site_pages')
      .select('menu_label, content_html, gallery_category_id')
      .eq('slug', slug)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNaoEncontrado(true)
          return
        }
        setPagina(data)
        if (data.gallery_category_id) {
          const { data: pgs } = await supabase
            .from('site_pages')
            .select('slug, menu_label, image_url')
            .eq('page_category_id', data.gallery_category_id)
            .order('sort_order', { ascending: true })
          setGaleriaPaginas(pgs || [])
        }
      })
  }, [slug])

  function ajustarAltura() {
    try {
      const doc = iframeRef.current?.contentWindow?.document
      if (doc?.body) setAltura(doc.body.scrollHeight + 40)
    } catch {
      // se por algum motivo não der pra medir, mantém a altura padrão
    }
  }

  if (naoEncontrado) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Essa página não existe.</p>
  if (!pagina) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Carregando...</p>

  // Página do tipo "galeria": mostra imagem + nome de cada página da categoria escolhida.
  if (pagina.gallery_category_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink">{pagina.menu_label}</h1>

        {galeriaPaginas === null ? (
          <p className="mt-6 text-mist">Carregando...</p>
        ) : galeriaPaginas.length === 0 ? (
          <p className="mt-6 text-mist">Nenhuma página nessa categoria ainda.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {galeriaPaginas.map((p) => (
              <Link
                key={p.slug}
                to={`/pagina/${p.slug}`}
                className="block overflow-hidden rounded-lg border border-line transition-colors hover:border-gold"
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.menu_label} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-panel2 text-sm text-mist">
                    Sem imagem
                  </div>
                )}
                <p className="p-3 text-center font-semibold text-ink">{p.menu_label}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Renderiza o código colado no painel dentro de uma "janela" isolada,
          com as cores e o fundo originais dele — assim ele não briga com o
          tema escuro do resto do site (o problema de texto/imagem sumindo). */}
      <iframe
        ref={iframeRef}
        title={pagina.menu_label}
        srcDoc={pagina.content_html}
        onLoad={ajustarAltura}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
        style={{ width: '100%', height: altura, border: 'none', borderRadius: '8px', background: '#fff' }}
      />
    </div>
  )
}
