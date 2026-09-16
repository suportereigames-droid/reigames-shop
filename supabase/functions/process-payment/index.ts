// Supabase Edge Function: recebe os dados já coletados pelo Payment Brick
// (Pix, cartão, etc — tudo embutido no próprio site) e efetiva o pagamento
// direto na API do Mercado Pago, sem redirecionar o comprador pra lugar
// nenhum.
//
// Segredos necessários (os mesmos de create-preference):
//   MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { productId, buyerName, buyerWhatsapp, buyerEmail, formData } = await req.json()
    if (!productId || !buyerName || !buyerWhatsapp || !buyerEmail || !formData) {
      return json({ error: 'Dados incompletos.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, title, game, price, status, created_by')
      .eq('id', productId)
      .single()

    if (productError || !product) return json({ error: 'Conta não encontrada.' }, 404)
    if (product.status !== 'disponivel') return json({ error: 'Esta conta não está mais disponível.' }, 409)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id: product.id,
        product_game: product.game,
        product_title: product.title,
        seller_id: product.created_by,
        buyer_name: buyerName,
        buyer_whatsapp: buyerWhatsapp,
        buyer_email: buyerEmail,
        amount: product.price,
        status: 'pendente'
      })
      .select()
      .single()

    if (orderError) return json({ error: 'Não foi possível criar o pedido.' }, 500)

    // Reserva a conta na hora — assim ninguém mais consegue comprar a
    // mesma conta enquanto esse pedido está em aberto. Só volta a ficar
    // disponível se o pagamento for recusado na hora (abaixo) ou se a
    // equipe cancelar o pedido manualmente depois.
    await supabase.from('products').update({ status: 'reservado' }).eq('id', product.id)

    // Manda os dados do Payment Brick direto pra API de pagamentos do
    // Mercado Pago — isso já efetiva o pagamento (ou gera o Pix), sem
    // precisar de nenhuma página deles.
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id
      },
      body: JSON.stringify({
        ...formData,
        description: product.title,
        external_reference: order.id,
        payer: { ...formData.payer, email: buyerEmail },
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
      })
    })

    const payment = await mpResponse.json()
    if (!mpResponse.ok) {
      await supabase.from('orders').update({ status: 'cancelado' }).eq('id', order.id)
      await supabase.from('products').update({ status: 'disponivel' }).eq('id', product.id)
      return json({ error: 'Pagamento recusado pelo Mercado Pago.', detail: payment }, 502)
    }

    const statusMap: Record<string, string> = {
      approved: 'pago',
      rejected: 'cancelado',
      in_process: 'pendente',
      pending: 'pendente'
    }
    const novoStatus = statusMap[payment.status] || 'pendente'

    await supabase
      .from('orders')
      .update({ status: novoStatus, mp_payment_id: String(payment.id) })
      .eq('id', order.id)

    if (novoStatus === 'pago') {
      notificarNovoPedido(supabase, product, order).catch(() => {})
    } else if (novoStatus === 'cancelado') {
      // Pagamento negado na hora (ex: cartao recusado) — ja sabemos que
      // nao vai vingar, entao devolve a conta pra disponivel sem precisar
      // de cancelamento manual da equipe.
      await supabase.from('products').update({ status: 'disponivel' }).eq('id', product.id)
    }

    // Devolve pro site o que ele precisa mostrar: se for Pix, o QR code e o
    // código "copia e cola"; se for cartão, já vem o status final.
    return json({
      order_id: order.id,
      status: payment.status,
      status_detail: payment.status_detail,
      pix: payment.point_of_interaction?.transaction_data
        ? {
            qr_code: payment.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64
          }
        : null
    })
  } catch (err) {
    return json({ error: 'Erro interno.', detail: String(err) }, 500)
  }
})

async function notificarNovoPedido(supabase: any, product: any, order: any) {
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  const idsParaNotificar = new Set([product.created_by, ...(admins || []).map((a: any) => a.id)])

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .in('user_id', Array.from(idsParaNotificar))

  if (!tokens?.length) return

  const mensagens = tokens.map((t: any) => ({
    to: t.expo_token,
    sound: 'default',
    title: 'Novo pedido 🎮',
    body: `${product.title} — ${order.buyer_name}`,
    data: { orderId: order.id }
  }))

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mensagens)
  })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}
