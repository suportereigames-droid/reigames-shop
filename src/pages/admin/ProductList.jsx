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
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const sellerId = searchParams.get('seller')
  const [nomeVendedor, setNomeVendedor] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    let query = supabase
      .from('products')
      .select(isAdmin ? 'id, game, title, price, status, media, created_by, profiles(full_name)' : 'id, game, title, price, status, media')
      .order('created_at', { ascending: false })
    if (sellerId) query = query.eq('created_by', sellerId)
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

  async function handleDelete(product) {
    if (!confirm('Remover esta conta do catálogo? As fotos e vídeos dela também serão apagados.')) return

    // Apaga primeiro os arquivos de mídia no Storage, senão eles ficam
    // "órfãos" ocupando espaço mesmo depois do produto sumir do catálogo.
    const paths = (product.media || []).map((m) => m.path).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths)
    }

    await supabase.from('products').delete().eq('id', product.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">
          {sellerId ? `Contas de ${nomeVendedor}` : isAdmin ? 'Todas as contas' : 'Minhas contas'}
        </h1>
        <Link to="/admin/produtos/novo" className="btn-primary">+ Nova conta</Link>
      </div>

      {sellerId && (
        <button onClick={() => setSearchParams({})} className="mt-2 text-sm text-mist underline">
          Limpar filtro
        </button>
      )}

      {loading ? (
        <p className="mt-6 text-mist">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-mist">Você ainda não postou nenhuma conta.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
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
              {products.map((p) => {
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
