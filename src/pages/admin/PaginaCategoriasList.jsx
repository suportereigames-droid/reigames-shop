import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PaginaCategoriasList() {
  const [categorias, setCategorias] = useState([])
  const [nova, setNova] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('page_categories').select('*').order('sort_order')
    setCategorias(data || [])
  }

  useEffect(() => { load() }, [])

  async function criar() {
    const nome = nova.trim()
    if (!nome) return
    setError('')
    const { error } = await supabase.from('page_categories').insert({ name: nome, sort_order: categorias.length })
    if (error) {
      setError(error.message)
      return
    }
    setNova('')
    load()
  }

  async function alternarVisibilidade(categoria) {
    await supabase.from('page_categories').update({ show_in_menu: !categoria.show_in_menu }).eq('id', categoria.id)
    load()
  }

  async function excluir(categoria) {
    if (!confirm(`Apagar "${categoria.name}"? As páginas dela voltam a ficar avulsas no menu.`)) return
    await supabase.from('page_categories').delete().eq('id', categoria.id)
    load()
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Categorias de página</h1>
      <p className="mt-1 text-sm text-mist">
        Agrupam páginas dentro de uma "pastinha" no menu do site (ex: Grupos WhatsApp, Termos e Intermediação).
      </p>

      <div className="mt-6 flex gap-2">
        <input
          className="input"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova categoria (ex: Grupos WhatsApp)"
        />
        <button onClick={criar} className="btn-primary whitespace-nowrap">+ Criar</button>
      </div>
      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <div className="mt-6 space-y-2">
        {categorias.length === 0 && <p className="text-sm text-mist">Nenhuma categoria criada ainda.</p>}
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border border-line p-3">
            <span className="text-ink">{c.name}</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-mist">
                <input type="checkbox" checked={c.show_in_menu} onChange={() => alternarVisibilidade(c)} />
                No menu
              </label>
              <button onClick={() => excluir(c)} className="text-sm text-ember">Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
