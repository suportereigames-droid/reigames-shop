// Supabase Edge Function: cria uma preferência de pagamento no Mercado Pago
// (Checkout Pro) para um produto específico e registra o pedido no banco.
//
// Deploy: supabase functions deploy create-preference
// Segredos necessários (supabase secrets set):
//   MERCADOPAGO_ACCESS_TOKEN  -> access token de produção/teste do Mercado Pago
//   SUPABASE_URL              -> já disponível automaticamente
//   SUPABASE_SERVICE_ROLE_KEY -> já disponível automaticamente
//   SITE_URL                  -> ex: https://reigames.com.br

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { productId, buyerName, buyerWhatsapp, buyerEmail } = await req.json()
    if (!productId || !buyerName || !buyerWhatsapp || !buyerEmail) {
      return json({ error: 'Dados incompletos.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // ignora RLS: só roda no servidor
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

    const siteUrl = Deno.env.get('SITE_URL')!
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            title: product.title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(product.price)
          }
        ],
        payer: { name: buyerName, email: buyerEmail },
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/checkout/status?status=approved`,
          pending: `${siteUrl}/checkout/status?status=pending`,
          failure: `${siteUrl}/checkout/status?status=failure`
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
      })
    })

    const preference = await mpResponse.json()
    if (!mpResponse.ok) {
      return json({ error: 'Erro ao criar preferência no Mercado Pago.', detail: preference }, 502)
    }

    await supabase.from('orders').update({ mp_preference_id: preference.id }).eq('id', order.id)

    // Notifica o vendedor dono da conta e todos os admins no app TT.
    // Não bloqueia a resposta ao cliente caso o push falhe por algum motivo.
    notificarNovoPedido(supabase, product, order).catch(() => {})

    return json({ init_point: preference.init_point, order_id: order.id })
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
