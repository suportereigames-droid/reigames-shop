import { Link } from 'react-router-dom'
import { slugify } from '../lib/slugify.js'
import { imagemOtimizada } from '../lib/imagemOtimizada.js'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductCard({ product, taxas }) {
  const capa = product.media?.[0]
  const temDesconto = product.compare_price && product.compare_price > product.price
  const percentualOff = temDesconto
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0

  const numerosParcelas = taxas ? Object.keys(taxas).map(Number) : []
  const maxParcelas = numerosParcelas.length ? Math.max(...numerosParcelas) : null
  const valorParcela = maxParcelas
    ? (product.price * (1 + (taxas[maxParcelas] || 0) / 100)) / maxParcelas
    : null

  return (
    <Link
      to={`/categoria/${slugify(product.game)}/produto/${slugify(product.title)}`}
      className="card group relative flex h-full flex-col overflow-hidden transition-colors hover:border-gold/60"
    >
      {temDesconto && (
        <span className="absolute left-0 top-0 z-10 rounded-br-md bg-emerald px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
          {percentualOff}% OFF
        </span>
      )}
      <div className="aspect-square w-full overflow-hidden bg-panel2">
        {!capa ? (
          <div className="flex h-full items-center justify-center text-xs text-mist">Sem mídia</div>
        ) : capa.type === 'video' ? (
          <video src={capa.url} muted className="h-full w-full object-contain" />
        ) : (
          <img src={imagemOtimizada(capa.url, { width: 400 })} alt={product.title} className="h-full w-full object-contain transition-transform group-hover:scale-105" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <h3 className="line-clamp-4 text-sm font-semibold leading-snug text-ink">{product.title}</h3>

        <div className="mt-auto pt-2">
          {temDesconto && (
            <p className="text-xs text-mist line-through">{money(product.compare_price)}</p>
          )}
          <p className="text-lg font-bold text-ink sm:text-xl">{money(product.price)}</p>
          {maxParcelas > 1 && (
            <p className="text-xs text-mist">
              em <span className="font-semibold text-ink">{maxParcelas}x</span> de{' '}
              <span className="font-semibold text-ink">{money(valorParcela)}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
