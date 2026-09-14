// Supabase Edge Function: recebe as notificações do Mercado Pago,
// confirma o pagamento consultando a API deles (nunca confia cegamente
// no payload recebido) e marca o pedido/produto como pago.
//
// Configure essa URL como "notification_url" no Mercado Pago:
//   https://<seu-projeto>.supabase.co/functions/v1/mercadopago-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    let paymentId = url.searchParams.get('data.id') || url.searchParams.get('id')
    let topic = url.searchParams.get('type') || url.searchParams.get('topic')

    // Formato mais novo do Mercado Pago: em vez de vir na URL, a informação
    // vem dentro do corpo (JSON) da requisição. Tentamos ler dos dois jeitos.
    if (!paymentId && req.method === 'POST') {
      try {
        const corpo = await req.json()
        paymentId = corpo?.data?.id ? String(corpo.data.id) : null
        topic = corpo?.type || (corpo?.action ? String(corpo.action).split('.')[0] : topic)
      } catch {
        // corpo vazio ou não é JSON — segue com o que já tinha da URL, se tinha
      }
    }

    console.log('webhook recebido:', { topic, paymentId })

    if (topic !== 'payment' || !paymentId) {
      return new Response('ignorado', { status: 200 })
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}` }
    })
    const payment = await mpResponse.json()
    if (!mpResponse.ok) return new Response('erro ao consultar pagamento', { status: 502 })

    const orderId = payment.external_reference
    const statusMap: Record<string, string> = {
      approved: 'pago',
      rejected: 'cancelado',
      refunded: 'estornado',
      cancelled: 'cancelado'
    }
    const novoStatus = statusMap[payment.status] || 'pendente'
    console.log('pagamento consultado:', { orderId, statusMercadoPago: payment.status, novoStatus })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: order } = await supabase
      .from('orders')
      .update({ status: novoStatus, mp_payment_id: String(payment.id) })
      .eq('id', orderId)
      .select()
      .single()

    if (order && novoStatus === 'pago') {
      await supabase.from('products').update({ status: 'vendido' }).eq('id', order.product_id)
      notificarPagamentoConfirmado(supabase, order).catch(() => {})
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(`erro: ${err}`, { status: 500 })
  }
})

async function notificarPagamentoConfirmado(supabase: any, order: any) {
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  const idsParaNotificar = new Set([order.seller_id, ...(admins || []).map((a: any) => a.id)])

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .in('user_id', Array.from(idsParaNotificar))

  if (!tokens?.length) return

  const mensagens = tokens.map((t: any) => ({
    to: t.expo_token,
    sound: 'default',
    title: 'Pagamento confirmado! 💰',
    body: `${order.product_title} — ${order.buyer_name} pagou R$ ${Number(order.amount).toFixed(2).replace('.', ',')}`,
    data: { orderId: order.id }
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mensagens)
  })
}
