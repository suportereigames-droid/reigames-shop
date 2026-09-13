import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function MenuList() {
  const [itens, setItens] = useState([])
  const [paginas, setPaginas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tipo, setTipo] = useState('pagina')
  const [pageId, setPageId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [{ data: mi }, { data: pgs }, { data: cats }] = await Promise.all([
      supabase.from('menu_items').select('*, site_pages(menu_label), page_categories(name)').order('sort_order'),
      supabase.from('site_pages').select('id, menu_label'),
      supabase.from('page_categories').select('id, name')
    ])
    setItens(mi || [])
    setPaginas(pgs || [])
    setCategorias(cats || [])
  }

  useEffect(() => { load() }, [])

  async function adicionar() {
    setError('')
    let payload = { tipo, sort_order: itens.length }
    if (tipo === 'pagina') {
      if (!pageId) return setError('Escolha uma página.')
      payload.page_id = pageId
    } else if (tipo === 'categoria') {
      if (!categoryId) return setError('Escolha uma categoria.')
      payload.page_category_id = categoryId
    } else {
      if (!label.trim() || !url.trim()) return setError('Preencha o texto e o link.')
      payload.label = label.trim()
      payload.url = url.trim()
    }
    const { error } = await supabase.from('menu_items').insert(payload)
    if (error) {
      setError(error.message)
      return
    }
    setPageId(''); setCategoryId(''); setLabel(''); setUrl('')
    load()
  }

  async function mover(index, direcao) {
    const nova = [...itens]
    const destino = index + direcao
    if (destino < 0 || destino >= nova.length) return
    ;[nova[index], nova[destino]] = [nova[destino], nova[index]]
    setItens(nova)
    // grava a nova ordem de todo mundo
    await Promise.all(nova.map((item, i) => supabase.from('menu_items').update({ sort_order: i }).eq('id', item.id)))
  }

  async function remover(id) {
    await supabase.from('menu_items').delete().eq('id', id)
    load()
  }

  function nomeItem(item) {
    if (item.tipo === 'pagina') return item.site_pages?.menu_label || '(página removida)'
    if (item.tipo === 'categoria') return item.page_categories?.name || '(categoria removida)'
    return item.label
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Menu do site</h1>
      <p className="mt-1 text-sm text-mist">
        Só o que estiver nessa lista aparece no menu (ícone ☰) do site, na ordem daqui.
      </p>

      <div className="mt-6 space-y-2">
        {itens.length === 0 && <p className="text-sm text-mist">Nenhum item no menu ainda.</p>}
        {itens.map((item, i) => (
          <div key={item.id} className="flex items-center justify-between rounded border border-line p-3">
            <div>
              <span className="text-ink">{nomeItem(item)}</span>
              <span className="ml-2 text-xs uppercase text-mist">{item.tipo}</span>
            </div>
            <div className="flex items-center gap-3">
              <button disabled={i === 0} onClick={() => mover(i, -1)} className="text-mist disabled:opacity-30">▲</button>
              <button disabled={i === itens.length - 1} onClick={() => mover(i, 1)} className="text-mist disabled:opacity-30">▼</button>
              <button onClick={() => remover(item.id)} className="text-sm text-ember">Remover</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded border border-line p-4">
        <h2 className="mb-3 font-semibold text-ink">Adicionar item</h2>

        <div className="mb-3 flex gap-2">
          {[
            ['pagina', 'Página existente'],
            ['categoria', 'Categoria'],
            ['link', 'Link personalizado']
          ].map(([valor, texto]) => (
            <button
              key={valor}
              onClick={() => setTipo(valor)}
              className={`rounded-full border px-3 py-1 text-sm ${tipo === valor ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mist'}`}
            >
              {texto}
            </button>
          ))}
        </div>

        {tipo === 'pagina' && (
          <select className="input" value={pageId} onChange={(e) => setPageId(e.target.value)}>
            <option value="">Escolha uma página...</option>
            {paginas.map((p) => <option key={p.id} value={p.id}>{p.menu_label}</option>)}
          </select>
        )}

        {tipo === 'categoria' && (
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Escolha uma categoria...</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {tipo === 'link' && (
          <div className="space-y-2">
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Texto do item (ex: Fale conosco)" />
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (ex: https://... ou /pagina/algo)" />
          </div>
        )}

        {error && <p className="mt-2 text-sm text-ember">{error}</p>}

        <button onClick={adicionar} className="btn-primary mt-3">+ Adicionar ao menu</button>
      </div>
    </div>
  )
}
