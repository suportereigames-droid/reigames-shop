import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

function PainelMembro({ membro, onFechar, onAtualizado }) {
  const [aba, setAba] = useState('conta') // 'conta' | 'loja'
  const [ativo, setAtivo] = useState(!membro.frozen)
  const [whatsapp, setWhatsapp] = useState('')
  const [loja, setLoja] = useState({ slug: '', display_name: '', titulo: '', logo_url: '' , frases: ''})
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    async function carregar() {
      const [{ data: perfil }, { data: pagina }] = await Promise.all([
        supabase.from('profiles').select('whatsapp').eq('id', membro.id).single(),
        supabase.from('seller_pages').select('*').eq('seller_id', membro.id).single()
      ])
      setWhatsapp(perfil?.whatsapp || '')
      setLoja({
        slug: pagina?.slug || '',
        display_name: pagina?.display_name || membro.full_name,
        titulo: pagina?.titulo || '',
        logo_url: pagina?.logo_url || '',
        frases: pagina?.frases || ''
      })
      setCarregando(false)
    }
    carregar()
  }, [membro.id])

  async function chamarAcao(action, extra = {}) {
    setError('')
    setProcessando(true)
    try {
      const { data: sessao } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('manage-team-member', {
        body: { action, memberId: membro.id, ...extra },
        headers: { Authorization: `Bearer ${sessao.session.access_token}` }
      })
      if (error || data?.error) {
        setError(data?.error || error?.message || 'Não foi possível concluir.')
        return false
      }
      return true
    } finally {
      setProcessando(false)
    }
  }

  async function alternarStatus() {
    const vaiAtivar = !ativo
    const sucesso = await chamarAcao(vaiAtivar ? 'unfreeze' : 'freeze')
    if (sucesso) {
      setAtivo(vaiAtivar)
      onAtualizado()
    }
  }

  async function salvarWhatsapp() {
    setProcessando(true)
    const { error } = await supabase.from('profiles').update({ whatsapp }).eq('id', membro.id)
    setProcessando(false)
    if (!error) { setOk('Salvo!'); setTimeout(() => setOk(''), 2000) }
  }

  async function enviarLogo(file) {
    if (!file) return
    setEnviandoLogo(true)
    setError('')
    const path = `lojas/${membro.id}-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file)
    setEnviandoLogo(false)
    if (uploadError) { setError(uploadError.message); return }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setLoja((l) => ({ ...l, logo_url: data.publicUrl }))
  }

  async function salvarLoja() {
    setProcessando(true)
    setError('')
    setOk('')
    const slugLimpo = loja.slug.trim().toLowerCase().replace(/\s+/g, '-')
    const { error } = await supabase.from('seller_pages').upsert({
      seller_id: membro.id,
      slug: slugLimpo,
      display_name: loja.display_name || membro.full_name,
      titulo: loja.titulo || null,
      logo_url: loja.logo_url || null,
      frases: loja.frases || null
    })
    setProcessando(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'Esse link já está em uso, escolhe outro.' : error.message)
      return
    }
    setLoja((l) => ({ ...l, slug: slugLimpo }))
    setOk('Salvo! O link já está no ar.')
  }

  async function trocarEmail() {
    if (!novoEmail.trim()) return
    const sucesso = await chamarAcao('update-email', { newEmail: novoEmail.trim() })
    if (sucesso) { setOk('E-mail atualizado!'); setNovoEmail('') }
  }

  async function trocarSenha() {
    if (novaSenha.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return }
    const sucesso = await chamarAcao('update-password', { newPassword: novaSenha })
    if (sucesso) { setOk('Senha atualizada!'); setNovaSenha('') }
  }

  async function excluir() {
    if (!confirm(`Tem certeza que quer excluir o login de ${membro.full_name}? Essa ação não pode ser desfeita.`)) return
    const sucesso = await chamarAcao('delete')
    if (sucesso) { onAtualizado(); onFechar() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">{membro.full_name}</h2>
          <button onClick={onFechar} className="text-mist">✕</button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded border border-line p-3">
          <span className="text-sm text-ink">Status da conta</span>
          <button
            onClick={alternarStatus}
            disabled={processando}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${ativo ? 'bg-emerald/15 text-emerald' : 'bg-ember/15 text-ember'}`}
          >
            {ativo ? '● Ativo' : '○ Inativo'}
          </button>
        </div>
        {!ativo && <p className="mb-4 text-xs text-mist">Enquanto inativo, essa pessoa não consegue fazer login.</p>}

        <Link to={`/admin/produtos?seller=${membro.id}`} className="mb-4 block text-sm text-gold underline">
          Ver contas dessa pessoa →
        </Link>

        <div className="mb-4 flex gap-2 border-b border-line">
          <button onClick={() => setAba('conta')} className={`pb-2 text-sm font-semibold ${aba === 'conta' ? 'border-b-2 border-gold text-ink' : 'text-mist'}`}>Conta</button>
          <button onClick={() => setAba('loja')} className={`pb-2 text-sm font-semibold ${aba === 'loja' ? 'border-b-2 border-gold text-ink' : 'text-mist'}`}>Loja pessoal</button>
        </div>

        {carregando ? (
          <p className="text-sm text-mist">Carregando...</p>
        ) : aba === 'conta' ? (
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-sm text-mist">WhatsApp</label>
              <div className="flex gap-2">
                <input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(DDD) 9 9999-9999" />
                <button onClick={salvarWhatsapp} disabled={processando} className="btn-ghost whitespace-nowrap">Salvar</button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-mist">Trocar e-mail</label>
              <div className="flex gap-2">
                <input className="input" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} placeholder="novo@email.com" autoCapitalize="none" />
                <button onClick={trocarEmail} disabled={processando} className="btn-ghost whitespace-nowrap">Trocar</button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-mist">Trocar senha</label>
              <div className="flex gap-2">
                <input type="password" className="input" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
                <button onClick={trocarSenha} disabled={processando} className="btn-ghost whitespace-nowrap">Trocar</button>
              </div>
            </div>

            <button onClick={excluir} className="text-sm text-ember">Excluir membro</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-mist">Link personalizado</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-mist">reigames.com.br/</span>
                <input className="input" value={loja.slug} onChange={(e) => setLoja({ ...loja, slug: e.target.value })} placeholder="nome-da-pessoa" autoCapitalize="none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-mist">Título da loja</label>
              <input className="input" value={loja.titulo} onChange={(e) => setLoja({ ...loja, titulo: e.target.value })} placeholder="Ex: Loja da Mika" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-mist">Logo</label>
              {loja.logo_url && <img src={loja.logo_url} alt="" className="mb-2 h-16 w-16 rounded-full border border-line object-cover" />}
              <label className="btn-ghost inline-block cursor-pointer">
                {enviandoLogo ? 'Enviando...' : loja.logo_url ? 'Trocar logo' : 'Escolher logo'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => enviarLogo(e.target.files[0])} />
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm text-mist">Frases</label>
              <textarea className="input min-h-20" value={loja.frases} onChange={(e) => setLoja({ ...loja, frases: e.target.value })} placeholder={'Entrega rápida\nContas com garantia'} />
              <p className="mt-1 text-xs text-mist">Uma frase por linha — aparecem do lado da logo.</p>
            </div>
            <button onClick={salvarLoja} disabled={processando} className="btn-primary">
              {processando ? 'Salvando...' : 'Salvar loja'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-ember">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald">{ok}</p>}
      </div>
    </div>
  )
}

export default function EquipeList() {
  const { isAdmin } = useAuth()
  const [membros, setMembros] = useState([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'membro' })
  const [membroSelecionado, setMembroSelecionado] = useState(null)

  async function load() {
    const { data: perfis } = await supabase.from('profiles').select('id, full_name, role, frozen').order('full_name')
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
          <button
            key={m.id}
            onClick={() => (isAdmin ? setMembroSelecionado(m) : null)}
            className="flex w-full items-center justify-between rounded border border-line p-4 text-left transition-colors hover:border-gold/60"
          >
            <div>
              <p className="font-semibold text-ink">{m.full_name}</p>
              <p className="text-xs text-mist">
                {m.role === 'admin' ? 'admin' : 'membro da equipe'} · {m.frozen ? 'inativo' : 'ativo'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gold">{m.total} contas</p>
              <p className="text-xs text-mist">{m.disponivel} disponíveis · {m.vendido} vendidas</p>
            </div>
          </button>
        ))}
      </div>

      {membroSelecionado && (
        <PainelMembro
          membro={membroSelecionado}
          onFechar={() => setMembroSelecionado(null)}
          onAtualizado={load}
        />
      )}
    </div>
  )
}
