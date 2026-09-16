const SUPABASE_URL = 'https://ltptdiiblzxzxtzocphy.supabase.co'
const PREFIXO_OBJETO = `${SUPABASE_URL}/storage/v1/object/public/`
const PREFIXO_RENDER = `${SUPABASE_URL}/storage/v1/render/image/public/`

export function imagemOtimizada(url, { width, quality = 75 } = {}) {
  if (!url || !url.startsWith(PREFIXO_OBJETO)) return url
  const resto = url.slice(PREFIXO_OBJETO.length)
  const params = new URLSearchParams()
  if (width) params.set('width', String(width))
  params.set('quality', String(quality))
  return `${PREFIXO_RENDER}${resto}?${params.toString()}`
}
