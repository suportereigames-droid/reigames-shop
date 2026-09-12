// Supabase Edge Function: SÓ PARA TESTE.
// Cria um pedido já como "pago", sem passar pelo Mercado Pago de verdade.
// Só aceita chamadas vindas de localhost (o site rodando local pra teste,
// via `npm run dev`) — o site publicado de verdade nunca chama essa função.
//
// Deploy: supabase functions deploy simulate-test-payment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const origin = req.headers.get('origin') || ''
    const ehTeste = origin.includes('localhost') || origin.includes('127.0.0.1')
    if (!ehTeste) {
      return json({ error: 'Essa função só funciona em ambiente de teste local.' }, 403)
    }

    const { productId, buyerName, buyerWhatsapp, buyerEmail } = await req.json()
    if (!productId || !buyerName || !buyerWhatsapp || !buyerEmail) {
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id: product.id,
        seller_id: product.created_by,
        buyer_name: buyerName,
        buyer_whatsapp: buyerWhatsapp,
        buyer_email: buyerEmail,
        amount: product.price,
        product_game: product.game,
        product_title: product.title,
        status: 'pago',
        mp_payment_id: 'TESTE-LOCAL'
      })
      .select('id')
      .single()

    if (orderError) return json({ error: orderError.message }, 500)

    return json({ orderId: order.id })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}
