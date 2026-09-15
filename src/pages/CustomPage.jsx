import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// Ajusta o HTML colado no painel ANTES de colocar no iframe:
// 1) força todo link a abrir em nova aba desde o primeiro instante (evita
//    navegar a aba inteira do site antes do onLoad rodar);
// 2) força o documento interno do iframe a nunca ter rolagem própria
//    (overflow: hidden no html/body dele) — isso evita que o iframe "roube"
//    o toque no celular quando a rolagem chega no topo/fim da página, o que
//    causava a sensação de travar e precisar soltar o dedo e tentar de novo.
function prepararHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    doc.querySelectorAll('a[href]').forEach((link) => {
      if (!link.target) link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
    })
    const style = doc.createElement('style')
    style.textContent = 'html, body { overflow: hidden !important; }'
    doc.head.appendChild(style)
    return doc.documentElement.outerHTML
  } catch {
    return html
  }
}

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
      .select('menu_label, content_html, gallery_category_id, seo_title, seo_description')
      .eq('slug', slug)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNaoEncontrado(true)
          return
        }
        setPagina({ ...data, content_html: prepararHtml(data.content_html) })
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

  // Aplica o título e a descrição de SEO configurados no painel admin,
  // e devolve os valores originais do site quando a pessoa sai da página.
  useEffect(() => {
    if (!pagina) return

    const tituloAnterior = document.title
    document.title = pagina.seo_title || pagina.menu_label

    let metaDesc = document.querySelector('meta[name="description"]')
    const criouMeta = !metaDesc
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    const descAnterior = metaDesc.getAttribute('content')
    if (pagina.seo_description) {
      metaDesc.setAttribute('content', pagina.seo_description)
    }

    return () => {
      document.title = tituloAnterior
      if (criouMeta) {
        metaDesc.remove()
      } else if (descAnterior !== null) {
        metaDesc.setAttribute('content', descAnterior)
      }
    }
  }, [pagina])

  function ajustarAltura() {
    try {
      const doc = iframeRef.current?.contentWindow?.document
      if (doc?.body) setAltura(doc.body.scrollHeight + 40)
    } catch {
      // se por algum motivo não der pra medir, mantém como está
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
          tema escuro do resto do site (o problema de texto/imagem sumindo).
          scrolling="no" + overflow:hidden injetado no head garantem que o
          iframe nunca tenha rolagem própria, evitando o travamento ao
          rolar perto do topo/fim no celular. */}
      <iframe
        ref={iframeRef}
        title={pagina.menu_label}
        srcDoc={pagina.content_html}
        onLoad={ajustarAltura}
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
        style={{ width: '100%', height: altura, border: 'none', borderRadius: '8px', background: '#fff' }}
      />
    </div>
  )
}
