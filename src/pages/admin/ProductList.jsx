import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

const BUCKET = 'product-images'
const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_LABEL = {
  disponivel: { texto: 'Disponível', cor: 'text-emerald' },
  reservado: { texto: 'Reservado', cor: 'text-gold' },
  vendido: { texto: 'Vendido', cor: 'text-mist' },
  oculto: { texto: 'Oculto', cor: 'text-mist' }
}

export default function ProductList() {
  const { isAdmin, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const sellerId = searchParams.get('seller')
  const [nomeVendedor, setNomeVendedor] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [membros, setMembros] = useState([])
  const [categorias, setCategorias] = useState([])
  const [filtroJogo, setFiltroJogo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  async function load() {
    setLoading(true)
    let query = supabase
      .from('products')
      .select(isAdmin ? 'id, game, title, price, status, media, created_by, profiles(full_name)' : 'id, game, title, price, status, media')
      .order('created_at', { ascending: false })
    // Não dá pra confiar só na RLS aqui: desde que liberamos a contagem
    // geral de disponíveis pra todo mundo, a RLS passou a deixar
    // qualquer membro LER contas disponíveis de outras pessoas também —
    // então filtramos aqui mesmo, pra "Minhas contas" continuar só as
    // próprias contas de quem não é admin.
    if (!isAdmin) query = query.eq('created_by', user.id)
    else if (sellerId) query = query.eq('created_by', sellerId)
    const { data, error } = await query
    if (!error) setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (sellerId) {
      supabase.from('profiles').select('full_name').eq('id', sellerId).single().then(({ data }) => {
        setNomeVendedor(data?.full_name || '')
      })
    } else {
      setNomeVendedor('')
    }
  }, [sellerId])

  useEffect(() => {
    supabase.from('categories').select('name').order('sort_order').then(({ data }) => setCategorias(data || []))
    if (isAdmin) {
      supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => setMembros(data || []))
    }
  }, [isAdmin])

  async function handleDelete(product) {
    if (!confirm('Remover esta conta do catálogo? As fotos e vídeos dela também serão apagados.')) return

    // Apaga primeiro os arquivos de mídia no Storage, senão eles ficam
    // "órfãos" ocupando espaço mesmo depois do produto sumir do catálogo.
    const paths = (product.media || []).map((m) => m.path).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths)
    }

    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      alert('Não foi possível excluir: ' + error.message)
      return
    }
    load()
  }

  function mudarMembro(valor) {
    const novo = new URLSearchParams(searchParams)
    if (valor === 'todos') novo.delete('seller')
    else novo.set('seller', valor)
    setSearchParams(novo)
  }

  const filtrados = products.filter((p) => {
    if (filtroJogo !== 'todos' && p.game !== filtroJogo) return false
    if (filtroStatus !== 'todos' && p.status !== filtroStatus) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          {sellerId ? `Contas de ${nomeVendedor}` : isAdmin ? 'Todas as contas' : 'Minhas contas'}
        </h1>
        <Link to="/admin/produtos/novo" className="btn-primary whitespace-nowrap">+ Nova conta</Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="input w-auto min-w-[140px] text-sm"
          value={filtroJogo}
          onChange={(e) => setFiltroJogo(e.target.value)}
        >
          <option value="todos">Todos os jogos</option>
          {categorias.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          className="input w-auto min-w-[140px] text-sm"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([valor, { texto }]) => (
            <option key={valor} value={valor}>{texto}</option>
          ))}
        </select>

        {isAdmin && (
          <select
            className="input w-auto min-w-[160px] text-sm"
            value={sellerId || 'todos'}
            onChange={(e) => mudarMembro(e.target.value)}
          >
            <option value="todos">Todos os membros</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-mist">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="mt-6 text-mist">
          {products.length === 0 ? 'Você ainda não postou nenhuma conta.' : 'Nenhuma conta encontrada com esses filtros.'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-panel2 text-mist">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Jogo</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Postado por</th>}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const capa = p.media?.[0]
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      {capa ? (
                        capa.type === 'video' ? (
                          <video src={capa.url} muted className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <img src={capa.url} alt="" className="h-12 w-12 rounded object-cover" />
                        )
                      ) : (
                        <div className="h-12 w-12 rounded bg-panel2" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">{p.game}</td>
                    <td className="px-4 py-3 text-ink">{p.title}</td>
                    <td className="px-4 py-3 text-gold">{money(p.price)}</td>
                    <td className={`px-4 py-3 ${STATUS_LABEL[p.status]?.cor}`}>{STATUS_LABEL[p.status]?.texto}</td>
                    {isAdmin && <td className="px-4 py-3 text-mist">{p.profiles?.full_name}</td>}
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/produtos/${p.id}`} className="mr-3 text-gold hover:underline">Editar</Link>
                      <button onClick={() => handleDelete(p)} className="text-ember hover:underline">Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
