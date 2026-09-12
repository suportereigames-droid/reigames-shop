import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function PaginasList() {
  const [paginas, setPaginas] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('site_pages').select('*').order('sort_order')
    setPaginas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function excluir(id) {
    if (!confirm('Remover essa página do site?')) return
    await supabase.from('site_pages').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Páginas do site</h1>
        <Link to="/admin/paginas/nova" className="btn-primary">+ Nova página</Link>
      </div>
      <p className="mt-1 text-mist">
        Essas páginas aparecem no menu do topo do site (ex: "Grupo WhatsApp") e cada uma
        tem seu próprio código, que você mesmo cola e edita quando quiser.
      </p>

      {loading ? (
        <p className="mt-6 text-mist">Carregando...</p>
      ) : paginas.length === 0 ? (
        <p className="mt-6 text-mist">Nenhuma página criada ainda.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel2 text-mist">
              <tr>
                <th className="px-4 py-3">Nome no menu</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Aparece no menu?</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginas.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3 text-white">{p.menu_label}</td>
                  <td className="px-4 py-3 text-mist">/pagina/{p.slug}</td>
                  <td className="px-4 py-3 text-mist">{p.show_in_menu ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/paginas/${p.id}`} className="mr-3 text-gold hover:underline">Editar</Link>
                    <button onClick={() => excluir(p.id)} className="text-ember hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
