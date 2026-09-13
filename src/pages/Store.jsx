import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'

function BannerCarousel({ slides }) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setIndice((i) => (i + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [slides.length])

  if (slides.length === 0) return null

  return (
    <div className="relative mb-4 overflow-hidden rounded-lg">
      <img src={slides[indice].image_url} alt="" className="aspect-[2/1] w-full object-cover sm:aspect-[3/1]" />
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIndice(i)}
              className={`h-2 w-2 rounded-full ${i === indice ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FrasesRotativas({ texto }) {
  const frases = useMemo(() => (texto || '').split('\n').map((f) => f.trim()).filter(Boolean), [texto])
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (frases.length < 2) return
    const t = setInterval(() => setIndice((i) => (i + 1) % frases.length), 3000)
    return () => clearInterval(t)
  }, [frases.length])

  if (frases.length === 0) return null

  return (
    <div className="mb-6 rounded bg-panel px-4 py-2 text-center text-sm font-medium text-ink">
      {frases[indice]}
    </div>
  )
}

export default function Store() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [subcategoriasBanco, setSubcategoriasBanco] = useState([])
  const [banners, setBanners] = useState([])
  const [frasesRotativas, setFrasesRotativas] = useState('')
  const [parcerias, setParcerias] = useState([])
  const [game, setGame] = useState('todos')
  const [subcategoria, setSubcategoria] = useState('todas')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: prods }, { data: cats }, { data: subs }, { data: bnrs }, { data: settings }] = await Promise.all([
        supabase.from('products').select('id, game, subcategory, title, price, media').eq('status', 'disponivel').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase.from('banner_slides').select('*').order('sort_order'),
        supabase.from('site_settings').select('frases_rotativas, parcerias_categoria_id').single()
      ])
      setProducts(prods || [])
      setCategorias(cats || [])
      setSubcategoriasBanco(subs || [])
      setBanners(bnrs || [])
      setFrasesRotativas(settings?.frases_rotativas || '')

      if (settings?.parcerias_categoria_id) {
        const { data: pgs } = await supabase
          .from('site_pages')
          .select('slug, menu_label, image_url')
          .eq('page_category_id', settings.parcerias_categoria_id)
          .order('sort_order')
        setParcerias(pgs || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const categoriasComConta = useMemo(
    () => categorias.filter((c) => products.some((p) => p.game === c.name)),
    [categorias, products]
  )

  const porCategoria = game === 'todos' ? products : products.filter((p) => p.game === game)

  const subcategoriasDaCategoria = useMemo(() => {
    const categoriaAtual = categorias.find((c) => c.name === game)
    if (!categoriaAtual) return []
    return subcategoriasBanco.filter(
      (s) => s.category_id === categoriaAtual.id && porCategoria.some((p) => p.subcategory === s.name)
    )
  }, [categorias, subcategoriasBanco, game, porCategoria])

  const filtered = subcategoria === 'todas' ? porCategoria : porCategoria.filter((p) => p.subcategory === subcategoria)

  function mudarCategoria(nomeCategoria) {
    setGame(nomeCategoria)
    setSubcategoria('todas')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <BannerCarousel slides={banners} />
      <FrasesRotativas texto={frasesRotativas} />

      <section className="mb-6" id="catalogo">
        <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-ink">Categorias</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <button onClick={() => mudarCategoria('todos')} className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-xs font-bold text-mist sm:h-20 sm:w-20 ${game === 'todos' ? 'border-gold' : 'border-line'}`}>
              Todos
            </div>
          </button>
          {categoriasComConta.map((c) => (
            <button key={c.id} onClick={() => mudarCategoria(c.name)} className="flex flex-shrink-0 flex-col items-center gap-1.5">
              <div className={`h-16 w-16 overflow-hidden rounded-full border-2 sm:h-20 sm:w-20 ${game === c.name ? 'border-gold' : 'border-line'}`}>
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-panel2 text-[10px] text-mist">Sem foto</div>
                )}
              </div>
              <span className="max-w-20 text-center text-xs font-semibold uppercase text-ink">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {game !== 'todos' && subcategoriasDaCategoria.length > 0 && (
        <section className="mb-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            <button onClick={() => setSubcategoria('todas')} className="flex flex-shrink-0 flex-col items-center gap-1.5">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-[10px] font-bold text-mist ${subcategoria === 'todas' ? 'border-emerald' : 'border-line'}`}>
                Todas
              </div>
            </button>
            {subcategoriasDaCategoria.map((s) => (
              <button key={s.id} onClick={() => setSubcategoria(s.name)} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                <div className={`h-14 w-14 overflow-hidden rounded-full border-2 ${subcategoria === s.name ? 'border-emerald' : 'border-line'}`}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-panel2 text-[9px] text-mist">Sem foto</div>
                  )}
                </div>
                <span className="max-w-16 text-center text-[11px] font-semibold text-ink">{s.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {parcerias.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-ink">Parcerias</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {parcerias.map((p) => (
              <Link key={p.slug} to={`/pagina/${p.slug}`} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-line sm:h-20 sm:w-20">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.menu_label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-panel2 text-[10px] text-mist">Sem foto</div>
                  )}
                </div>
                <span className="max-w-20 text-center text-xs font-semibold text-ink">{p.menu_label}</span>
              </Link>
            ))}
          </div>
        </section>
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
