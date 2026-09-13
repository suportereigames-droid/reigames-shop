import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

function removerHtml(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || div.innerText || ''
}

function mapearStatus(statusShopify, publicado) {
  const s = (statusShopify || '').toLowerCase().trim()
  if (s === 'active') return 'disponivel'
  if (s === 'draft' || s === 'archived') return 'oculto'
  // Se não tiver a coluna "Status", usa "Published" (TRUE/FALSE) como respaldo.
  if (publicado !== undefined) {
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

export default function ImportarProdutos() {
  const { user } = useAuth()
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaEscolhida, setCategoriaEscolhida] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [lendo, setLendo] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => setCategorias(data || []))
  }, [])

  function lerArquivo(file) {
    if (!file) return
    setError('')
    setResultado('')
    setProdutos([])
    setNomeArquivo(file.name)
    setLendo(true)
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (resultado) => {
          setLendo(false)
          try {
            const agrupados = agruparPorHandle(resultado.data)
            if (agrupados.length === 0) {
              setError(
                `Li o arquivo (${resultado.data.length} linhas), mas não encontrei nenhum produto reconhecível. ` +
                `Confere se é o CSV exportado do Shopify (precisa ter as colunas "Handle" e "Title").`
              )
              return
            }
            setProdutos(agrupados)
          } catch (err) {
            setError('Erro ao processar o conteúdo do arquivo: ' + err.message)
          }
        },
        error: (err) => {
          setLendo(false)
          setError('Não foi possível ler o arquivo: ' + err.message)
        }
      })
    } catch (err) {
      setLendo(false)
      setError('Erro inesperado ao abrir o arquivo: ' + err.message)
    }
  }

  async function importar() {
    if (!categoriaEscolhida) {
      setError('Escolha em qual categoria essas contas vão entrar.')
      return
    }
    setImportando(true)
    setProgresso(0)
    setError('')

    let sucesso = 0
    for (let i = 0; i < produtos.length; i++) {
      const p = produtos[i]
      const payload = {
        game: categoriaEscolhida,
        title: p.title,
        description: removerHtml(p.body).trim(),
        price: p.price ? Number(p.price) : 0,
        compare_price: p.compareAt ? Number(p.compareAt) : null,
        status: p.status || 'disponivel',
        media: p.images.map((url) => ({ type: 'image', path: url, url })),
        created_by: user.id
      }
      const { error } = await supabase.from('products').insert(payload)
      if (!error) sucesso++
      setProgresso(i + 1)
    }

    setImportando(false)
    setResultado(`Pronto! ${sucesso} de ${produtos.length} contas importadas com sucesso.`)
    setProdutos([])
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">Importar do Shopify</h1>
      <p className="mt-1 text-sm text-mist">
        No seu site antigo: <strong>Admin do Shopify → Produtos → Exportar</strong> (escolha "todos os produtos"
        ou filtre por uma coleção/categoria) → formato CSV para Excel. Isso baixa um arquivo <code>.csv</code>.
        Sobe ele aqui embaixo.
      </p>

      <div className="mt-6">
        <label className="btn-ghost inline-block cursor-pointer">
          Escolher arquivo CSV
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              alert('Evento disparado! Arquivo: ' + (e.target.files[0]?.name || 'NENHUM ARQUIVO'))
              lerArquivo(e.target.files[0])
            }}
          />
        </label>
        {nomeArquivo && <span className="ml-3 text-sm text-mist">{nomeArquivo}</span>}
      </div>

      {lendo && <p className="mt-3 text-sm text-mist">Lendo arquivo...</p>}

      {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      {resultado && <p className="mt-3 text-sm font-semibold text-emerald">{resultado}</p>}

      {produtos.length > 0 && (
        <>
          <div className="mt-6">
            <label className="mb-1 block text-sm text-mist">
              Todas as {produtos.length} contas desse arquivo vão entrar em qual categoria?
            </label>
            <select className="input" value={categoriaEscolhida} onChange={(e) => setCategoriaEscolhida(e.target.value)}>
              <option value="">Escolha...</option>
              {categorias.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-mist">
              Se o arquivo tiver contas de jogos diferentes misturadas, o jeito mais simples é exportar do
              Shopify uma categoria/coleção de cada vez, e importar aqui separadamente.
            </p>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto rounded border border-line">
            {produtos.map((p, i) => (
              <div key={i} className="flex items-center justify-between border-b border-line p-3 text-sm last:border-0">
                <div>
                  <p className="font-medium text-ink">{p.title}</p>
                  <p className="text-xs text-mist">
                    {p.price ? `R$ ${p.price}` : 'sem preço'} · {p.images.length} imagem(ns) · {p.status || 'disponivel'}
                  </p>
                </div>
                {p.images[0] && <img src={p.images[0]} alt="" className="h-12 w-12 rounded object-cover" />}
              </div>
            ))}
          </div>

          <button onClick={importar} disabled={importando} className="btn-primary mt-4">
            {importando ? `Importando... (${progresso}/${produtos.length})` : `Importar ${produtos.length} contas`}
          </button>
        </>
      )}
    </div>
  )
}
