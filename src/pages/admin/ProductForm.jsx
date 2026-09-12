import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

const GAMES = ['EFOOTBALL', 'Clash of Clans', 'Clash Royale', 'Brawl Stars', 'Hay Day', 'Wartune Ultra']
const BUCKET = 'product-images'

const emptyForm = { game: GAMES[0], title: '', description: '', price: '', whatsapp: '', status: 'disponivel' }

export default function ProductForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [media, setMedia] = useState([])          // mídia já salva: [{ type, path, url }]
  const [novosArquivos, setNovosArquivos] = useState([]) // File[] escolhidos agora, ainda não enviados
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditing) return
    async function load() {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error || !data) {
        setError('Conta não encontrada ou você não tem permissão para editá-la.')
      } else {
        setForm({
          game: data.game,
          title: data.title,
          description: data.description,
          price: data.price,
          whatsapp: data.whatsapp || '',
          status: data.status
        })
        setMedia(data.media || [])
      }
      setLoading(false)
    }
    load()
  }, [id, isEditing])

  function adicionarArquivos(fileList) {
    setNovosArquivos((prev) => [...prev, ...Array.from(fileList)])
  }

  function removerNovoArquivo(index) {
    setNovosArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  // Apaga a mídia já salva tanto da tela quanto do Storage — se o usuário
  // não salvar de novo, o arquivo já não fica sobrando no bucket.
  async function removerMidiaSalva(index) {
    const item = media[index]
    await supabase.storage.from(BUCKET).remove([item.path])
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  async function enviarNovosArquivos() {
    const enviados = []
    for (const file of novosArquivos) {
      const tipo = file.type.startsWith('video') ? 'video' : 'image'
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      enviados.push({ type: tipo, path, url: data.publicUrl })
    }
    return enviados
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const enviados = await enviarNovosArquivos()
      const payload = {
        game: form.game,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        whatsapp: form.whatsapp,
        status: form.status,
        media: [...media, ...enviados]
      }

      if (isEditing) {
        const { error } = await supabase.from('products').update(payload).eq('id', id)
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
      <h1 className="text-2xl font-bold text-white">{isEditing ? 'Editar conta' : 'Nova conta'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-mist">Jogo</label>
          <select className="input" value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })}>
            {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">WhatsApp para entrega</label>
          <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Fotos e vídeos da conta</label>

          {(media.length > 0 || novosArquivos.length > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={`salvo-${i}`} className="relative h-20 w-28 overflow-hidden rounded border border-line">
                  {m.type === 'video' ? (
                    <video src={m.url} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removerMidiaSalva(i)}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 px-1.5 text-xs text-ember"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {novosArquivos.map((f, i) => (
                <div key={`novo-${i}`} className="relative flex h-20 w-28 items-center justify-center rounded border border-dashed border-gold/60 bg-panel2 px-2 text-center text-xs text-gold">
                  {f.name}
                  <button
                    type="button"
                    onClick={() => removerNovoArquivo(i)}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 px-1.5 text-xs text-ember"
                  >
                    ✕
                  </button>
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
          <p className="mt-1 text-xs text-mist">Pode escolher várias fotos e vídeos juntos.</p>
        </div>

        {error && <p className="text-sm text-ember">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar conta'}
        </button>
      </form>
    </div>
  )
}
