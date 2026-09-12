import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [aguardando, setAguardando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const orderIdRef = useRef(null)
  const intervaloRef = useRef(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, title, price, status')
      .eq('id', id)
      .single()
      .then(({ data }) => setProduct(data))
  }, [id])

  async function checarStatus() {
    if (!orderIdRef.current) return
    setVerificando(true)
    const { data: status } = await supabase.rpc('pedido_status', { pedido_id: orderIdRef.current })
    setVerificando(false)
    if (status === 'pago') {
      clearInterval(intervaloRef.current)
      navigate('/checkout/status?status=approved')
    } else if (status === 'cancelado' || status === 'estornado') {
      clearInterval(intervaloRef.current)
      navigate('/checkout/status?status=failure')
    }
  }

  // Verifica sozinho a cada 3s, MAS também na hora em que a pessoa volta
  // pra essa aba (o celular costuma "congelar" o contador de 3s enquanto
  // a aba fica em segundo plano, então isso cobre esse caso).
  useEffect(() => {
    if (!aguardando) return

    intervaloRef.current = setInterval(checarStatus, 3000)

    function aoVoltarPraAba() {
      if (document.visibilityState === 'visible') checarStatus()
    }
    document.addEventListener('visibilitychange', aoVoltarPraAba)
    window.addEventListener('focus', aoVoltarPraAba)

    return () => {
      clearInterval(intervaloRef.current)
      document.removeEventListener('visibilitychange', aoVoltarPraAba)
      window.removeEventListener('focus', aoVoltarPraAba)
    }
  }, [aguardando])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.whatsapp || !form.email) {
      setError('Preencha nome, WhatsApp e e-mail.')
      return
    }
    setSending(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-preference', {
        body: { productId: id, buyerName: form.nome, buyerWhatsapp: form.whatsapp, buyerEmail: form.email }
      })
      if (fnError) throw fnError

      orderIdRef.current = data.order_id
      window.open(data.init_point, '_blank')
      setAguardando(true)
    } catch (err) {
      let detalhe = err.message || 'erro desconhecido'
      try {
        if (err.context && typeof err.context.json === 'function') {
          const corpo = await err.context.json()
          detalhe = corpo.error ? `${corpo.error}${corpo.detail ? ' — ' + JSON.stringify(corpo.detail) : ''}` : JSON.stringify(corpo)
        }
      } catch {}
      setError(`Não foi possível iniciar o pagamento: ${detalhe}`)
      setSending(false)
    }
  }

  if (!product) return <p className="mx-auto max-w-md px-4 py-10 text-mist">Carregando...</p>

  if (aguardando) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Aguardando o pagamento...</h1>
        <p className="mt-3 text-mist">
          Termine o pagamento na aba que abrimos do Mercado Pago e volte pra essa aba aqui.
        </p>
        <button onClick={checarStatus} disabled={verificando} className="btn-primary mt-8">
          {verificando ? 'Verificando...' : 'Já paguei, verificar agora'}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Finalizar compra</h1>
      <p className="mt-1 text-mist">{product.title}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-mist">Seu nome</label>
          <input
            className="input"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-mist">WhatsApp para entrega da conta</label>
          <input
            className="input"
            placeholder="(DDD) 9 9999-9999"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-mist">Seu e-mail</label>
          <input
            type="email"
            className="input"
            placeholder="voce@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <p className="mt-1 text-xs text-mist">
            Usamos pra você poder consultar seus pedidos depois, em <Link to="/minha-conta" className="underline">Minha conta</Link>.
          </p>
        </div>

        {error && <p className="text-sm text-ember">{error}</p>}

        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? 'Abrindo pagamento...' : 'Continuar para pagamento'}
        </button>
        <p className="text-center text-xs text-mist">
          Vamos abrir o pagamento numa aba nova: você escolhe Pix, cartão de crédito ou débito — processado com segurança pelo Mercado Pago.
        </p>
      </form>
    </div>
  )
}
