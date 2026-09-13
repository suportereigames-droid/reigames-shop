import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

const BUCKET = 'product-images'

const emptyForm = { game: '', subcategory: '', title: '', description: '', price: '', compare_price: '', whatsapp: '', status: 'disponivel' }

export default function ProductForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [membros, setMembros] = useState([])
  const [donoId, setDonoId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
      setCategorias(cats || [])

      if (isAdmin) {
        const { data: perfis } = await supabase.from('profiles').select('id, full_name').order('full_name')
        setMembros(perfis || [])
      }

      if (isEditing) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
        if (error || !data) {
          setError('Conta não encontrada ou você não tem permissão para editá-la.')
        } else {
          setForm({
            game: data.game,
            subcategory: data.subcategory || '',
            title: data.title,
            description: data.description,
            price: data.price,
            compare_price: data.compare_price ?? '',
            whatsapp: data.whatsapp || '',
            status: data.status
          })
          setDonoId(data.created_by || '')
          setItens(
            (data.media || []).map((m) => ({ id: m.path, kind: 'existente', type: m.type, path: m.path, url: m.url }))
          )
        }
      } else if (cats?.length) {
        setForm((f) => ({ ...f, game: cats[0].name }))
      }
      setLoading(false)
    }
    carregar()
  }, [id, isEditing, isAdmin])

  useEffect(() => {
    const categoriaAtual = categorias.find((c) => c.name === form.game)
    if (!categoriaAtual) {
      setSubcategorias([])
      return
    }
    supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoriaAtual.id)
      .order('sort_order')
      .then(({ data }) => setSubcategorias(data || []))
  }, [form.game, categorias])

  function adicionarArquivos(fileList) {
    const novos = Array.from(fileList).map((file) => ({
      id: `novo-${Date.now()}-${Math.random()}`,
      kind: 'novo',
      type: file.type.startsWith('video') ? 'video' : 'image',
      file,
      url: URL.createObjectURL(file)
    }))
    setItens((prev) => [...prev, ...novos])
  }

  async function removerItem(item) {
    if (item.kind === 'existente') {
      await supabase.storage.from(BUCKET).remove([item.path])
    }
    setItens((prev) => prev.filter((i) => i.id !== item.id))
  }

  function moverItem(index, direcao) {
    setItens((prev) => {
      const novaLista = [...prev]
      const destino = index + direcao
      if (destino < 0 || destino >= novaLista.length) return prev
      ;[novaLista[index], novaLista[destino]] = [novaLista[destino], novaLista[index]]
      return novaLista
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const mediaFinal = []
      for (const item of itens) {
        if (item.kind === 'existente') {
          mediaFinal.push({ type: item.type, path: item.path, url: item.url })
        } else {
          const path = `${user.id}/${Date.now()}-${item.file.name}`
          const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file)
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
          mediaFinal.push({ type: item.type, path, url: data.publicUrl })
        }
      }

      const payload = {
        game: form.game,
        subcategory: form.subcategory || null,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        whatsapp: form.whatsapp,
        status: form.status,
        media: mediaFinal
      }

      if (isEditing) {
        const payloadFinal = isAdmin && donoId ? { ...payload, created_by: donoId } : payload
        const { error } = await supabase.from('products').update(payloadFinal).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, created_by: user.id })
        if (error) throw error
      }
      navigate('/admin/produtos')
    } catch (err) {
      setError('Não foi possível salvar. Verifique os campos e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-mist">Carregando...</p>

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink">{isEditing ? 'Editar conta' : 'Nova conta'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-mist">Categoria</label>
          <select className="input" value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value, subcategory: '' })}>
            {categorias.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {categorias.length === 0 && (
            <p className="mt-1 text-xs text-mist">Nenhuma categoria cadastrada — crie uma no app, na aba Site.</p>
          )}
        </div>

        {subcategorias.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-mist">Subcategoria (opcional)</label>
            <select className="input" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })}>
              <option value="">Nenhuma</option>
              {subcategorias.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-mist">Título do anúncio</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder='Ex: "Conta EFOOTBALL nível 40, elenco completo"'
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Descrição</label>
          <textarea
            className="input min-h-28"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Preço de comparação (opcional)</label>
          <input
            type="number" step="0.01" min="0" className="input"
            value={form.compare_price ?? ''}
            onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
            placeholder="Ex: 800.00"
          />
          <p className="mt-1 text-xs text-mist">
            Preço "de", riscado — mostra o desconto (% OFF) no card. Deixe em branco pra não mostrar desconto.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Preço (R$)</label>
          <input
            type="number" step="0.01" min="0" className="input"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="oculto">Oculto</option>
          </select>
        </div>

        {isAdmin && isEditing && membros.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-mist">Essa conta é de quem?</label>
            <select className="input" value={donoId} onChange={(e) => setDonoId(e.target.value)}>
              {membros.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-mist">
              Útil pra corrigir contas importadas em massa que caíram todas no seu nome.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-mist">Fotos e vídeos da conta</label>
          <p className="mb-2 text-xs text-mist">
            A primeira da lista é a que aparece na vitrine. Use as setinhas pra mudar a ordem.
          </p>

          {itens.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {itens.map((item, i) => (
                <div key={item.id} className="relative h-24 w-32 overflow-hidden rounded border border-line bg-panel2">
                  {item.type === 'video' ? (
                    <video src={item.url} muted className="h-full w-full object-contain" />
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-contain" />
                  )}
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-gold px-1.5 text-[10px] font-bold text-ink">CAPA</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removerItem(item)}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 px-1.5 text-xs text-white"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moverItem(i, -1)}
                      className="rounded bg-ink/80 px-1.5 text-xs text-white disabled:opacity-30"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={i === itens.length - 1}
                      onClick={() => moverItem(i, 1)}
                      className="rounded bg-ink/80 px-1.5 text-xs text-white disabled:opacity-30"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => adicionarArquivos(e.target.files)}
            className="text-sm text-mist"
          />
        </div>

        {error && <p className="text-sm text-ember">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar conta'}
        </button>
      </form>
    </div>
  )
}
