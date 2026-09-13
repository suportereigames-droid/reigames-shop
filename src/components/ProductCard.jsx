import { Link } from 'react-router-dom'

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
      to={`/produto/${product.id}`}
      className="card group relative overflow-hidden transition-colors hover:border-gold/60"
    >
      {temDesconto && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded bg-emerald px-1.5 py-0.5 text-[9px] font-bold text-white">
          {percentualOff}% OFF
        </span>
      )}
      <div className="aspect-square w-full overflow-hidden bg-panel2">
        {!capa ? (
          <div className="flex h-full items-center justify-center text-xs text-mist">Sem mídia</div>
        ) : capa.type === 'video' ? (
          <video src={capa.url} muted className="h-full w-full object-contain" />
        ) : (
          <img src={capa.url} alt={product.title} className="h-full w-full object-contain transition-transform group-hover:scale-105" />
        )}
      </div>
      <div className="p-2.5 sm:p-4">
        <h3 className="line-clamp-5 text-[11px] font-semibold leading-snug text-ink sm:text-xs">{product.title}</h3>
        <div className="mt-1.5">
          {temDesconto && (
            <p className="text-xs text-mist line-through">{money(product.compare_price)}</p>
          )}
          <p className="text-base font-bold text-ink sm:text-lg">{money(product.price)}</p>
          {maxParcelas > 1 && (
            <p className="text-[10px] text-mist">em {maxParcelas}x de {money(valorParcela)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
