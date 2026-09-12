import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

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
        .select('seller_id, slug, display_name, whatsapp, banner_text, banner_video_url')
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

  const numero = pagina.whatsapp?.replace(/\D/g, '')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {pagina.banner_video_url && (
        <video src={pagina.banner_video_url} controls className="mb-6 aspect-video w-full rounded-lg bg-panel2" />
      )}

      <h1 className="text-3xl font-bold text-ink md:text-4xl">Loja de {pagina.display_name}</h1>
      {pagina.banner_text && <p className="mt-2 max-w-xl text-mist">{pagina.banner_text}</p>}

      {numero && (
        <a
          href={`https://wa.me/55${numero}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-4 inline-flex"
        >
          Falar com {pagina.display_name.split(' ')[0]} no WhatsApp
        </a>
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
