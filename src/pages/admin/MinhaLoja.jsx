import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function MinhaLoja() {
  const { user, profile, isAdmin } = useAuth()
  const [membros, setMembros] = useState([])
  const [alvoId, setAlvoId] = useState(user?.id)
  const [form, setForm] = useState({ slug: '', display_name: '', titulo: '', logo_url: '', frases: '', banner_text: '', banner_video_url: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [error, setError] = useState('')
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('id, full_name').order('full_name').then(({ data }) => setMembros(data || []))
    }
  }, [isAdmin])

  useEffect(() => {
    if (!alvoId) return
    setLoading(true)
    setSalvo(false)
    supabase
      .from('seller_pages')
      .select('*')
      .eq('seller_id', alvoId)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            slug: data.slug,
            display_name: data.display_name,
            titulo: data.titulo || '',
            logo_url: data.logo_url || '',
            frases: data.frases || '',
            banner_text: data.banner_text || '',
            banner_video_url: data.banner_video_url || ''
          })
        } else {
          const nome = alvoId === user?.id ? profile?.full_name || '' : membros.find((m) => m.id === alvoId)?.full_name || ''
          setForm({ slug: '', display_name: nome, titulo: '', logo_url: '', frases: '', banner_text: '', banner_video_url: '' })
        }
        setLoading(false)
      })
  }, [alvoId])

  async function enviarLogo(file) {
    if (!file) return
    setEnviandoLogo(true)
    setError('')
    try {
      const path = `lojas/${alvoId}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      setForm((f) => ({ ...f, logo_url: data.publicUrl }))
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a logo.')
    } finally {
      setEnviandoLogo(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSalvo(false)
    const slugLimpo = form.slug.trim().toLowerCase().replace(/\s+/g, '-')
    const { error } = await supabase.from('seller_pages').upsert({
      seller_id: alvoId,
      slug: slugLimpo,
      display_name: form.display_name,
      titulo: form.titulo || null,
      logo_url: form.logo_url || null,
      frases: form.frases || null,
      banner_text: form.banner_text,
      banner_video_url: form.banner_video_url
    })
    setSaving(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'Esse link já está em uso, escolha outro.' : 'Não foi possível salvar.')
      return
    }
    setForm((f) => ({ ...f, slug: slugLimpo }))
    setSalvo(true)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Minha loja</h1>
      <p className="mt-1 text-mist">
        Configure o link pessoal que mostra só as suas contas — ex: reigames.com.br/{form.slug || 'seu-link'}
      </p>

      {isAdmin && (
        <div className="mt-4">
          <label className="mb-1 block text-sm text-mist">Editando a loja de</label>
          <select className="input" value={alvoId} onChange={(e) => setAlvoId(e.target.value)}>
            <option value={user.id}>Você (admin)</option>
            {membros.filter((m) => m.id !== user.id).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-mist">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-mist">Link personalizado</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-mist">reigames.com.br/</span>
              <input
                className="input"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="nome-da-pessoa"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Nome de exibição (uso interno, aparece só nessa lista de "Editando a loja de")</label>
            <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Título da loja</label>
            <input
              className="input"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Loja da Mika"
            />
            <p className="mt-1 text-xs text-mist">Esse é o título que aparece de verdade no topo da página. Escreve do jeito que preferir.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Logo (opcional)</label>
            {form.logo_url && <img src={form.logo_url} alt="" className="mb-2 h-16 w-auto" />}
            <label className="btn-ghost inline-block cursor-pointer">
              {enviandoLogo ? 'Enviando...' : form.logo_url ? 'Trocar logo' : 'Escolher logo'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => enviarLogo(e.target.files[0])} />
            </label>
            {form.logo_url && (
              <button type="button" onClick={() => setForm({ ...form, logo_url: '' })} className="ml-3 text-sm text-ember">
                Remover
              </button>
            )}
            <p className="mt-1 text-xs text-mist">Aparece embaixo do título.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Frases (opcional)</label>
            <textarea
              className="input min-h-20"
              value={form.frases}
              onChange={(e) => setForm({ ...form, frases: e.target.value })}
              placeholder={'Entrega rápida\nContas com garantia'}
            />
            <p className="mt-1 text-xs text-mist">Uma frase por linha — aparecem do lado da logo.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Texto de destaque (opcional)</label>
            <textarea className="input min-h-20" value={form.banner_text} onChange={(e) => setForm({ ...form, banner_text: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-mist">Vídeo de destaque — link direto do vídeo (opcional)</label>
            <input className="input" value={form.banner_video_url} onChange={(e) => setForm({ ...form, banner_video_url: e.target.value })} placeholder="https://..." />
          </div>

          {error && <p className="text-sm text-ember">{error}</p>}
          {salvo && <p className="text-sm text-emerald">Salvo! O link já está no ar.</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar loja'}
          </button>
        </form>
      )}
    </div>
  )
}
