import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

function FrasesLoja({ texto }) {
  const frases = useMemo(() => (texto || '').split('\n').map((f) => f.trim()).filter(Boolean), [texto])
  if (frases.length === 0) return null

  return (
    <div className="max-w-full overflow-hidden">
      <div className="flex whitespace-nowrap" style={{ animation: 'rolar-esquerda 18s linear infinite' }}>
        {[...frases, ...frases].map((frase, i) => (
          <span key={i} className="flex items-center text-sm font-medium text-ink">
            {frase}
            <span className="mx-3 font-bold text-gold">|</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SellerPage() {
  const { slug } = useParams()
  const [pagina, setPagina] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: seller, error } = await supabase
        .from('seller_pages')
        .select('seller_id, slug, display_name, titulo, logo_url, frases, banner_text, banner_video_url')
        .eq('slug', slug)
        .single()

      if (error || !seller) {
        setNaoEncontrado(true)
        setLoading(false)
        return
      }
      setPagina(seller)

      const { data: prods } = await supabase
        .from('products')
        .select('id, game, title, price, media')
        .eq('created_by', seller.seller_id)
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false })
      setProdutos(prods || [])
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Carregando...</p>
  if (naoEncontrado) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Essa loja não existe (ou o link mudou).</p>

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {pagina.banner_video_url && (
        <video src={pagina.banner_video_url} controls controlsList="nodownload noplaybackrate" disablePictureInPicture className="mb-6 aspect-video w-full rounded-lg bg-panel2" />
      )}

      <h1 className="text-3xl font-bold text-ink md:text-4xl">{pagina.titulo || pagina.display_name}</h1>
      {pagina.banner_text && <p className="mt-2 max-w-xl text-mist">{pagina.banner_text}</p>}

      {(pagina.logo_url || pagina.frases) && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {pagina.logo_url && <img src={pagina.logo_url} alt={pagina.titulo || pagina.display_name} className="h-14 w-auto" />}
          {pagina.frases && <FrasesLoja texto={pagina.frases} />}
        </div>
      )}

      <div className="mt-10">
        {produtos.length === 0 ? (
          <p className="text-mist">Nenhuma conta disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
