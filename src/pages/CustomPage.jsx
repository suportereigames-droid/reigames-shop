import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CustomPage() {
  const { slug } = useParams()
  const [pagina, setPagina] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [altura, setAltura] = useState(800)
  const iframeRef = useRef(null)

  useEffect(() => {
    setPagina(null)
    setNaoEncontrado(false)
    supabase
      .from('site_pages')
      .select('menu_label, content_html')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNaoEncontrado(true)
        else setPagina(data)
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
