import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const MENSAGENS = {
  approved: {
    titulo: 'Pagamento aprovado!',
    texto: 'Chame a gente agora pelo WhatsApp abaixo para receber sua conta:',
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
  const [erroWhatsapp, setErroWhatsapp] = useState(null)

  useEffect(() => {
    if (!pedidoId) return
    supabase.rpc('pedido_contato_vendedor', { pedido_id: pedidoId }).then(({ data, error }) => {
      if (error) setErroWhatsapp(error.message)
      else if (data) setWhatsapp(data)
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
          Chamar no WhatsApp para receber a conta
        </a>
      )}

      {erroWhatsapp && (
        <p className="mt-4 text-xs text-mist">(erro ao buscar contato: {erroWhatsapp})</p>
      )}

      <Link to="/" className="btn-ghost mt-8 inline-flex">Voltar para a loja</Link>
    </div>
  )
}
