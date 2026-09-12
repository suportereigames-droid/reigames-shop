// Supabase Edge Function: recebe as notificações do Mercado Pago,
// confirma o pagamento consultando a API deles (nunca confia cegamente
// no payload recebido) e marca o pedido/produto como pago.
//
// Configure essa URL como "notification_url" no Mercado Pago:
//   https://<seu-projeto>.supabase.co/functions/v1/mercadopago-webhook

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id')
    const topic = url.searchParams.get('type') || url.searchParams.get('topic')

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
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(`erro: ${err}`, { status: 500 })
  }
})
