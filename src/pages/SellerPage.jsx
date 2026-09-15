import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function LinhaCategorias({ children }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {children}
    </div>
  )
}

export default function SellerPage() {
  const { slug } = useParams()
  const [pagina, setPagina] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [subcategoriasBanco, setSubcategoriasBanco] = useState([])
  const [game, setGame] = useState('todos')
  const [subcategoria, setSubcategoria] = useState('todas')
  const [naoEncontrado, setNaoEncontrado] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: seller, error } = await supabase
        .from('seller_pages')
        .select('seller_id, slug, display_name, titulo, logo_url, frases')
        .eq('slug', slug)
        .single()

      if (error || !seller) {
        setNaoEncontrado(true)
        setLoading(false)
        return
      }
      setPagina(seller)

      const [{ data: prods }, { data: cats }, { data: subs }] = await Promise.all([
        supabase
          .from('products')
          .select('id, game, subcategory, title, price, compare_price, media')
          .eq('created_by', seller.seller_id)
          .eq('status', 'disponivel')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name, image_url').order('sort_order'),
        supabase.from('subcategories').select('id, name, category_id, image_url').order('sort_order')
      ])
      setProdutos(prods || [])
      setCategorias(cats || [])
      setSubcategoriasBanco(subs || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const categoriasComConta = useMemo(() => {
    return categorias
      .map((c) => ({ ...c, _total: produtos.filter((p) => p.game === c.name).length }))
      .filter((c) => c._total > 0)
      .sort((a, b) => b._total - a._total)
  }, [categorias, produtos])

  const porCategoria = game === 'todos' ? produtos : produtos.filter((p) => p.game === game)

  const subcategoriasComConta = useMemo(() => {
    const categoriaAtual = categorias.find((c) => c.name === game)
    if (!categoriaAtual) return []
    return subcategoriasBanco.filter(
      (s) => s.category_id === categoriaAtual.id && porCategoria.some((p) => p.subcategory === s.name)
    )
  }, [categorias, subcategoriasBanco, game, porCategoria])

  const filtrados = subcategoria === 'todas' ? porCategoria : porCategoria.filter((p) => p.subcategory === subcategoria)

  function mudarCategoria(nomeCategoria) {
    setGame(nomeCategoria)
    setSubcategoria('todas')
  }

  if (loading) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Carregando...</p>
  if (naoEncontrado) return <p className="mx-auto max-w-6xl px-4 py-10 text-mist">Essa loja não existe (ou o link mudou).</p>

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink md:text-4xl">{pagina.titulo || pagina.display_name}</h1>

      {(pagina.logo_url || pagina.frases) && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {pagina.logo_url && (
            <img
              src={pagina.logo_url}
              alt={pagina.titulo || pagina.display_name}
              className="h-20 w-20 flex-shrink-0 rounded-full border border-line object-cover"
            />
          )}
          {pagina.frases && (
            <div className="text-sm font-medium text-ink">
              {pagina.frases.split('\n').map((f) => f.trim()).filter(Boolean).map((frase, i) => (
                <p key={i}>{frase}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {categoriasComConta.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-ink">Categorias</h2>
          <LinhaCategorias>
            <button onClick={() => mudarCategoria('todos')} className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5">
              <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-xs font-bold text-mist ${game === 'todos' ? 'border-gold' : 'border-line'}`}>
                Todos
              </div>
            </button>
            {categoriasComConta.map((c) => (
              <button key={c.id} onClick={() => mudarCategoria(c.name)} className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5">
                <div className={`h-[52px] w-[52px] overflow-hidden rounded-full border-2 ${game === c.name ? 'border-gold' : 'border-line'}`}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-panel2 text-[9px] text-mist">Sem foto</div>
                  )}
                </div>
                <span className="w-16 break-words text-center text-[11px] font-semibold uppercase leading-tight text-ink">{c.name}</span>
              </button>
            ))}
          </LinhaCategorias>
        </section>
      )}

      {game !== 'todos' && subcategoriasComConta.length > 0 && (
        <section className="mt-4">
          <LinhaCategorias>
            <button onClick={() => setSubcategoria('todas')} className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5">
              <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-[10px] font-bold text-mist ${subcategoria === 'todas' ? 'border-emerald' : 'border-line'}`}>
                Todas
              </div>
            </button>
            {subcategoriasComConta.map((s) => (
              <button key={s.id} onClick={() => setSubcategoria(s.name)} className="flex w-[52px] flex-shrink-0 flex-col items-center gap-1.5">
                <div className={`h-[52px] w-[52px] overflow-hidden rounded-full border-2 ${subcategoria === s.name ? 'border-emerald' : 'border-line'}`}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-panel2 text-[9px] text-mist">Sem foto</div>
                  )}
                </div>
                <span className="w-[52px] break-words text-center text-[11px] font-semibold text-ink">{s.name}</span>
              </button>
            ))}
          </LinhaCategorias>
        </section>
      )}

      <div className="mt-8">
        {filtrados.length === 0 ? (
          <p className="text-mist">Nenhuma conta disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filtrados.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
