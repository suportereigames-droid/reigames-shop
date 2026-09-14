// Encontra todas as contas cujas fotos ainda estão hospedadas no servidor
// do Shopify (importadas antes) e baixa+reenvia elas pro nosso próprio
// armazenamento (Supabase Storage) — depois disso, funciona em qualquer
// lugar (site e app), sem depender do Shopify continuar no ar.
//
// Como usar (de dentro da pasta ~/reigames-shop, que já tem as
// bibliotecas necessárias instaladas):
//   node migrar-fotos-shopify.cjs

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ltptdiiblzxzxtzocphy.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cHRkaWlibHp4enh0em9jcGh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTE1ODg1NCwiZXhwIjoyMTA0NzM0ODU0fQ.0821qCCgMcRofwJJ_tS_UI9r8HaxKK6z4cTKsqvKhtA' // Supabase → Settings → API → service_role

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const BUCKET = 'product-images'

if (SERVICE_ROLE_KEY === 'COLE_AQUI_A_SERVICE_ROLE_KEY') {
  console.log('Antes de rodar, edita esse arquivo e cola sua service_role key de verdade no lugar de "COLE_AQUI_A_SERVICE_ROLE_KEY".')
  process.exit(1)
}

async function baixarEReenviar(url, produtoId, index) {
  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error(`Não consegui baixar (status ${resposta.status})`)
  const buffer = Buffer.from(await resposta.arrayBuffer())

  const extensao = (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
  const path = `migradas/${produtoId}-${index}-${Date.now()}.${extensao}`
  const contentType = extensao === 'png' ? 'image/png' : extensao === 'mp4' ? 'video/mp4' : 'image/jpeg'

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function main() {
  const { data: produtos, error } = await supabase.from('products').select('id, title, media')
  if (error) {
    console.log('Erro ao buscar contas:', error.message)
    return
  }

  const comFotoExterna = (produtos || []).filter((p) =>
    (p.media || []).some((m) => m.url && m.url.includes('cdn.shopify.com'))
  )

  if (comFotoExterna.length === 0) {
    console.log('Nenhuma conta com foto do Shopify encontrada. Tudo certo por aqui!')
    return
  }

  console.log(`Encontrei ${comFotoExterna.length} conta(s) com fotos ainda no Shopify. Migrando...\n`)

  let sucesso = 0
  for (const produto of comFotoExterna) {
    try {
      const novaMedia = []
      for (let i = 0; i < produto.media.length; i++) {
        const item = produto.media[i]
        if (item.url && item.url.includes('cdn.shopify.com')) {
          const novaUrl = await baixarEReenviar(item.url, produto.id, i)
          novaMedia.push({ type: item.type || 'image', path: novaUrl, url: novaUrl })
        } else {
          novaMedia.push(item)
        }
      }
      const { error: updateError } = await supabase.from('products').update({ media: novaMedia }).eq('id', produto.id)
      if (updateError) throw new Error(updateError.message)
      sucesso++
      console.log(`✓ ${produto.title}`)
    } catch (err) {
      console.log(`✗ ${produto.title} — erro: ${err.message}`)
    }
  }

  console.log(`\nPronto! ${sucesso} de ${comFotoExterna.length} contas migradas.`)
}

main()
