const BUCKET = 'product-images'

function comprimirImagem(file, { cortarQuadrado = false, ladoMaximo = 1600, qualidade = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height, outW, outH

      if (cortarQuadrado) {
        const lado = Math.min(img.width, img.height)
        sx = (img.width - lado) / 2
        sy = (img.height - lado) / 2
        sw = lado
        sh = lado
        outW = Math.min(1080, lado)
        outH = outW
      } else {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height))
        outW = Math.round(img.width * escala)
        outH = Math.round(img.height * escala)
      }

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(img.src)
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível comprimir a imagem.'))
      }, 'image/jpeg', qualidade)
    }
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = URL.createObjectURL(file)
  })
}

export async function enviarImagemParaStorage(supabase, path, file, opcoesCompressao, urlAntiga) {
  let arquivoFinal = file
  if (file.type?.startsWith('image/')) {
    try {
      arquivoFinal = await comprimirImagem(file, opcoesCompressao)
    } catch {
      arquivoFinal = file
    }
  }
  const { error } = await supabase.storage.from(BUCKET).upload(path, arquivoFinal)
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

  if (urlAntiga) {
    const { data: base } = supabase.storage.from(BUCKET).getPublicUrl('')
    if (urlAntiga.startsWith(base.publicUrl)) {
      const caminhoAntigo = decodeURIComponent(urlAntiga.slice(base.publicUrl.length))
      supabase.storage.from(BUCKET).remove([caminhoAntigo]).catch(() => {})
    }
  }

  return data.publicUrl
}
