import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const PERIODOS = [
  { chave: 'hoje', label: 'Hoje' },
  { chave: '7dias', label: '7 dias' },
  { chave: '30dias', label: '30 dias' },
  { chave: 'tudo', label: 'Tudo' }
]

function dataCorte(periodo) {
  const agora = new Date()
  if (periodo === 'hoje') { agora.setHours(0, 0, 0, 0); return agora.toISOString() }
  if (periodo === '7dias') { agora.setDate(agora.getDate() - 7); return agora.toISOString() }
  if (periodo === '30dias') { agora.setDate(agora.getDate() - 30); return agora.toISOString() }
  return null
}

const CORES_JOGO = ['#B8791E', '#1D9A66', '#7C9EF2', '#D14A22', '#C084FC', '#F472B6']

function BarraJogo({ item, valorMax, corIndex, textoDireita }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink">{item.game}</span>
        <span className="text-mist">{textoDireita}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full"
          style={{ width: `${(valorMax ? (item._valor / valorMax) * 100 : 0)}%`, backgroundColor: CORES_JOGO[corIndex % CORES_JOGO.length] }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, isAdmin, user } = useAuth()
  const [periodo, setPeriodo] = useState('7dias')
  const [stats, setStats] = useState({
    pedidosAbertos: 0, disponivel: 0, vendido: 0, faturado: 0, visitas: 0, porJogo: [], vendasPorJogo: []
  })
  const [onlineAgora, setOnlineAgora] = useState(0)

  useEffect(() => {
    async function load() {
      const corte = dataCorte(periodo)

      let pedidosQuery = supabase.from('orders').select('status, amount, created_at, product_game')
      if (corte) pedidosQuery = pedidosQuery.gte('created_at', corte)

      const [{ data: produtos }, { data: pedidos }, visitas] = await Promise.all([
        supabase.from('products').select('status, game, created_by'),
        pedidosQuery,
        isAdmin
          ? (() => {
              let q = supabase.from('site_visits').select('id', { count: 'exact', head: true })
              if (corte) q = q.gte('created_at', corte)
              return q
            })()
          : Promise.resolve({ count: null })
      ])

      // "Contas disponíveis" no cartão do topo é a visão de trabalho de
      // cada um: admin vê o total do site, membro vê só as próprias.
      const disponivel = isAdmin
        ? produtos?.filter((p) => p.status === 'disponivel').length || 0
        : produtos?.filter((p) => p.status === 'disponivel' && p.created_by === user?.id).length || 0
      const pedidosPagos = pedidos?.filter((p) => p.status === 'pago') || []
      const vendido = pedidosPagos.length
      const faturado = pedidosPagos.reduce((s, p) => s + Number(p.amount), 0)
      const pedidosAbertos = pedidos?.filter((p) => p.status === 'pendente').length || 0

      const vendasPorJogoMap = {}
      pedidosPagos.forEach((p) => {
        const jogo = p.product_game || 'Sem categoria'
        if (!vendasPorJogoMap[jogo]) vendasPorJogoMap[jogo] = { unidades: 0, valor: 0 }
        vendasPorJogoMap[jogo].unidades += 1
        vendasPorJogoMap[jogo].valor += Number(p.amount)
      })
      const vendasPorJogo = Object.entries(vendasPorJogoMap)
        .map(([game, dados]) => ({ game, ...dados, _valor: dados.valor }))
        .sort((a, b) => b.valor - a.valor)

      const contagemPorJogo = {}
      produtos?.forEach((p) => {
        if (p.status !== 'disponivel') return
        contagemPorJogo[p.game] = (contagemPorJogo[p.game] || 0) + 1
      })
      const porJogo = Object.entries(contagemPorJogo)
        .map(([game, total]) => ({ game, total, _valor: total }))
        .sort((a, b) => b.total - a.total)

      setStats({ disponivel, vendido, faturado, visitas: visitas.count || 0, pedidosAbertos, porJogo, vendasPorJogo })
    }
    load()
  }, [isAdmin, periodo, user?.id])

  useEffect(() => {
    if (!isAdmin) return
    const canal = supabase.channel('site-presence')
    canal
      .on('presence', { event: 'sync' }, () => {
        setOnlineAgora(Object.keys(canal.presenceState()).length)
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [isAdmin])

  const maiorVendaValor = stats.vendasPorJogo[0]?.valor || 1
  const maiorEstoque = stats.porJogo[0]?.total || 1

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Olá, {profile?.full_name?.split(' ')[0] || ''}</h1>
      <p className="mt-1 text-mist">{isAdmin ? 'Visão geral de toda a loja' : 'Resumo das suas contas e pedidos'}</p>

      <div className="mt-5 flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.chave}
            onClick={() => setPeriodo(p.chave)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              periodo === p.chave ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mist hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-panel p-6">
        <p className="text-sm text-mist">{isAdmin ? 'Faturado no período' : 'Você faturou no período'}</p>
        <p className="mt-1 text-4xl font-extrabold text-gold">{money(stats.faturado)}</p>
      </div>

      {isAdmin && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-panel2 p-4">
          <div>
            <p className="text-xs text-mist">Visitas no site no período</p>
            <p className="mt-0.5 text-xl font-bold text-ink">{stats.visitas}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald" />
            <span className="text-xs font-semibold text-emerald">{onlineAgora} no site agora</span>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/admin/pedidos" className="card p-5 transition-colors hover:border-gold/60">
          <p className="text-sm text-mist">Pedidos em aberto</p>
          <p className="mt-1 text-2xl font-bold text-gold">{stats.pedidosAbertos}</p>
        </Link>
        <Link to="/admin/produtos" className="card p-5 transition-colors hover:border-gold/60">
          <p className="text-sm text-mist">Contas disponíveis</p>
          <p className="mt-1 text-2xl font-bold text-emerald">{stats.disponivel}</p>
        </Link>
        <div className="card p-5">
          <p className="text-sm text-mist">Contas vendidas</p>
          <p className="mt-1 text-2xl font-bold text-mist">{stats.vendido}</p>
        </div>
      </div>

      {stats.vendasPorJogo.length > 0 && (
        <div className="mt-5 rounded-xl border border-line p-5">
          <h2 className="mb-3 font-bold text-ink">Vendas por jogo (no período)</h2>
          {stats.vendasPorJogo.map((item, i) => (
            <BarraJogo
              key={item.game}
              item={item}
              valorMax={maiorVendaValor}
              corIndex={i}
              textoDireita={`${item.unidades} vendida${item.unidades > 1 ? 's' : ''} · ${money(item.valor)}`}
            />
          ))}
        </div>
      )}

      {stats.porJogo.length > 0 && (
        <div className="mt-5 rounded-xl border border-line p-5">
          <h2 className="mb-3 font-bold text-ink">Contas disponíveis por jogo</h2>
          {stats.porJogo.map((item, i) => (
            <BarraJogo key={item.game} item={item} valorMax={maiorEstoque} corIndex={i} textoDireita={item.total} />
          ))}
        </div>
      )}
    </div>
  )
}
