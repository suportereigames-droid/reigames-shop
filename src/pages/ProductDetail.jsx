import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useSEO } from '../lib/useSEO.js'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function calcularParcelas(preco, taxas) {
  const parcelas = []
  const numeros = Object.keys(taxas).map(Number).sort((a, b) => a - b)
  for (const n of numeros) {
    const taxa = taxas[n] || 0
    const total = preco * (1 + taxa / 100)
    parcelas.push({ n, valor: total / n, comJuros: taxa > 0 })
  }
  return parcelas
}

function ModalPagamento({ preco, taxas, onFechar }) {
  const parcelas = calcularParcelas(preco, taxas)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">Formas de pagamento</h3>
          <button onClick={onFechar} className="text-mist">✕</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {['Visa', 'Mastercard', 'Elo', 'Pix'].map((m) => (
            <span key={m} className="rounded border border-line px-2.5 py-1 text-xs font-semibold text-mist">{m}</span>
          ))}
        </div>

        <p className="mb-2 text-sm font-semibold text-ink">Parcelamento no cartão</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {parcelas.map((p) => (
            <div key={p.n} className="flex justify-between border-b border-line py-1.5 text-sm">
              <span className="text-ink">{p.n}x de {money(p.valor)}</span>
              <span className={p.comJuros ? 'text-mist' : 'text-emerald'}>{p.comJuros ? 'com juros' : 'sem juros'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function distanciaEntreToques(toques) {
  const [a, b] = toques
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function ModalZoom({ url, tipo, onFechar }) {
  const [escala, setEscala] = useState(1)
  const [posicao, setPosicao] = useState({ x: 0, y: 0 })
  const gesto = useRef({ tipo: null, distanciaInicial: 0, escalaInicial: 1, ultimoPonto: null })

  function aoComecarToque(e) {
    if (e.touches.length === 2) {
      gesto.current = {
        tipo: 'pinça',
        distanciaInicial: distanciaEntreToques(e.touches),
        escalaInicial: escala
      }
    } else if (e.touches.length === 1 && escala > 1) {
      gesto.current = {
        tipo: 'arrastar',
        ultimoPonto: { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
  }

  function aoMoverToque(e) {
    if (gesto.current.tipo === 'pinça' && e.touches.length === 2) {
      e.preventDefault()
      const distanciaAtual = distanciaEntreToques(e.touches)
      const novaEscala = Math.min(4, Math.max(1, gesto.current.escalaInicial * (distanciaAtual / gesto.current.distanciaInicial)))
      setEscala(novaEscala)
    } else if (gesto.current.tipo === 'arrastar' && e.touches.length === 1) {
      e.preventDefault()
      const atual = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const dx = atual.x - gesto.current.ultimoPonto.x
      const dy = atual.y - gesto.current.ultimoPonto.y
      setPosicao((p) => ({ x: p.x + dx, y: p.y + dy }))
      gesto.current.ultimoPonto = atual
    }
  }

  function aoSoltarToque(e) {
    if (e.touches.length === 0) {
      gesto.current = { tipo: null }
      if (escala <= 1) {
        setEscala(1)
        setPosicao({ x: 0, y: 0 })
      }
    } else if (e.touches.length === 1 && escala > 1) {
      // Ainda tem um dedo na tela depois de soltar o segundo — passa a arrastar.
      gesto.current = { tipo: 'arrastar', ultimoPonto: { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    }
  }

  function aoClicarDuasVezes() {
    if (escala > 1) {
      setEscala(1)
      setPosicao({ x: 0, y: 0 })
    } else {
      setEscala(2)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90" onClick={escala === 1 ? onFechar : undefined}>
      {tipo === 'video' ? (
        <video src={url} controls controlsList="nodownload noplaybackrate" disablePictureInPicture autoPlay className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()} />
      ) : (
        <img
          src={url}
          alt=""
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${posicao.x}px, ${posicao.y}px) scale(${escala})`,
            transition: gesto.current.tipo ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={aoClicarDuasVezes}
          onTouchStart={aoComecarToque}
          onTouchMove={aoMoverToque}
          onTouchEnd={aoSoltarToque}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}
      <button onClick={onFechar} className="absolute right-4 top-4 z-10 text-2xl text-white">✕</button>
      {escala === 1 && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/70">Belisque pra ampliar</p>
      )}
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ativo, setAtivo] = useState(0)
  const [mostrarPagamento, setMostrarPagamento] = useState(false)
  const [mostrarZoom, setMostrarZoom] = useState(false)
  const [whatsappDono, setWhatsappDono] = useState(null)
  const [taxas, setTaxas] = useState({ 1: 0 })
  const gestoFoto = useRef({ startX: 0, startY: 0, moved: false })
  const miniaturasRef = useRef(null)

  // Sempre que a foto ativa mudar (arrastando na foto grande ou clicando
  // numa miniatura), rola a fileira de miniaturas até deixar a atual visível.
  useEffect(() => {
    const container = miniaturasRef.current
    if (!container) return
    const ativoEl = container.querySelector(`[data-thumb-index="${ativo}"]`)
    if (ativoEl) ativoEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [ativo])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, game, title, description, price, compare_price, media, status')
        .eq('id', id)
        .single()
      setProduct(data)
      setLoading(false)
    }
    load()

    supabase.from('site_settings').select('parcelas_taxas').single().then(({ data }) => {
      if (data?.parcelas_taxas) setTaxas(data.parcelas_taxas)
    })
    supabase.rpc('site_contato_dono').then(({ data }) => {
      if (data?.[0]?.whatsapp) setWhatsappDono(data[0].whatsapp)
    })
  }, [id])

  useSEO(
    product ? `${product.title} — ${money(product.price)} | REI GAMES` : 'Carregando... | REI GAMES',
    product ? `${product.game}: ${product.title}. ${money(product.price)}, entrega com garantia.` : undefined
  )

  if (loading) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Carregando...</p>
  if (!product) return <p className="mx-auto max-w-4xl px-4 py-10 text-mist">Conta não encontrada.</p>

  const disponivel = product.status === 'disponivel'
  const midia = product.media || []
  const atual = midia[ativo]
  const temDesconto = product.compare_price && product.compare_price > product.price
  const percentualOff = temDesconto ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0

  const linkProduto = window.location.href
  const textoCompartilhar = `Olha essa conta de ${product.game}: ${product.title} — ${linkProduto}`

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: `Olha essa conta de ${product.game}!`, url: linkProduto })
      } catch {
        // pessoa cancelou o compartilhamento, tudo bem
      }
    } else {
      await navigator.clipboard.writeText(linkProduto)
      alert('Link copiado!')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-panel2"
        onClick={() => {
          if (gestoFoto.current.moved) {
            gestoFoto.current.moved = false
            return
          }
          atual && setMostrarZoom(true)
        }}
        onTouchStart={(e) => {
          gestoFoto.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, moved: false }
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - gestoFoto.current.startX
          const dy = e.touches[0].clientY - gestoFoto.current.startY
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
            gestoFoto.current.moved = true
          }
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - gestoFoto.current.startX
          const dy = e.changedTouches[0].clientY - gestoFoto.current.startY
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            gestoFoto.current.moved = true
            if (dx < 0 && ativo < midia.length - 1) setAtivo((i) => i + 1)
            else if (dx > 0 && ativo > 0) setAtivo((i) => i - 1)
          }
        }}
      >
        {temDesconto && (
          <span className="absolute left-3 top-3 z-10 rounded bg-emerald px-2 py-1 text-xs font-bold text-white">
            {percentualOff}% OFF
          </span>
        )}
        {atual && (
          atual.type === 'video' ? (
            <video src={atual.url} controls controlsList="nodownload noplaybackrate" disablePictureInPicture className="h-full w-full object-contain" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img
              src={atual.url}
              alt={product.title}
              className="h-full w-full object-contain"
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              draggable={false}
            />
          )
        )}
      </div>

      {midia.length > 1 && (
        <div ref={miniaturasRef} className="mt-3 flex gap-2 overflow-x-auto">
          {midia.map((m, i) => (
            <button
              key={i}
              data-thumb-index={i}
              onClick={() => setAtivo(i)}
              className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded border ${i === ativo ? 'border-gold' : 'border-line'}`}
            >
              {m.type === 'video' ? (
                <video src={m.url} muted className="h-full w-full object-contain" />
              ) : (
                <img src={m.url} alt="" className="h-full w-full object-contain" onContextMenu={(e) => e.preventDefault()} draggable={false} />
              )}
            </button>
          ))}
        </div>
      )}

      <h1 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">{product.title}</h1>

      <div className="mt-2">
        {temDesconto && <p className="text-base text-mist line-through">{money(product.compare_price)}</p>}
        <span className="text-3xl font-bold text-ink">{money(product.price)}</span>
      </div>

      <button onClick={() => setMostrarPagamento(true)} className="mt-1 text-xs text-mist underline">
        Ver formas de pagamento e parcelas
      </button>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {disponivel ? (
          <Link to={`/checkout/${product.id}`} className="btn-primary flex-1 text-center">
            Comprar agora
          </Link>
        ) : (
          <span className="flex-1 rounded-md bg-ember/20 px-4 py-3 text-center text-ember">Indisponível</span>
        )}
        {whatsappDono && (
          <a
            href={`https://wa.me/55${whatsappDono.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi! Tenho interesse nessa conta: ${product.title}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost flex-1 text-center"
          >
            Falar no WhatsApp
          </a>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs text-mist">Compartilhar:</span>
        <button onClick={compartilhar} className="flex flex-col items-center gap-1 text-xs text-mist hover:text-ink" aria-label="Compartilhar">
          <span className="text-xl leading-none">🔗</span>
          Compartilhar
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textoCompartilhar)}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-1 text-xs text-mist hover:text-emerald"
        >
          <svg viewBox="0 0 32 32" className="h-5 w-5" fill="#25D366">
            <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.393.696 4.62 1.897 6.494L4 29l7.687-1.87A11.93 11.93 0 0 0 16 27c6.628 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.75c-1.988 0-3.845-.58-5.406-1.578l-.388-.244-4.56 1.11 1.145-4.44-.253-.406A9.71 9.71 0 0 1 5.25 15c0-5.937 4.813-10.75 10.75-10.75S26.75 9.063 26.75 15 21.938 24.75 16.001 24.75zm5.9-8.06c-.322-.161-1.907-.94-2.203-1.047-.296-.107-.512-.161-.727.161-.215.322-.834 1.047-1.023 1.263-.188.215-.376.242-.698.081-.322-.161-1.36-.501-2.591-1.598-.958-.855-1.605-1.91-1.793-2.232-.188-.322-.02-.496.141-.657.145-.144.322-.376.483-.564.161-.188.215-.322.322-.537.107-.215.054-.403-.027-.564-.081-.161-.727-1.753-.996-2.401-.262-.63-.528-.545-.727-.555l-.618-.011c-.215 0-.564.081-.86.403-.296.322-1.128 1.103-1.128 2.69s1.155 3.122 1.316 3.337c.161.215 2.271 3.468 5.505 4.863.769.332 1.369.53 1.837.679.772.245 1.474.211 2.03.128.619-.092 1.907-.78 2.176-1.532.269-.752.269-1.398.188-1.532-.08-.134-.295-.215-.617-.376z" />
          </svg>
          WhatsApp
        </a>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink">Descrição da conta</h2>
        <p className="whitespace-pre-line text-sm text-mist">{product.description}</p>
      </div>

      {mostrarPagamento && (
        <ModalPagamento preco={product.price} taxas={taxas} onFechar={() => setMostrarPagamento(false)} />
      )}
      {mostrarZoom && atual && (
        <ModalZoom url={atual.url} tipo={atual.type} onFechar={() => setMostrarZoom(false)} />
      )}
    </div>
  )
}
