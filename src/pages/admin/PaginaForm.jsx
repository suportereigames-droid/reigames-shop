import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function PaginaForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState({ slug: '', menu_label: '', content_html: '', show_in_menu: true, sort_order: 0 })
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return
    supabase.from('site_pages').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm(data)
      setLoading(false)
    })
  }, [id])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const slugLimpo = form.slug.trim().toLowerCase().replace(/\s+/g, '-')
    const payload = { ...form, slug: slugLimpo }

    const { error } = isEditing
      ? await supabase.from('site_pages').update(payload).eq('id', id)
      : await supabase.from('site_pages').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'Já existe uma página com esse link.' : 'Não foi possível salvar.')
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

        <label className="flex items-center gap-2 text-sm text-mist">
          <input
            type="checkbox"
            checked={form.show_in_menu}
            onChange={(e) => setForm({ ...form, show_in_menu: e.target.checked })}
          />
          Mostrar essa página no menu do topo
        </label>

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
