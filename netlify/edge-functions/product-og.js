// Netlify Edge Function: gera uma prévia certa (foto + título da conta) quando
// o link de um produto é compartilhado no WhatsApp/Facebook/Telegram/etc.
//
// Como funciona: esses apps não executam o site (não rodam JavaScript) — eles
// só leem o HTML da primeira resposta. Por padrão, isso mostraria sempre a
// mesma prévia genérica em qualquer link. Aqui a gente detecta quando quem
// está "visitando" é o robô de prévia (pelo user-agent) e devolve um HTML
// pequeno só com as tags certas pra aquele produto específico. Uma pessoa
// normal (navegador de verdade) continua caindo no site normal, sem passar
// por aqui.

const SUPABASE_URL = 'https://ltptdiiblzxzxtzocphy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_4yF37I3fMEnGcsZN3X_Mgw_3swuMyQr'

const ROBOS_DE_PREVIA = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'telegrambot',
  'twitterbot', 'linkedinbot', 'discordbot', 'slackbot', 'skypeuripreview'
]

export default async (request, context) => {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()
  const ehRobo = ROBOS_DE_PREVIA.some((r) => userAgent.includes(r))

  // Pessoa de verdade: segue pro site normal, sem interferir em nada.
  if (!ehRobo) return context.next()

  const url = new URL(request.url)
  const id = url.pathname.split('/produto/')[1]?.split('/')[0]
  if (!id) return context.next()

  try {
    const resposta = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${id}&select=title,description,price,media`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    const [produto] = await resposta.json()
    if (!produto) return context.next()

    const imagem = produto.media?.[0]?.url || `${url.origin}/logo-preview.png`
    const titulo = escaparHtml(produto.title || 'Conta verificada — REI GAMES')
    const descricao = escaparHtml(
      `R$ ${Number(produto.price).toFixed(2).replace('.', ',')} — Conta verificada, entrega com garantia.`
    )

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <meta property="og:type" content="product">
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="${descricao}">
  <meta property="og:image" content="${imagem}">
  <meta property="og:url" content="${url.href}">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=${url.href}">
</head>
<body></body>
</html>`

    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  } catch {
    return context.next()
  }
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

export const config = { path: '/produto/*' }
