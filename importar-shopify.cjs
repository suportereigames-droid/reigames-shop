// Importa contas de um CSV exportado do Shopify, direto pelo Termux —
// sem precisar do navegador nem do seletor de arquivo.
//
// Como usar:
//   1. Roda de dentro da pasta ~/reigames-shop (usa as bibliotecas já
//      instaladas ali: papaparse e @supabase/supabase-js)
//   2. Pega a "service_role key" no Supabase: Settings (⚙️) → API →
//      "service_role" (é diferente da "anon" key — essa é secreta,
//      NUNCA compartilhe nem suba pro GitHub) e cola na linha abaixo.
//   3. Roda: node importar-shopify.js CAMINHO_DO_CSV "NOME DA CATEGORIA"
//      Exemplo:
//      node importar-shopify.js ~/storage/downloads/products_export_1.csv "EFOOTBALL"

const fs = require('fs')
const Papa = require('papaparse')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ltptdiiblzxzxtzocphy.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cHRkaWlibHp4enh0em9jcGh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTE1ODg1NCwiZXhwIjoyMTA0NzM0ODU0fQ.0821qCCgMcRofwJJ_tS_UI9r8HaxKK6z4cTKsqvKhtA' // Supabase → Settings → API → service_role

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const [, , caminhoArquivo, categoria] = process.argv

if (!caminhoArquivo || !categoria) {
  console.log('Uso: node importar-shopify.js CAMINHO_DO_ARQUIVO.csv "NOME DA CATEGORIA"')
  process.exit(1)
}

if (SERVICE_ROLE_KEY === 'COLE_AQUI_A_SERVICE_ROLE_KEY') {
  console.log('Antes de rodar, edita esse arquivo e cola sua service_role key de verdade no lugar de "COLE_AQUI_A_SERVICE_ROLE_KEY".')
  process.exit(1)
}

function removerHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/\s+\n/g, '\n').trim()
}

function mapearStatus(statusShopify, publicado) {
  const s = (statusShopify || '').toLowerCase().trim()
  if (s === 'active') return 'disponivel'
  if (s === 'draft' || s === 'archived') return 'oculto'
  if (publicado !== undefined && publicado !== '') {
    return String(publicado).toLowerCase() === 'true' ? 'disponivel' : 'oculto'
  }
  return 'disponivel'
}

function agruparPorHandle(linhas) {
  const grupos = {}
  const ordem = []
  for (const linha of linhas) {
    const handle = linha['Handle']
    if (!handle) continue
    if (!grupos[handle]) {
      grupos[handle] = { handle, title: '', body: '', price: null, compareAt: null, images: [], status: null }
      ordem.push(handle)
    }
    const g = grupos[handle]
    if (linha['Title']) g.title = linha['Title']
    if (linha['Body (HTML)']) g.body = linha['Body (HTML)']
    if (linha['Variant Price'] && !g.price) g.price = linha['Variant Price']
    if (linha['Variant Compare At Price'] && !g.compareAt) g.compareAt = linha['Variant Compare At Price']
    if (linha['Image Src']) g.images.push(linha['Image Src'])
    if (linha['Status'] || linha['Published']) g.status = mapearStatus(linha['Status'], linha['Published'])
  }
  return ordem.map((h) => grupos[h]).filter((g) => g.title)
}

async function main() {
  const caminho = caminhoArquivo.replace(/^~/, process.env.HOME)
  const conteudo = fs.readFileSync(caminho, 'utf8')
  const resultado = Papa.parse(conteudo, { header: true, skipEmptyLines: true })
  const produtos = agruparPorHandle(resultado.data)

  if (produtos.length === 0) {
    console.log('Não encontrei nenhum produto reconhecível nesse arquivo.')
    return
  }

  console.log(`Encontrei ${produtos.length} contas. Importando na categoria "${categoria}"...\n`)

  const { data: admins, error: erroAdmin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
  if (erroAdmin || !admins?.length) {
    console.log('Não consegui achar um admin cadastrado em profiles:', erroAdmin?.message || '(nenhum encontrado)')
    return
  }
  const adminId = admins[0].id

  let sucesso = 0
  for (const p of produtos) {
    const payload = {
      game: categoria,
      title: p.title,
      description: removerHtml(p.body),
      price: p.price ? Number(p.price) : 0,
      compare_price: p.compareAt ? Number(p.compareAt) : null,
      status: p.status || 'disponivel',
      media: p.images.map((url) => ({ type: 'image', path: url, url })),
      created_by: adminId
    }
    const { error } = await supabase.from('products').insert(payload)
    if (error) {
      console.log(`✗ ${p.title} — erro: ${error.message}`)
    } else {
      sucesso++
      console.log(`✓ ${p.title}`)
    }
  }

  console.log(`\nPronto! ${sucesso} de ${produtos.length} contas importadas.`)
}

main()
