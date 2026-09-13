import { Link } from 'react-router-dom'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductCard({ product }) {
  const capa = product.media?.[0]
  const temDesconto = product.compare_price && product.compare_price > product.price
  const percentualOff = temDesconto
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0

  return (
    <Link
      to={`/produto/${product.id}`}
      className="card group relative overflow-hidden transition-colors hover:border-gold/60"
    >
      {temDesconto && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald px-2 py-0.5 text-[10px] font-bold text-white">
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
        <div className="mt-1.5 flex items-center gap-2">
          {temDesconto && (
            <span className="text-xs text-mist line-through">{money(product.compare_price)}</span>
          )}
          <p className="text-sm font-bold text-gold sm:text-base">{money(product.price)}</p>
        </div>
      </div>
    </Link>
  )
}
