import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Checkout() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState({ nome: '', whatsapp: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('products')
      .select('id, title, price, status')
      .eq('id', id)
      .single()
      .then(({ data }) => setProduct(data))
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.whatsapp) {
      setError('Preencha seu nome e WhatsApp para a entrega da conta.')
      return
    }
    setSending(true)
    try {
      // Edge Function que cria a preferência no Mercado Pago com o Access Token
      // guardado em segredo no Supabase (nunca exposto no front-end).
      const { data, error: fnError } = await supabase.functions.invoke('create-preference', {
        body: { productId: id, buyerName: form.nome, buyerWhatsapp: form.whatsapp }
      })
      if (fnError) throw fnError
      window.location.href = data.init_point
    } catch (err) {
      setError('Não foi possível iniciar o pagamento. Tente novamente em instantes.')
      setSending(false)
    }
  }

  if (!product) return <p className="mx-auto max-w-md px-4 py-10 text-mist">Carregando...</p>

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

        {error && <p className="text-sm text-ember">{error}</p>}

        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? 'Redirecionando ao Mercado Pago...' : 'Pagar com Mercado Pago'}
        </button>
      </form>
    </div>
  )
}
