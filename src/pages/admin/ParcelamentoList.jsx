import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ParcelamentoList() {
  const [taxas, setTaxas] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('parcelas_taxas').single().then(({ data }) => {
      setTaxas(data?.parcelas_taxas || {})
    })
  }, [])

  function mudarTaxa(n, valor) {
    setTaxas((t) => ({ ...t, [n]: valor === '' ? 0 : Number(valor) }))
  }

  async function salvar() {
    setSalvando(true)
    setError('')
    const { error } = await supabase.from('site_settings').update({ parcelas_taxas: taxas }).eq('id', true)
    setSalvando(false)
    if (error) {
      setError(error.message)
      return
    }
    alert('Salvo!')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Parcelamento no cartão</h1>
      <p className="mt-1 text-sm text-mist">
        % que soma no preço total conforme o número de parcelas (do jeito que sua maquininha/gateway informa —
        não é taxa mensal composta). Deixe 0 pra "sem juros". Isso é usado na página de cada conta (formas de
        pagamento) e no "em Nx de R$..." mostrado nos cards da vitrine.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <div key={n}>
            <label className="mb-1 block text-xs text-mist">{n}x</label>
            <input
              type="number" step="0.01" min="0" className="input"
              value={taxas[n] ?? ''}
              onChange={(e) => mudarTaxa(n, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      <button onClick={salvar} disabled={salvando} className="btn-primary mt-6">
        {salvando ? 'Salvando...' : 'Salvar parcelamento'}
      </button>
    </div>
  )
}
