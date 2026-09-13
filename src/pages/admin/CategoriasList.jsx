import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function CategoriasList() {
  const [categorias, setCategorias] = useState([])
  const [subcategoriasPorCategoria, setSubcategoriasPorCategoria] = useState({})
  const [categoriaAberta, setCategoriaAberta] = useState(null)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novaSubcategoria, setNovaSubcategoria] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
    const { data: subs } = await supabase.from('subcategories').select('*').order('sort_order')
    setCategorias(cats || [])
    const agrupado = {}
    ;(subs || []).forEach((s) => {
      if (!agrupado[s.category_id]) agrupado[s.category_id] = []
      agrupado[s.category_id].push(s)
    })
    setSubcategoriasPorCategoria(agrupado)
  }

  useEffect(() => { load() }, [])

  async function criarCategoria() {
    const nome = novaCategoria.trim()
    if (!nome) return
    setError('')
    const { error } = await supabase.from('categories').insert({ name: nome, sort_order: categorias.length })
    if (error) {
      setError(error.message)
      return
    }
    setNovaCategoria('')
    load()
  }

  async function excluirCategoria(categoria) {
    if (!confirm(`Apagar "${categoria.name}"? As subcategorias dela também somem.`)) return
    await supabase.from('categories').delete().eq('id', categoria.id)
    load()
  }

  async function criarSubcategoria(categoriaId) {
    const nome = novaSubcategoria.trim()
    if (!nome) return
    setError('')
    const atuais = subcategoriasPorCategoria[categoriaId] || []
    const { error } = await supabase.from('subcategories').insert({ category_id: categoriaId, name: nome, sort_order: atuais.length })
    if (error) {
      setError(error.message)
      return
    }
    setNovaSubcategoria('')
    load()
  }

  async function excluirSubcategoria(id) {
    await supabase.from('subcategories').delete().eq('id', id)
    load()
  }

  async function enviarImagemCategoria(categoria, file) {
    if (!file) return
    const path = `icones/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) {
      setError(error.message)
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    await supabase.from('categories').update({ image_url: data.publicUrl }).eq('id', categoria.id)
    load()
  }

  async function enviarImagemSubcategoria(sub, file) {
    if (!file) return
    const path = `icones/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) {
      setError(error.message)
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    await supabase.from('subcategories').update({ image_url: data.publicUrl }).eq('id', sub.id)
    load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Categorias e subcategorias</h1>
      <p className="mt-1 text-sm text-mist">
        Usadas no cadastro de contas e nos filtros do site. Cada uma pode ter uma imagem (o ícone
        redondo que aparece na home).
      </p>

      <div className="mt-6 flex gap-2">
        <input
          className="input"
          value={novaCategoria}
          onChange={(e) => setNovaCategoria(e.target.value)}
          placeholder="Nova categoria (ex: EFOOTBALL)"
        />
        <button onClick={criarCategoria} className="btn-primary whitespace-nowrap">+ Criar</button>
      </div>
      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <div className="mt-6 space-y-3">
        {categorias.map((cat) => (
          <div key={cat.id} className="rounded border border-line">
            <button
              onClick={() => setCategoriaAberta(categoriaAberta === cat.id ? null : cat.id)}
              className="flex w-full items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-3">
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-panel2" />
                )}
                <span className="font-semibold text-ink">{cat.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-mist">
                <span>{(subcategoriasPorCategoria[cat.id] || []).length} subcategoria(s)</span>
                <label className="btn-ghost cursor-pointer text-xs" onClick={(e) => e.stopPropagation()}>
                  Trocar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => enviarImagemCategoria(cat, e.target.files[0])}
                  />
                </label>
                <button onClick={(e) => { e.stopPropagation(); excluirCategoria(cat) }} className="text-ember">
                  Apagar
                </button>
              </div>
            </button>

            {categoriaAberta === cat.id && (
              <div className="border-t border-line p-3">
                {(subcategoriasPorCategoria[cat.id] || []).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between border-b border-line py-2 last:border-0">
                    <div className="flex items-center gap-3">
                      {sub.image_url ? (
                        <img src={sub.image_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-panel2" />
                      )}
                      <span className="text-ink">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <label className="btn-ghost cursor-pointer text-xs">
                        Trocar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => enviarImagemSubcategoria(sub, e.target.files[0])}
                        />
                      </label>
                      <button onClick={() => excluirSubcategoria(sub.id)} className="text-ember">Remover</button>
                    </div>
                  </div>
                ))}
                <div className="mt-3 flex gap-2">
                  <input
                    className="input"
                    value={novaSubcategoria}
                    onChange={(e) => setNovaSubcategoria(e.target.value)}
                    placeholder="Nova subcategoria"
                  />
                  <button onClick={() => criarSubcategoria(cat.id)} className="btn-ghost whitespace-nowrap">+ Criar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
