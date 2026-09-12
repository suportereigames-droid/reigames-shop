import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const MENSAGENS = {
  approved: {
    titulo: 'Pagamento aprovado!',
    texto: 'Nossa equipe já foi avisada e vai te chamar no WhatsApp pra fazer a entrega. Se quiser, você também pode chamar primeiro:',
    cor: 'text-emerald'
  },
  pending: {
    titulo: 'Pagamento em análise',
    texto: 'Assim que for aprovado, avisamos você pelo WhatsApp.',
    cor: 'text-gold'
  },
  failure: {
    titulo: 'Pagamento não concluído',
    texto: 'Você pode tentar novamente ou falar com a gente pelo WhatsApp.',
    cor: 'text-ember'
  }
}

export default function CheckoutStatus() {
  const [params] = useSearchParams()
  const status = params.get('status') || 'pending'
  const pedidoId = params.get('pedido')
  const info = MENSAGENS[status] || MENSAGENS.pending
  const [whatsapp, setWhatsapp] = useState(null)

  useEffect(() => {
    if (!pedidoId) return
    supabase.rpc('pedido_contato_vendedor', { pedido_id: pedidoId }).then(({ data }) => {
      if (data) setWhatsapp(data)
    })
  }, [pedidoId])

  const numero = whatsapp?.replace(/\D/g, '')

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className={`text-2xl font-bold ${info.cor}`}>{info.titulo}</h1>
      <p className="mt-3 text-mist">{info.texto}</p>

      {numero && status !== 'failure' && (
        <a
          href={`https://wa.me/55${numero}?text=${encodeURIComponent('Oi! Acabei de comprar uma conta no site e já quero combinar a entrega.')}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary mt-6 inline-flex"
        >
          Chamar no WhatsApp agora
        </a>
      )}

      <Link to="/" className="btn-ghost mt-8 inline-flex">Voltar para a loja</Link>
    </div>
  )
}
