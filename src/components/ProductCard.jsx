import { Link } from 'react-router-dom'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductCard({ product }) {
  const capa = product.media?.[0]

  return (
    <Link
      to={`/produto/${product.id}`}
      className="card group overflow-hidden transition-colors hover:border-gold/60"
    >
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
        <span className="text-[10px] uppercase tracking-wide text-emerald sm:text-xs">{product.game}</span>
        <h3 className="mt-0.5 line-clamp-4 text-xs font-semibold leading-snug text-ink sm:text-sm">{product.title}</h3>
        <p className="mt-1 text-base font-bold text-gold sm:text-xl">{money(product.price)}</p>
      </div>
    </Link>
  )
}
