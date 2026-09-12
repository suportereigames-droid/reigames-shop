import { Link } from 'react-router-dom'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductCard({ product }) {
  const capa = product.media?.[0]

  return (
    <Link to={`/produto/${product.id}`} className="card group overflow-hidden transition-colors hover:border-gold/60">
      <div className="aspect-video w-full overflow-hidden bg-panel2">
        {!capa ? (
          <div className="flex h-full items-center justify-center text-mist">Sem mídia</div>
        ) : capa.type === 'video' ? (
          <video src={capa.url} muted className="h-full w-full object-cover" />
        ) : (
          <img src={capa.url} alt={product.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        )}
      </div>
      <div className="p-4">
        <span className="text-xs uppercase tracking-wide text-emerald">{product.game}</span>
        <h3 className="mt-1 line-clamp-1 text-lg font-semibold text-ink">{product.title}</h3>
        <p className="mt-2 text-xl font-bold text-gold">{money(product.price)}</p>
      </div>
    </Link>
  )
}
