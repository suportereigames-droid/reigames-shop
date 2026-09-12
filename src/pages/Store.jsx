import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

export default function Store() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState('todos')
  const [subcategoria, setSubcategoria] = useState('todas')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('id, game, subcategory, title, price, media')
        .eq('status', 'disponivel')
        .order('created_at', { ascending: false })
      if (!error) setProducts(data)
      setLoading(false)
    }
    load()
  }, [])

  const games = useMemo(() => ['todos', ...new Set(products.map((p) => p.game))], [products])
  const porCategoria = game === 'todos' ? products : products.filter((p) => p.game === game)

  const subcategorias = useMemo(
    () => ['todas', ...new Set(porCategoria.map((p) => p.subcategory).filter(Boolean))],
    [porCategoria]
  )
  const filtered = subcategoria === 'todas' ? porCategoria : porCategoria.filter((p) => p.subcategory === subcategoria)

  function mudarCategoria(g) {
    setGame(g)
    setSubcategoria('todas')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10" id="catalogo">
      <section className="mb-6 sm:mb-10">
        <h1 className="text-2xl font-bold text-ink sm:text-4xl md:text-5xl">Contas verificadas, entrega garantida</h1>
        <p className="mt-2 max-w-xl text-sm text-mist sm:text-base">
          Compre contas de jogos com garantia de 3 meses contra recuperação.
        </p>
      </section>

      <div className="mb-3 flex flex-wrap gap-2">
        {games.map((g) => (
          <button
            key={g}
            onClick={() => mudarCategoria(g)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors sm:px-4 sm:py-1.5 sm:text-sm ${
              game === g ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mist hover:text-ink'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {subcategorias.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
          {subcategorias.map((s) => (
            <button
              key={s}
              onClick={() => setSubcategoria(s)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                subcategoria === s ? 'border-emerald bg-emerald/10 text-emerald' : 'border-line text-mist hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-mist">Carregando contas disponíveis...</p>
      ) : filtered.length === 0 ? (
        <p className="text-mist">Nenhuma conta disponível nessa categoria no momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
