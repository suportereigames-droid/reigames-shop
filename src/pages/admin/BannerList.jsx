import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function BannerList() {
  const [banners, setBanners] = useState([])
  const [categoriasPagina, setCategoriasPagina] = useState([])
  const [frases, setFrases] = useState('')
  const [frasesVelocidade, setFrasesVelocidade] = useState(20)
  const [bannerIntervalo, setBannerIntervalo] = useState(4)
  const [parceriasCategoriaId, setParceriasCategoriaId] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: bnrs }, { data: cats }, { data: settings }] = await Promise.all([
      supabase.from('banner_slides').select('*').order('sort_order'),
      supabase.from('page_categories').select('*').order('sort_order'),
      supabase.from('site_settings').select('frases_rotativas, frases_velocidade, parcerias_categoria_id, banner_intervalo').single()
    ])
    setBanners(bnrs || [])
    setCategoriasPagina(cats || [])
    setFrases(settings?.frases_rotativas || '')
    setFrasesVelocidade(settings?.frases_velocidade || 20)
    setBannerIntervalo(settings?.banner_intervalo || 4)
    setParceriasCategoriaId(settings?.parcerias_categoria_id || null)
  }

  useEffect(() => { load() }, [])

  async function adicionarBanner(file) {
    if (!file) return
    setError('')
    const path = `icones/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    const { error } = await supabase.from('banner_slides').insert({ image_url: data.publicUrl, sort_order: banners.length })
    if (error) {
      setError(error.message)
      return
    }
    load()
  }

  async function moverBanner(index, direcao) {
    const nova = [...banners]
    const destino = index + direcao
    if (destino < 0 || destino >= nova.length) return
    ;[nova[index], nova[destino]] = [nova[destino], nova[index]]
    setBanners(nova)
    await Promise.all(nova.map((b, i) => supabase.from('banner_slides').update({ sort_order: i }).eq('id', b.id)))
  }

  async function excluirBanner(id) {
    await supabase.from('banner_slides').delete().eq('id', id)
    load()
  }

  async function salvar() {
    setSalvando(true)
    setError('')
    const { error } = await supabase
      .from('site_settings')
      .update({
        frases_rotativas: frases || null,
        frases_velocidade: Number(frasesVelocidade) || 20,
        banner_intervalo: Number(bannerIntervalo) || 4,
        parcerias_categoria_id: parceriasCategoriaId,
      })
      .eq('id', true)
    setSalvando(false)
    if (error) {
      setError(error.message)
      return
    }
    alert('Salvo!')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Banner e Parcerias</h1>

      <h2 className="mt-6 font-semibold text-ink">Banners do topo da home</h2>
      <p className="text-sm text-mist">As imagens giram automaticamente, na ordem daqui.</p>

      <div className="mt-3 space-y-2">
        {banners.map((b, i) => (
          <div key={b.id} className="flex items-center justify-between rounded border border-line p-2">
            <img src={b.image_url} alt="" className="h-12 w-24 rounded object-cover" />
            <div className="flex items-center gap-3 text-sm">
              <button disabled={i === 0} onClick={() => moverBanner(i, -1)} className="text-mist disabled:opacity-30">▲</button>
              <button disabled={i === banners.length - 1} onClick={() => moverBanner(i, 1)} className="text-mist disabled:opacity-30">▼</button>
              <button onClick={() => excluirBanner(b.id)} className="text-ember">Remover</button>
            </div>
          </div>
        ))}
      </div>

      <label className="btn-ghost mt-3 inline-block cursor-pointer">
        + Adicionar banner
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => adicionarBanner(e.target.files[0])} />
      </label>
      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <label className="mb-1 mt-4 block text-xs text-mist">Tempo pra trocar de banner (segundos)</label>
      <input
        type="number" min="2" max="30" className="input max-w-[160px]"
        value={bannerIntervalo}
        onChange={(e) => setBannerIntervalo(e.target.value)}
      />

      <h2 className="mt-8 font-semibold text-ink">Frases rotativas</h2>
      <p className="text-sm text-mist">Uma frase por linha — ficam girando embaixo do banner, na home.</p>
      <textarea
        className="input mt-2 min-h-24"
        value={frases}
        onChange={(e) => setFrases(e.target.value)}
        placeholder={'REI GAMES 🎮\nCompra 100% segura'}
      />

      <label className="mb-1 mt-3 block text-xs text-mist">Velocidade da rolagem (segundos por volta completa)</label>
      <input
        type="number" min="5" max="60" className="input max-w-[160px]"
        value={frasesVelocidade}
        onChange={(e) => setFrasesVelocidade(e.target.value)}
      />
      <p className="mt-1 text-xs text-mist">Número menor = mais rápido. Número maior = mais devagar.</p>

      <h2 className="mt-8 font-semibold text-ink">Seção "Parcerias" na home</h2>
      <p className="text-sm text-mist">
        Escolha uma categoria de página pra usar como "Parcerias" (mostra as páginas dela com imagem
        redonda).
      </p>
      <select className="input mt-2" value={parceriasCategoriaId || ''} onChange={(e) => setParceriasCategoriaId(e.target.value || null)}>
        <option value="">Nenhuma</option>
        {categoriasPagina.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <button onClick={salvar} disabled={salvando} className="btn-primary mt-6">
        {salvando ? 'Salvando...' : 'Salvar frases e parcerias'}
      </button>
    </div>
  )
}
