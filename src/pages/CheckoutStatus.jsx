import { useSearchParams, Link } from 'react-router-dom'

const MENSAGENS = {
  approved: {
    titulo: 'Pagamento aprovado!',
    texto: 'Nossa equipe vai te chamar no WhatsApp informado para fazer a entrega da conta.',
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
  const info = MENSAGENS[status] || MENSAGENS.pending

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className={`text-2xl font-bold ${info.cor}`}>{info.titulo}</h1>
      <p className="mt-3 text-mist">{info.texto}</p>
      <Link to="/" className="btn-ghost mt-8 inline-flex">Voltar para a loja</Link>
    </div>
  )
}
