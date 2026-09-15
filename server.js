// Servidor Node que roda o site na Hostinger.
//
// Faz três coisas:
// 1. Serve o site normalmente pra qualquer pessoa (os arquivos gerados
//    pelo "npm run build", na pasta dist/).
// 2. Quando detecta que quem está "visitando" é o robô de prévia de link
//    (WhatsApp, Facebook, Telegram, etc. — eles não executam JavaScript,
//    só leem o HTML da primeira resposta), devolve um HTML pequeno com o
//    título/imagem/descrição certos daquele produto ou página específica,
//    em vez da prévia genérica do site inteiro.
// 3. Serve como "proxy" das imagens usadas nessas prévias: busca a imagem
//    original no Supabase, reduz o tamanho dela e devolve sem o cabeçalho
//    "x-robots-tag" que o Supabase Storage manda por padrão — cabeçalho
//    que faz o WhatsApp/Facebook ignorarem a imagem na prévia, mesmo ela
//    sendo pública e carregando normal no navegador.

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

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

// Transforma a URL original da imagem (Supabase) numa URL do nosso próprio
// domínio, que passa pela rota /og-image antes de chegar ao robô de prévia.
function urlDeImagemParaPrevia(req, urlOriginal) {
  if (!urlOriginal || !urlOriginal.startsWith('http')) return urlOriginal
  const base = `${req.protocol}://${req.get('host')}`
  return `${base}/og-image?url=${encodeURIComponent(urlOriginal)}`
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
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body></body>
</html>`
}

// Proxy de imagem: busca a imagem original, reduz pra um tamanho leve e
// devolve como JPEG, sem o cabeçalho que bloqueia o uso em prévias.
app.get('/og-image', async (req, res) => {
  const origem = req.query.url
  if (!origem || !origem.startsWith(SUPABASE_URL)) {
    return res.status(400).send('URL inválida')
  }
  try {
    const resposta = await fetch(origem)
    if (!resposta.ok) throw new Error('Falha ao buscar imagem original')
    const buffer = Buffer.from(await resposta.arrayBuffer())
    const imagemReduzida = await sharp(buffer)
      .resize(1200, 630, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    res.set('content-type', 'image/jpeg')
    res.set('cache-control', 'public, max-age=86400')
    res.send(imagemReduzida)
  } catch {
    res.status(502).send('Não foi possível gerar a imagem')
  }
})

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

    const imagemOriginal = produto.media?.[0]?.url || `${req.protocol}://${req.get('host')}/logo-preview.png`
    const imagem = urlDeImagemParaPrevia(req, imagemOriginal)
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

    const imagemOriginal = pagina.image_url || `${req.protocol}://${req.get('host')}/logo-preview.png`
    const imagem = urlDeImagemParaPrevia(req, imagemOriginal)
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
