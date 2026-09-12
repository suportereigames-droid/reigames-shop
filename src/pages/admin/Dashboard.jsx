import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const [counts, setCounts] = useState({ disponivel: 0, reservado: 0, vendido: 0 })

  useEffect(() => {
    async function load() {
      // A RLS já filtra automaticamente: membro só vê o que criou, admin vê tudo.
      const { data } = await supabase.from('products').select('status')
      if (!data) return
      const next = { disponivel: 0, reservado: 0, vendido: 0 }
      data.forEach((p) => {
        if (next[p.status] !== undefined) next[p.status] += 1
      })
      setCounts(next)
    }
    load()
  }, [])

  const cards = [
    { label: 'Disponíveis', value: counts.disponivel, color: 'text-emerald' },
    { label: 'Reservadas', value: counts.reservado, color: 'text-gold' },
    { label: 'Vendidas', value: counts.vendido, color: 'text-mist' }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Visão geral</h1>
      <p className="mt-1 text-mist">
        {isAdmin ? 'Resumo de todas as contas cadastradas pela equipe.' : 'Resumo das contas que você postou.'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-6">
            <p className="text-sm text-mist">{c.label}</p>
            <p className={`mt-2 text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
