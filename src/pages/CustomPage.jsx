import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CustomPage() {
  const { slug } = useParams()
  const [pagina, setPagina] = useState(null)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

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

  if (naoEncontrado) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Essa página não existe.</p>
  if (!pagina) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Carregando...</p>

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* O conteúdo é o código que você mesmo colou no painel — o site só exibe. */}
      <div dangerouslySetInnerHTML={{ __html: pagina.content_html }} />
    </div>
  )
}
