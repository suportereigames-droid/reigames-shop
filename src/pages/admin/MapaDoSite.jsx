import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function MapaDoSite() {
  const [categorias, setCategorias] = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [paginas, setPaginas] = useState([])
  const [lojas, setLojas] = useState([])

  useEffect(() => {
    async function carregar() {
      const [{ data: cats }, { data: subs }, { data: pags }, { data: seller }] = await Promise.all([
        supabase.from('categories').select('id, name').order('sort_order'),
        supabase.from('subcategories').select('id, name, category_id').order('sort_order'),
        supabase.from('site_pages').select('slug, menu_label').order('sort_order'),
        supabase.from('seller_pages').select('slug, display_name, titulo')
      ])
      setCategorias(cats || [])
      setSubcategorias(subs || [])
      setPaginas(pags || [])
      setLojas(seller || [])
    }
    carregar()
  }, [])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Mapa do site</h1>
      <p className="mt-1 text-sm text-mist">
        Todas as URLs públicas que existem hoje de verdade no site novo — útil pra comparar com as URLs
        antigas na hora de montar os redirecionamentos.
      </p>

      <h2 className="mt-6 font-semibold text-ink">Home</h2>
      <Linha url="/" />

      <h2 className="mt-6 font-semibold text-ink">Categorias ({categorias.length})</h2>
      {categorias.map((c) => (
        <div key={c.id}>
          <Linha url={`/categoria/${slugify(c.name)}`} label={c.name} />
          {subcategorias
            .filter((s) => s.category_id === c.id)
            .map((s) => (
              <Linha key={s.id} url={`/categoria/${slugify(c.name)}/${slugify(s.name)}`} label={`↳ ${s.name}`} />
            ))}
        </div>
      ))}

      <h2 className="mt-6 font-semibold text-ink">Páginas customizadas ({paginas.length})</h2>
      {paginas.map((p) => (
        <Linha key={p.slug} url={`/pagina/${p.slug}`} label={p.menu_label} />
      ))}

      <h2 className="mt-6 font-semibold text-ink">Lojas pessoais ({lojas.length})</h2>
      {lojas.map((l) => (
        <Linha key={l.slug} url={`/${l.slug}`} label={l.titulo || l.display_name} />
      ))}
    </div>
  )
}

function Linha({ url, label }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 text-sm">
      <div>
        <Link to={url} className="font-mono text-gold hover:underline">reigames.com.br{url}</Link>
        {label && <span className="ml-2 text-mist">— {label}</span>}
      </div>
    </div>
  )
}
