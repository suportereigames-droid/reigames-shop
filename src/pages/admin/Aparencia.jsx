import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const BUCKET = 'product-images' // mesmo bucket já criado, funciona pra qualquer imagem

export default function Aparencia() {
  const [logoUrl, setLogoUrl] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    supabase.from('site_settings').select('logo_url').single().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url)
    })
  }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    setSalvo(false)
    let url = logoUrl

    if (arquivo) {
      const path = `logo/${Date.now()}-${arquivo.name}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arquivo)
      if (!uploadError) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        url = data.publicUrl
      }
    }

    await supabase.from('site_settings').update({ logo_url: url }).eq('id', true)
    setLogoUrl(url)
    setSaving(false)
    setSalvo(true)
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-ink">Aparência do site</h1>
      <p className="mt-1 text-mist">Troque a logo que aparece no topo do site.</p>

      <form onSubmit={salvar} className="mt-6 space-y-4">
        {logoUrl && (
          <div>
            <p className="mb-1 text-sm text-mist">Logo atual</p>
            <img src={logoUrl} alt="logo atual" className="h-14 w-auto rounded bg-panel2 p-2" />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-mist">Nova logo (imagem)</label>
          <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files?.[0] || null)} className="text-sm text-mist" />
        </div>

        {salvo && <p className="text-sm text-emerald">Logo atualizada!</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar logo'}
        </button>
      </form>
    </div>
  )
}
