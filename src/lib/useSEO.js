import { useEffect } from 'react'

// Define o título da aba e a meta descrição de cada página — ajuda o Google
// a entender do que se trata cada uma (sem precisar de nenhuma biblioteca
// nova instalada no projeto).
export function useSEO(titulo, descricao) {
  useEffect(() => {
    if (titulo) document.title = titulo

    if (descricao) {
      let tag = document.querySelector('meta[name="description"]')
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', 'description')
        document.head.appendChild(tag)
      }
      tag.setAttribute('content', descricao)
    }
  }, [titulo, descricao])
}
