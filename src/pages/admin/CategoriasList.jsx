import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { enviarImagemParaStorage } from '../../lib/uploadImagem.js'

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

  async function moverCategoria(index, direcao) {
    const nova = [...categorias]
    const destino = index + direcao
    if (destino < 0 || destino >= nova.length) return
    ;[nova[index], nova[destino]] = [nova[destino], nova[index]]
    setCategorias(nova)
    await Promise.all(nova.map((c, i) => supabase.from('categories').update({ sort_order: i }).eq('id', c.id)))
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
    try {
      const path = `icones/${Date.now()}-${file.name}`
      const url = await enviarImagemParaStorage(supabase, path, file, undefined, categoria.image_url)
      await supabase.from('categories').update({ image_url: url }).eq('id', categoria.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function enviarImagemSubcategoria(sub, file) {
    if (!file) return
    try {
      const path = `icones/${Date.now()}-${file.name}`
      const url = await enviarImagemParaStorage(supabase, path, file, undefined, sub.image_url)
      await supabase.from('subcategories').update({ image_url: url }).eq('id', sub.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  // Atualiza o campo na tela na hora (sem esperar o banco), e salva de
  // verdade quando a pessoa sai do campo (onBlur) — assim não manda uma
  // requisição a cada letra digitada.
  function editarCampoCategoria(categoriaId, campo, valor) {
    setCategorias((atuais) => atuais.map((c) => (c.id === categoriaId ? { ...c, [campo]: valor } : c)))
  }

  async function salvarCampoCategoria(categoriaId, campo, valor) {
    await supabase.from('categories').update({ [campo]: valor }).eq('id', categoriaId)
  }

  function editarCampoSubcategoria(categoriaId, subId, campo, valor) {
    setSubcategoriasPorCategoria((atuais) => ({
      ...atuais,
      [categoriaId]: (atuais[categoriaId] || []).map((s) => (s.id === subId ? { ...s, [campo]: valor } : s)),
    }))
  }

  async function salvarCampoSubcategoria(subId, campo, valor) {
    await supabase.from('subcategories').update({ [campo]: valor }).eq('id', subId)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Categorias e subcategorias</h1>
      <p className="mt-1 text-sm text-mist">
        Usadas no cadastro de contas e nos filtros do site. Cada uma pode ter uma imagem (o ícone
        redondo que aparece na home) e um título/descrição pro Google — abra uma categoria pra ver
        essas opções. Use as setinhas ▲▼ pra mudar a ordem — é a mesma ordem que aparece na home
        do site.
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
        {categorias.map((cat, i) => (
          <div key={cat.id} className="rounded border border-line">
            <div className="flex w-full items-center justify-between p-3">
              <div className="flex flex-col">
                <button
                  disabled={i === 0}
                  onClick={() => moverCategoria(i, -1)}
                  className="text-xs leading-none text-mist disabled:opacity-20"
                >
                  ▲
                </button>
                <button
                  disabled={i === categorias.length - 1}
                  onClick={() => moverCategoria(i, 1)}
                  className="text-xs leading-none text-mist disabled:opacity-20"
                >
                  ▼
                </button>
              </div>
              <button
                onClick={() => setCategoriaAberta(categoriaAberta === cat.id ? null : cat.id)}
                className="flex flex-1 items-center gap-3 pl-3 text-left"
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-panel2" />
                )}
                <span className="font-semibold text-ink">{cat.name}</span>
              </button>
              <div className="flex items-center gap-4 text-sm text-mist">
                <span>{(subcategoriasPorCategoria[cat.id] || []).length} subcategoria(s)</span>
                <label className="btn-ghost cursor-pointer text-xs">
                  Trocar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => enviarImagemCategoria(cat, e.target.files[0])}
                  />
                </label>
                <button onClick={() => excluirCategoria(cat)} className="text-ember">
                  Apagar
                </button>
              </div>
            </div>

            {categoriaAberta === cat.id && (
              <div className="border-t border-line p-3">
                <div className="mb-4 space-y-3 rounded bg-panel2 p-3">
                  <p className="text-xs font-semibold uppercase text-mist">SEO da categoria (opcional)</p>
                  <div>
                    <label className="mb-1 block text-xs text-mist">Título para o Google</label>
                    <input
                      className="input text-sm"
                      value={cat.seo_title || ''}
                      onChange={(e) => editarCampoCategoria(cat.id, 'seo_title', e.target.value)}
                      onBlur={(e) => salvarCampoCategoria(cat.id, 'seo_title', e.target.value)}
                      placeholder={`Ex: Contas de ${cat.name} — REI GAMES`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-mist">Descrição para o Google</label>
                    <textarea
                      className="input min-h-16 text-sm"
                      value={cat.seo_description || ''}
                      onChange={(e) => editarCampoCategoria(cat.id, 'seo_description', e.target.value)}
                      onBlur={(e) => salvarCampoCategoria(cat.id, 'seo_description', e.target.value)}
                      placeholder={`Ex: Compre contas de ${cat.name} com garantia e entrega segura.`}
                    />
                  </div>
                </div>

                {(subcategoriasPorCategoria[cat.id] || []).map((sub) => (
                  <div key={sub.id} className="border-b border-line py-3 last:border-0">
                    <div className="flex items-center justify-between">
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
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        className="input text-xs"
                        value={sub.seo_title || ''}
                        onChange={(e) => editarCampoSubcategoria(cat.id, sub.id, 'seo_title', e.target.value)}
                        onBlur={(e) => salvarCampoSubcategoria(sub.id, 'seo_title', e.target.value)}
                        placeholder="Título para o Google (opcional)"
                      />
                      <input
                        className="input text-xs"
                        value={sub.seo_description || ''}
                        onChange={(e) => editarCampoSubcategoria(cat.id, sub.id, 'seo_description', e.target.value)}
                        onBlur={(e) => salvarCampoSubcategoria(sub.id, 'seo_description', e.target.value)}
                        placeholder="Descrição para o Google (opcional)"
                      />
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
