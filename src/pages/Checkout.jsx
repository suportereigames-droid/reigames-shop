import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY

export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '' })
  const [error, setError] = useState('')
  const [etapa, setEtapa] = useState('dados') // 'dados' | 'pagamento' | 'pix' | 'processando'
  const [carregandoBrick, setCarregandoBrick] = useState(false)
  const [pix, setPix] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const orderIdRef = useRef(null)
  const intervaloRef = useRef(null)
  const brickRef = useRef(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, title, price, status')
      .eq('id', id)
      .single()
      .then(({ data }) => setProduct(data))
  }, [id])

  useEffect(() => () => clearInterval(intervaloRef.current), [])

  // Avisa o navegador pra perguntar antes de sair (atualizar/fechar a aba)
  // se a pessoa já começou a preencher algo ou está no meio do pagamento —
  // assim ela não perde tudo sem querer.
  useEffect(() => {
    const emAndamento = etapa !== 'dados' || form.nome || form.whatsapp || form.email

    function avisar(e) {
      if (!emAndamento) return
      e.preventDefault()
      e.returnValue = '' // navegadores modernos ignoram o texto e mostram uma mensagem padrão deles
    }

    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [etapa, form])

  async function checarStatus() {
    if (!orderIdRef.current) return
    const { data: status } = await supabase.rpc('pedido_status', { pedido_id: orderIdRef.current })
    if (status === 'pago') {
      clearInterval(intervaloRef.current)
      navigate(`/checkout/status?status=approved&pedido=${orderIdRef.current}`)
    } else if (status === 'cancelado' || status === 'estornado') {
      clearInterval(intervaloRef.current)
      navigate(`/checkout/status?status=failure&pedido=${orderIdRef.current}`)
    }
  }

  function iniciarPix(dadosPix, orderId) {
    orderIdRef.current = orderId
    setPix(dadosPix)
    setEtapa('pix')
    intervaloRef.current = setInterval(checarStatus, 3000)
  }

  async function carregarSdkMercadoPago() {
    if (window.MercadoPago) return
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://sdk.mercadopago.com/js/v2'
      script.onload = resolve
      script.onerror = () => reject(new Error('Falha ao carregar o script do Mercado Pago.'))
      document.body.appendChild(script)
    })
  }

  async function abrirFormularioPagamento(e) {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.whatsapp || !form.email) {
      setError('Preencha nome, WhatsApp e e-mail.')
      return
    }
    if (!PUBLIC_KEY) {
      setError('Configuração do pagamento incompleta (falta a chave pública do Mercado Pago). Avisa o suporte da loja.')
      return
    }

    setEtapa('pagamento')
    setCarregandoBrick(true)

    try {
      await carregarSdkMercadoPago()
      const mp = new window.MercadoPago(PUBLIC_KEY, { locale: 'pt-BR' })

      if (brickRef.current) {
        await brickRef.current.unmount()
        brickRef.current = null
      }

      brickRef.current = await mp.bricks().create('payment', 'brick-pagamento', {
        initialization: { amount: Number(product.price) },
        customization: {
          paymentMethods: { creditCard: 'all', debitCard: 'all', bankTransfer: 'all' }
        },
        callbacks: {
          onReady: () => setCarregandoBrick(false),
          onError: (erroBrick) => {
            console.error('Erro no Payment Brick:', erroBrick)
            setError('Não foi possível carregar o formulário de pagamento. Tente novamente.')
            setCarregandoBrick(false)
          },
          onSubmit: ({ formData }) => {
            return new Promise(async (resolve, reject) => {
              setEtapa('processando')
              try {
                const { data, error: fnError } = await supabase.functions.invoke('process-payment', {
                  body: { productId: id, buyerName: form.nome, buyerWhatsapp: form.whatsapp, buyerEmail: form.email, formData }
                })

                if (fnError || data?.error) {
                  setError('Pagamento não aprovado. Confira os dados e tente novamente.')
                  setEtapa('pagamento')
                  reject()
                  return
                }

                if (data.pix) {
                  iniciarPix(data.pix, data.order_id)
                } else if (data.status === 'approved') {
                  navigate(`/checkout/status?status=approved&pedido=${data.order_id}`)
                } else if (data.status === 'rejected') {
                  navigate(`/checkout/status?status=failure&pedido=${data.order_id}`)
                } else {
                  orderIdRef.current = data.order_id
                  setEtapa('pix')
                  intervaloRef.current = setInterval(checarStatus, 3000)
                }
                resolve()
              } catch (err) {
                setError('Não foi possível processar o pagamento agora.')
                setEtapa('pagamento')
                reject(err)
              }
            })
          }
        }
      })
    } catch (err) {
      console.error('Erro ao montar o Payment Brick:', err)
      setError('Não foi possível carregar o pagamento. Verifique sua conexão e tente novamente.')
      setCarregandoBrick(false)
    }
  }

  if (!product) return <p className="mx-auto max-w-md px-4 py-10 text-mist">Carregando...</p>

  if (etapa === 'pix' && pix) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-ink">Pague com Pix</h1>
        <p className="mt-2 text-mist">Escaneia o QR Code ou copia o código abaixo no app do seu banco.</p>
        {pix.qr_code_base64 && (
          <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" className="mx-auto mt-6 h-56 w-56" />
        )}
        {pix.qr_code && (
          <div className="mt-4">
            <textarea readOnly value={pix.qr_code} className="input h-20 text-xs" onFocus={(e) => e.target.select()} />
            <button
              onClick={() => {
                navigator.clipboard.writeText(pix.qr_code)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 2000)
              }}
              className="btn-ghost mt-2 w-full"
            >
              {copiado ? 'Copiado! ✓' : 'Copiar código'}
            </button>
          </div>
        )}
        <p className="mt-6 text-sm text-mist">Assim que o pagamento cair, essa tela muda sozinha.</p>
      </div>
    )
  }

  if (etapa === 'pix') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Pagamento em análise</h1>
        <p className="mt-3 text-mist">Assim que confirmarmos, essa tela muda sozinha.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Finalizar compra</h1>
      <p className="mt-1 text-mist">{product.title}</p>

      {etapa === 'dados' && (
        <form onSubmit={abrirFormularioPagamento} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-mist">Seu nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">WhatsApp para entrega da conta</label>
            <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">Seu e-mail</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <p className="mt-1 text-xs text-mist">
              Usamos pra você poder consultar seus pedidos depois, em <Link to="/minha-conta" className="underline">Minha conta</Link>.
            </p>
          </div>

          {error && <p className="text-sm text-ember">{error}</p>}

          <button type="submit" className="btn-primary w-full">Continuar para pagamento</button>
        </form>
      )}

      {/* Fica sempre no DOM (só escondido) enquanto não é a etapa de
          pagamento, pra garantir que a caixinha já existe quando o
          Mercado Pago tentar desenhar o formulário nela. */}
      <div className={etapa === 'pagamento' || etapa === 'processando' ? 'mt-6' : 'hidden'}>
        {error && <p className="mb-3 text-sm text-ember">{error}</p>}
        {carregandoBrick && <p className="mb-3 text-center text-mist">Carregando formulário de pagamento...</p>}
        <div id="brick-pagamento" />
        {etapa === 'processando' && <p className="mt-3 text-center text-mist">Processando pagamento...</p>}
      </div>
    </div>
  )
}
