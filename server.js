// Servidor Node que roda o site na Hostinger.
//
// Faz quatro coisas:
// 0. Confere se a pasta dist/ (gerada pelo "npm run build") existe; se não
//    existir, builda o site sozinho antes de continuar.
// 1. Serve o site normalmente pra qualquer pessoa (os arquivos gerados
//    pelo build, na pasta dist/).
// 2. Quando detecta que quem está "visitando" é o robô de prévia de link
//    (WhatsApp, Facebook, Telegram, etc.), devolve um HTML pequeno com o
//    título/imagem/descrição certos daquele produto, categoria/subcategoria
//    ou página específica, em vez da prévia genérica do site inteiro.
// 3. Serve como "proxy" das imagens usadas nessas prévias: busca a imagem
//    original no Supabase, reduz o tamanho dela e devolve sem o cabeçalho
//    "x-robots-tag" que o Supabase Storage manda por padrão.

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const distIndexPath = path.join(__dirname, 'dist', 'index.html')
if (!existsSync(distIndexPath)) {
  console.log('dist/index.html não encontrado — rodando "npm run build" antes de iniciar o servidor...')
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
}

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

// Mesma função usada no site (src/pages/Store.jsx) pra transformar nome de
// categoria/subcategoria no "slug" que aparece na URL — precisa ser
// idêntica, senão o servidor não acha a categoria certa a partir do link.
function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

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

// Prévia para categoria e subcategoria (mesmo handler pras duas rotas —
// a subcategoria só existe quando o link tem esse segundo pedaço na URL).
async function handlerCategoria(req, res, next) {
  if (!ehRobo(req)) return next()
  try {
    const { data: categorias } = await supabase
      .from('categories')
      .select('name, image_url, seo_title, seo_description')
    const categoria = (categorias || []).find((c) => slugify(c.name) === req.params.slugCategoria)
    if (!categoria) return next()

    let subcategoria = null
    if (req.params.slugSubcategoria) {
      const { data: subs } = await supabase
        .from('subcategories')
        .select('name, image_url, seo_title, seo_description')
      subcategoria = (subs || []).find((s) => slugify(s.name) === req.params.slugSubcategoria)
    }

    const nomeExibido = subcategoria?.name || categoria.name
    const titulo = escaparHtml(
      subcategoria?.seo_title || categoria.seo_title || `Contas de ${nomeExibido} — REI GAMES`
    )
    const descricao = escaparHtml(
      subcategoria?.seo_description || categoria.seo_description ||
      `Compre contas de ${nomeExibido} com garantia, entrega rápida e pagamento facilitado.`
    )
    const imagemOriginal = subcategoria?.image_url || categoria.image_url || `${req.protocol}://${req.get('host')}/logo-preview.png`
    const imagem = urlDeImagemParaPrevia(req, imagemOriginal)
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
    res.set('content-type', 'text/html; charset=utf-8')
    return res.send(paginaOg({ titulo, descricao, imagem, url }))
  } catch {
    return next()
  }
}

app.get('/categoria/:slugCategoria', handlerCategoria)
app.get('/categoria/:slugCategoria/:slugSubcategoria', handlerCategoria)

app.use(express.static(path.join(__dirname, 'dist')))

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
