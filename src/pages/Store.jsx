import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard.jsx'
import { useSEO } from '../lib/useSEO.js'

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function embaralhar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function BannerCarousel({ slides, intervalo }) {
  const [indice, setIndice] = useState(0)
  const toqueInicial = useRef(null)

  useEffect(() => {
    if (slides.length < 2) return
    const t = setInterval(() => setIndice((i) => (i + 1) % slides.length), (intervalo || 4) * 1000)
    return () => clearInterval(t)
  }, [slides.length, intervalo])

  if (slides.length === 0) return null

  function aoComecarToque(e) {
    toqueInicial.current = e.touches[0].clientX
  }

  function aoSoltarToque(e) {
    if (toqueInicial.current === null) return
    const distancia = e.changedTouches[0].clientX - toqueInicial.current
    if (Math.abs(distancia) > 40) {
      if (distancia < 0) setIndice((i) => (i + 1) % slides.length)
      else setIndice((i) => (i - 1 + slides.length) % slides.length)
    }
    toqueInicial.current = null
  }

  return (
    <div
      className="relative mb-4 overflow-hidden rounded-lg"
      onTouchStart={aoComecarToque}
      onTouchEnd={aoSoltarToque}
    >
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

function FrasesRotativas({ texto, velocidade }) {
  const frases = useMemo(() => (texto || '').split('\n').map((f) => f.trim()).filter(Boolean), [texto])
  const trilhoRef = useRef(null)
  const larguraUmaVoltaRef = useRef(0)
  const posicaoRef = useRef(0)
  const quadroRef = useRef(null)

  useEffect(() => {
    if (frases.length === 0) return
    const elemento = trilhoRef.current
    if (!elemento) return

    // A largura de "uma volta completa" é metade do conteúdo (já que
    // duplicamos as frases duas vezes ali embaixo), medida de verdade em
    // pixels — assim a rolagem nunca desalinha nem dá salto ao repetir.
    // Remedimos sempre que o tamanho mudar (ex: emoji/fonte que termina
    // de carregar depois da primeira medição), pra nunca ficar errado.
    function remedir() {
      larguraUmaVoltaRef.current = elemento.scrollWidth / 2
    }
    remedir()
    const observador = new ResizeObserver(remedir)
    observador.observe(elemento)

    posicaoRef.current = 0
    const pixelsPorSegundo = () => larguraUmaVoltaRef.current / (velocidade || 20)
    let ultimoTempo = null

    function passo(tempoAtual) {
      if (ultimoTempo === null) ultimoTempo = tempoAtual
      const delta = (tempoAtual - ultimoTempo) / 1000
      ultimoTempo = tempoAtual

      posicaoRef.current += pixelsPorSegundo() * delta
      if (larguraUmaVoltaRef.current > 0 && posicaoRef.current >= larguraUmaVoltaRef.current) {
        posicaoRef.current -= larguraUmaVoltaRef.current
      }
      if (elemento) elemento.style.transform = `translateX(-${posicaoRef.current}px)`
      quadroRef.current = requestAnimationFrame(passo)
    }
    quadroRef.current = requestAnimationFrame(passo)

    return () => {
      if (quadroRef.current) cancelAnimationFrame(quadroRef.current)
      observador.disconnect()
    }
  }, [frases, velocidade])

  if (frases.length === 0) return null

  return (
    <div className="mb-6 overflow-hidden bg-white py-2.5">
      <div ref={trilhoRef} className="flex whitespace-nowrap will-change-transform">
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

function LinhaComSetas({ children }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {children}
    </div>
  )
}

export default function Store() {
  const { slugCategoria, slugSubcategoria } = useParams()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState([])
  const [subcategoriasBanco, setSubcategoriasBanco] = useState([])
  const [banners, setBanners] = useState([])
  const [bannerIntervalo, setBannerIntervalo] = useState(4)
  const [frasesRotativas, setFrasesRotativas] = useState('')
  const [frasesVelocidade, setFrasesVelocidade] = useState(20)
  const [parcerias, setParcerias] = useState([])
  const [taxasParcelas, setTaxasParcelas] = useState(null)
  const [game, setGame] = useState('todos')
  const [subcategoria, setSubcategoria] = useState('todas')

  useSEO(
    game !== 'todos'
      ? `Contas de ${game} — REI GAMES`
      : 'REI GAMES — Contas verificadas de EFOOTBALL, Clash of Clans, Clash Royale e mais',
    game !== 'todos'
      ? `Compre contas de ${game} com garantia e entrega segura. Parcelamento no cartão e mediação segura.`
      : 'Compre e venda contas de jogos com garantia e entrega segura. Parcelamento no cartão e mediação segura.'
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: prods }, { data: cats }, { data: subs }, { data: bnrs }, { data: settings }] = await Promise.all([
        supabase.from('products').select('id, game, subcategory, title, price, compare_price, media').eq('status', 'disponivel'),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('subcategories').select('*').order('sort_order'),
        supabase.from('banner_slides').select('*').order('sort_order'),
        supabase.from('site_settings').select('frases_rotativas, frases_velocidade, parcerias_categoria_id, parcelas_taxas, banner_intervalo').single()
      ])
      setProducts(embaralhar(prods || []))
      setCategorias(cats || [])
      setSubcategoriasBanco(subs || [])
      setBanners(bnrs || [])
      setFrasesRotativas(settings?.frases_rotativas || '')
      setFrasesVelocidade(settings?.frases_velocidade || 20)
      setBannerIntervalo(settings?.banner_intervalo || 4)
      setTaxasParcelas(settings?.parcelas_taxas || null)

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

  // Mantém a categoria selecionada sincronizada com a URL — tanto ao
  // carregar direto num link de categoria quanto ao usar o "voltar" do
  // navegador.
  useEffect(() => {
    if (categorias.length === 0) return
    if (!slugCategoria) {
      setGame('todos')
      return
    }
    const encontrada = categorias.find((c) => slugify(c.name) === slugCategoria)
    if (encontrada) setGame(encontrada.name)
  }, [slugCategoria, categorias])

  // Mesma lógica pra subcategoria: sincroniza com a URL assim que ela e
  // as subcategorias do banco estiverem disponíveis.
  useEffect(() => {
    if (subcategoriasBanco.length === 0) return
    if (!slugSubcategoria) {
      setSubcategoria('todas')
      return
    }
    const encontrada = subcategoriasBanco.find((s) => slugify(s.name) === slugSubcategoria)
    if (encontrada) setSubcategoria(encontrada.name)
  }, [slugSubcategoria, subcategoriasBanco])

  const categoriasComConta = useMemo(() => {
    return categorias
      .map((c) => ({ ...c, _total: products.filter((p) => p.game === c.name).length }))
      .filter((c) => c._total > 0)
      .sort((a, b) => b._total - a._total)
  }, [categorias, products])

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
    navigate(nomeCategoria === 'todos' ? '/' : `/categoria/${slugify(nomeCategoria)}`)
  }

  function mudarSubcategoria(nomeSubcategoria) {
    setSubcategoria(nomeSubcategoria)
    const baseCategoria = `/categoria/${slugify(game)}`
    navigate(nomeSubcategoria === 'todas' ? baseCategoria : `${baseCategoria}/${slugify(nomeSubcategoria)}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <BannerCarousel slides={banners} intervalo={bannerIntervalo} />
      <FrasesRotativas texto={frasesRotativas} velocidade={frasesVelocidade} />

      <section className="mb-6" id="catalogo">
        <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-ink">Categorias</h2>
        <LinhaComSetas>
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
                  <div className="flex h-full w-full items-center justify-center bg-panel2 text-[10px] text-mist">Sem foto</div>
                )}
              </div>
              <span className="w-[52px] break-words text-center text-[11px] font-semibold uppercase leading-tight text-ink">{c.name}</span>
            </button>
          ))}
        </LinhaComSetas>
      </section>

      {game !== 'todos' && subcategoriasDaCategoria.length > 0 && (
        <section className="mb-6">
          <LinhaComSetas>
            <button onClick={() => mudarSubcategoria('todas')} className="flex flex-shrink-0 flex-col items-center gap-1.5">
              <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 text-[10px] font-bold text-mist ${subcategoria === 'todas' ? 'border-emerald' : 'border-line'}`}>
                Todas
              </div>
            </button>
            {subcategoriasDaCategoria.map((s) => (
              <button key={s.id} onClick={() => mudarSubcategoria(s.name)} className="flex flex-shrink-0 flex-col items-center gap-1.5">
                <div className={`h-[52px] w-[52px] overflow-hidden rounded-full border-2 ${subcategoria === s.name ? 'border-emerald' : 'border-line'}`}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-panel2 text-[9px] text-mist">Sem foto</div>
                  )}
                </div>
                <span className="max-w-[52px] text-center text-[11px] font-semibold text-ink">{s.name}</span>
              </button>
            ))}
          </LinhaComSetas>
        </section>
      )}

      {parcerias.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold uppercase tracking-wide text-ink">Parcerias</h2>
          <LinhaComSetas>
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
          </LinhaComSetas>
        </section>
      )}

      {loading ? (
        <p className="text-mist">Carregando contas disponíveis...</p>
      ) : filtered.length === 0 ? (
        <p className="text-mist">Nenhuma conta disponível nessa categoria no momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} taxas={taxasParcelas} />
          ))}
        </div>
      )}
    </div>
  )
}
