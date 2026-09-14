import { useState } from 'react'

// Substitui o <select> nativo nos lugares onde o menu do sistema não
// estava fechando sozinho depois de escolher, em alguns celulares/
// navegadores. Esse aqui a gente controla por conta própria: usa uma
// camada de fundo invisível (backdrop) pra fechar ao clicar fora, em
// vez de "escutar" cliques no documento inteiro — isso evita conflito
// de eventos entre fechar e escolher ao mesmo tempo.
export default function SelectCustomizado({ value, onChange, opcoes, placeholder }) {
  const [aberto, setAberto] = useState(false)
  const selecionado = opcoes.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="input flex w-full items-center justify-between text-left"
      >
        <span className={selecionado ? 'text-ink' : 'text-mist'}>
          {selecionado ? selecionado.label : (placeholder || 'Escolha...')}
        </span>
        <span className="ml-2 text-mist">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-white shadow-lg">
            {opcoes.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setAberto(false)
                  onChange(o.value)
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-panel ${o.value === value ? 'bg-panel2 font-semibold text-gold' : 'text-ink'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
