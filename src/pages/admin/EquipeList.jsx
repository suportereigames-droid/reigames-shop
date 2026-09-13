import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function EquipeList() {
  const { isAdmin } = useAuth()
  const [membros, setMembros] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'membro' })

  async function load() {
    const { data: perfis } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    const { data: produtos } = await supabase.from('products').select('created_by, status')
    const { data: pedidos } = await supabase.from('orders').select('seller_id, status').eq('status', 'pago')

    const resumo = (perfis || []).map((p) => {
      const dele = (produtos || []).filter((pr) => pr.created_by === p.id)
      const vendasDele = (pedidos || []).filter((o) => o.seller_id === p.id)
      return {
        ...p,
        total: dele.length,
        disponivel: dele.filter((pr) => pr.status === 'disponivel').length,
        vendido: vendasDele.length
      }
    })
    setMembros(resumo)
  }

  useEffect(() => { load() }, [])

  async function criarMembro(e) {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Preencha nome, e-mail e senha.')
      return
    }
    setError('')
    setSalvando(true)
    try {
      const { data: sessao } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role
        },
        headers: { Authorization: `Bearer ${sessao.session.access_token}` }
      })
      if (error || data?.error) {
        setError(data?.error || error?.message || 'Não foi possível criar.')
        return
      }
      setForm({ fullName: '', email: '', password: '', role: 'membro' })
      setMostrarForm(false)
      load()
    } finally {
      setSalvando(false)
    }
  }

  if (mostrarForm) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-ink">Adicionar membro da equipe</h1>

        <form onSubmit={criarMembro} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-mist">Nome</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">E-mail (vai usar pra fazer login)</label>
            <input
              type="email" className="input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">Senha (mínimo 6 caracteres)</label>
            <input
              type="password" className="input" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-mist">Você define essa senha agora e já passa pronta pra pessoa — ela pode trocar depois.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">Cargo</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="membro">Membro da equipe</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-1 text-xs text-mist">Admin vê tudo (todas as contas, pedidos e vendas). Membro só vê o que ele mesmo postar.</p>
          </div>

          {error && <p className="text-sm text-ember">{error}</p>}

          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Criando...' : 'Criar login'}
          </button>
          <button type="button" onClick={() => setMostrarForm(false)} className="ml-3 text-sm text-mist">
            Cancelar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Equipe</h1>
        {isAdmin && (
          <button onClick={() => setMostrarForm(true)} className="btn-primary">
            + Adicionar membro da equipe
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {membros.map((m) => (
          <Link
            key={m.id}
            to={`/admin/produtos?seller=${m.id}`}
            className="flex items-center justify-between rounded border border-line p-4 transition-colors hover:border-gold/60"
          >
            <div>
              <p className="font-semibold text-ink">{m.full_name}</p>
              <p className="text-xs text-mist">{m.role === 'admin' ? 'admin' : 'membro da equipe'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gold">{m.total} contas</p>
              <p className="text-xs text-mist">{m.disponivel} disponíveis · {m.vendido} vendidas</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
