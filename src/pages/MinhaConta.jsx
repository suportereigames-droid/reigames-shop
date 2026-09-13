import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABEL = {
  pendente: { texto: 'Aguardando pagamento', cor: 'text-gold' },
  pago: { texto: 'Pago', cor: 'text-emerald' },
  cancelado: { texto: 'Cancelado', cor: 'text-ember' },
  estornado: { texto: 'Estornado', cor: 'text-mist' }
}
const money = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function MinhaConta() {
  const [sessao, setSessao] = useState(null)
  const [linkEnviado, setLinkEnviado] = useState(false)
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pedidos, setPedidos] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSessao(session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSessao(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return
    supabase
      .from('orders')
      .select('id, product_title, product_game, amount, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPedidos(data || []))
  }, [sessao])

  async function enviarLink(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { is_buyer: true },
        emailRedirectTo: `${window.location.origin}/minha-conta`
      }
    })
    setEnviando(false)
    if (error) {
      setErro('Não foi possível enviar o link. Confere o e-mail e tenta de novo.')
      return
    }
    setLinkEnviado(true)
  }

  async function sair() {
    await supabase.auth.signOut()
    setLinkEnviado(false)
    setEmail('')
    setPedidos(null)
  }

  if (sessao) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">Meus pedidos</h1>
          <button onClick={sair} className="text-sm text-mist hover:text-ink">Sair</button>
        </div>

        {pedidos === null ? (
          <p className="mt-6 text-mist">Carregando...</p>
        ) : pedidos.length === 0 ? (
          <p className="mt-6 text-mist">Nenhum pedido encontrado com esse e-mail.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {pedidos.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-4">
                <div>
                  <span className="text-xs uppercase text-emerald">{p.product_game}</span>
                  <p className="font-semibold text-ink">{p.product_title}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gold">{money(p.amount)}</p>
                  <p className={`text-sm ${STATUS_LABEL[p.status]?.cor}`}>{STATUS_LABEL[p.status]?.texto}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-ink">Minha conta</h1>
      <p className="mt-1 text-mist">Consulte seus pedidos com o e-mail usado na compra.</p>

      {!linkEnviado ? (
        <form onSubmit={enviarLink} className="mt-6 space-y-4">
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {erro && <p className="text-sm text-ember">{erro}</p>}
          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? 'Enviando...' : 'Receber link por e-mail'}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-mist">
            Enviamos um link de acesso para <strong>{email}</strong>. Abre o e-mail e clica no link — você
            volta pra essa página já conectado.
          </p>
          <button type="button" onClick={() => setLinkEnviado(false)} className="w-full text-center text-xs text-mist">
            Usar outro e-mail
          </button>
        </div>
      )}
    </div>
  )
}
