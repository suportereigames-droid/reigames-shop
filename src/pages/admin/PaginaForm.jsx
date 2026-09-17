import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { enviarImagemParaStorage } from '../../lib/uploadImagem.js'

export default function PaginaForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [categoriasPagina, setCategoriasPagina] = useState([])
  const [novaCategoria, setNovaCategoria] = useState('')
  const [form, setForm] = useState({ slug: '', menu_label: '', content_html: '', show_in_menu: true, sort_order: 0, page_category_id: null, image_url: null, gallery_category_id: null, seo_title: '', seo_description: '' })
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('page_categories').select('*').order('sort_order').then(({ data }) => setCategoriasPagina(data || []))
    if (!isEditing) return
    supabase.from('site_pages').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm(data)
      setLoading(false)
    })
  }, [id])

  async function criarCategoria() {
    const nome = novaCategoria.trim()
    if (!nome) return
    const { data, error } = await supabase
      .from('page_categories')
      .insert({ name: nome, sort_order: categoriasPagina.length })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setCategoriasPagina((c) => [...c, data])
    setForm((f) => ({ ...f, page_category_id: data.id }))
    setNovaCategoria('')
  }

  async function enviarImagem(file) {
    if (!file) return
    setEnviandoImagem(true)
    setError('')
    try {
      const path = `paginas/${Date.now()}-${file.name}`
      const url = await enviarImagemParaStorage(supabase, path, file, undefined, form.image_url)
      setForm((f) => ({ ...f, image_url: url }))
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a imagem.')
    } finally {
      setEnviandoImagem(false)
    }
  }

  function gerarSlugValido(texto) {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira acento
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // qualquer coisa que não seja letra/número vira hífen
      .replace(/^-+|-+$/g, '') // tira hífen do início/fim
  }

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const slugLimpo = gerarSlugValido(form.slug)
    const payload = { ...form, slug: slugLimpo }

    const { error } = isEditing
      ? await supabase.from('site_pages').update(payload).eq('id', id)
      : await supabase.from('site_pages').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/admin/paginas')
  }

  if (loading) return <p className="text-mist">Carregando...</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">{isEditing ? 'Editar página' : 'Nova página'}</h1>

      <form onSubmit={salvar} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-mist">Nome que aparece no menu</label>
          <input
            className="input"
            value={form.menu_label}
            onChange={(e) => setForm({ ...form, menu_label: e.target.value })}
            placeholder="Ex: Grupo WhatsApp"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Link da página</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-mist">reigames.com.br/pagina/</span>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="grupo-whatsapp"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">
            Título para o Google <span className="text-xs">(opcional — aparece na aba do navegador e na busca)</span>
          </label>
          <input
            className="input"
            value={form.seo_title || ''}
            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
            placeholder="Ex: Grupo WhatsApp compra e venda de contas EFOOTBALL"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">
            Descrição para o Google <span className="text-xs">(opcional — aparece embaixo do título na busca)</span>
          </label>
          <textarea
            className="input min-h-20 text-sm"
            value={form.seo_description || ''}
            onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
            placeholder="Ex: Compre e venda contas de EFOOTBALL com segurança! Encontre ofertas exclusivas e negocie com outros jogadores."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Agrupar dentro de uma categoria (opcional)</label>
          <select
            className="input"
            value={form.page_category_id || ''}
            onChange={(e) => setForm({ ...form, page_category_id: e.target.value || null })}
          >
            <option value="">Nenhuma</option>
            {categoriasPagina.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-mist">
            Só agrupa visualmente; pra aparecer no menu do site, adicione essa página (ou a categoria) em{' '}
            <a href="/admin/menu" className="underline">Menu do site</a>.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">
            Imagem da página <span className="text-xs">(usada na galeria da categoria, se ela estiver numa)</span>
          </label>

          {form.image_url ? (
            <div>
              <img src={form.image_url} alt="" className="mb-2 h-32 w-full rounded object-cover" />
              <div className="flex items-center gap-3">
                <label className="btn-ghost inline-block cursor-pointer text-sm">
                  {enviandoImagem ? 'Enviando...' : 'Trocar imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      enviarImagem(e.target.files[0])
                    }}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                  className="text-sm text-ember"
                >
                  Remover imagem
                </button>
              </div>
              {!enviandoImagem && <span className="mt-1 inline-block text-xs text-emerald">✓ Imagem enviada</span>}
            </div>
          ) : (
            <label className="btn-ghost inline-block cursor-pointer">
              {enviandoImagem ? 'Enviando...' : 'Escolher imagem'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  enviarImagem(e.target.files[0])
                }}
                className="sr-only"
              />
            </label>
          )}
          {error && <p className="mt-2 text-sm text-ember">{error}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">
            Esta página mostra a galeria de imagens de uma categoria? (opcional)
          </label>
          <select
            className="input"
            value={form.gallery_category_id || ''}
            onChange={(e) => setForm({ ...form, gallery_category_id: e.target.value || null })}
          >
            <option value="">Não — é uma página de código normal</option>
            {categoriasPagina.map((c) => (
              <option key={c.id} value={c.id}>Sim — galeria de "{c.name}"</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-mist">
            Se escolher uma categoria aqui, essa página mostra sozinha a imagem + nome de cada página
            que estiver dentro dela — o código HTML abaixo é ignorado nesse caso.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Código da página (HTML)</label>
          <textarea
            className="input min-h-64 font-mono text-xs"
            value={form.content_html}
            onChange={(e) => setForm({ ...form, content_html: e.target.value })}
            placeholder="<h1>Grupos de WhatsApp</h1>&#10;<a href='https://wa.me/...'>Entrar no grupo</a>"
          />
          <p className="mt-1 text-xs text-mist">
            Cole aqui o código HTML da página (títulos, botões, links, texto). O site mostra
            exatamente esse código na página, no link configurado acima.
          </p>
        </div>

        {error && <p className="text-sm text-ember">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar página'}
        </button>
      </form>
    </div>
  )
}
