import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CategoryGallery() {
  const { slug } = useParams()
  const [categoria, setCategoria] = useState(null)
  const [paginas, setPaginas] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: cat } = await supabase.from('page_categories').select('*').eq('slug', slug).single()
      setCategoria(cat || null)
      if (cat) {
        const { data: pgs } = await supabase
          .from('site_pages')
          .select('slug, menu_label, image_url')
          .eq('page_category_id', cat.id)
          .order('sort_order', { ascending: true })
        setPaginas(pgs || [])
      } else {
        setPaginas([])
      }
    }
    load()
  }, [slug])

  if (paginas === null) return <p className="mx-auto max-w-2xl px-4 py-10 text-mist">Carregando...</p>
  if (!categoria) return <p className="mx-auto max-w-2xl px-4 py-10 text-mist">Categoria não encontrada.</p>

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">{categoria.name}</h1>

      {paginas.length === 0 ? (
        <p className="mt-6 text-mist">Nenhuma página nessa categoria ainda.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {paginas.map((p) => (
            <Link
              key={p.slug}
              to={`/pagina/${p.slug}`}
              className="block overflow-hidden rounded-lg border border-line transition-colors hover:border-gold"
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.menu_label} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-panel2 text-sm text-mist">
                  Sem imagem
                </div>
              )}
              <p className="p-3 text-center font-semibold text-ink">{p.menu_label}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
