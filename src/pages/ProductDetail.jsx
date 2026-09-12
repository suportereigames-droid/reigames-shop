import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ativo, setAtivo] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, game, title, description, price, media, status')
        .eq('id', id)
        .single()
      setProduct(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Carregando...</p>
  if (!product) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Conta não encontrada.</p>

  const disponivel = product.status === 'disponivel'
  const midia = product.media || []
  const atual = midia[ativo]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-panel2">
        {atual && (
          atual.type === 'video' ? (
            <video src={atual.url} controls className="h-full w-full object-contain" />
          ) : (
            <img src={atual.url} alt={product.title} className="h-full w-full object-contain" />
          )
        )}
      </div>

      {midia.length > 1 && (
        <div className="mt-3 flex gap-2">
          {midia.map((m, i) => (
            <button
              key={i}
              onClick={() => setAtivo(i)}
              className={`h-16 w-24 overflow-hidden rounded border ${i === ativo ? 'border-gold' : 'border-line'}`}
            >
              {m.type === 'video' ? (
                <video src={m.url} muted className="h-full w-full object-contain" />
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-contain" />
              )}
            </button>
          ))}
        </div>
      )}

      <span className="mt-6 inline-block text-sm uppercase tracking-wide text-emerald">{product.game}</span>
      <h1 className="mt-1 text-3xl font-bold text-ink">{product.title}</h1>
      <p className="mt-4 whitespace-pre-line text-mist">{product.description}</p>

      <div className="mt-8 flex items-center justify-between rounded-lg border border-line bg-panel p-6">
        <span className="text-3xl font-bold text-gold">{money(product.price)}</span>
        {disponivel ? (
          <Link to={`/checkout/${product.id}`} className="btn-primary">
            Comprar agora
          </Link>
        ) : (
          <span className="rounded-md bg-ember/20 px-4 py-2 text-ember">Indisponível</span>
        )}
      </div>
    </div>
  )
}
