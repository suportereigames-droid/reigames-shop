// Servidor Node que roda o site na Hostinger.
//
// Faz duas coisas:
// 1. Serve o site normalmente pra qualquer pessoa (os arquivos gerados
//    pelo "npm run build", na pasta dist/).
// 2. Quando detecta que quem está "visitando" é o robô de prévia de link
//    (WhatsApp, Facebook, Telegram, etc. — eles não executam JavaScript,
//    só leem o HTML da primeira resposta), devolve um HTML pequeno com o
//    título/imagem/descrição certos daquele produto ou página específica,
//    em vez da prévia genérica do site inteiro.

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

const SUPABASE_URL = 'https://ltptdiiblzxzxtzocphy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_4yF37I3fMEnGcsZN3X_Mgw_3swuMyQr'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ROBOS_DE_PREVIA = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'telegrambot',
  'twitterbot', 'linkedinbot', 'discordbot', 'slackbot', 'skypeuripreview'
]

function ehRobo(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase()
  return ROBOS_DE_PREVIA.some((r) => ua.includes(r))
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

function paginaOg({ titulo, descricao, imagem, url }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descricao}">
<meta property="og:image" content="${imagem}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body></body>
</html>`
}

// Prévia para páginas de produto (mesma lógica que já existia no Netlify)
app.get('/produto/:id', async (req, res, next) => {
  if (!ehRobo(req)) return next()
  try {
    const { data: produto } = await supabase
      .from('products')
      .select('title, description, price, media')
      .eq('id', req.params.id)
      .single()
    if (!produto) return next()

    const imagem = produto.media?.[0]?.url || `${req.protocol}://${req.get('host')}/logo-preview.png`
    const titulo = escaparHtml(produto.title || 'Conta verificada — REI GAMES')
    const descricao = escaparHtml(
      `R$ ${Number(produto.price).toFixed(2).replace('.', ',')} — Conta verificada, entrega com garantia.`
    )
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    res.set('content-type', 'text/html; charset=utf-8')
    return res.send(paginaOg({ titulo, descricao, imagem, url }))
  } catch {
    return next()
  }
})

// Prévia para páginas customizadas (grupos de WhatsApp, etc.)
app.get('/pagina/:slug', async (req, res, next) => {
  if (!ehRobo(req)) return next()
  try {
    const { data: pagina } = await supabase
      .from('site_pages')
      .select('menu_label, seo_title, seo_description, image_url')
      .eq('slug', req.params.slug)
      .single()
    if (!pagina) return next()

    const imagem = pagina.image_url || `${req.protocol}://${req.get('host')}/logo-preview.png`
    const titulo = escaparHtml(pagina.seo_title || pagina.menu_label)
    const descricao = escaparHtml(pagina.seo_description || 'Compre e venda contas de jogos com segurança — REI GAMES.')
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    res.set('content-type', 'text/html; charset=utf-8')
    return res.send(paginaOg({ titulo, descricao, imagem, url }))
  } catch {
    return next()
  }
})

// Serve os arquivos estáticos gerados pelo "npm run build"
app.use(express.static(path.join(__dirname, 'dist')))

// Qualquer outra rota cai no index.html (o React Router decide o resto).
// Usamos app.use (sem caminho) em vez de app.get('*', ...) porque, no
// Express 5, a rota coringa "*" sozinha não é mais aceita.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
