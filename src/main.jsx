import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Protege TODAS as imagens do site (categorias, banner, cards de conta,
// logo, etc.) contra o menu de "salvar imagem" — tanto clique direito
// (computador) quanto toque longo (celular). Feito uma vez aqui pra
// valer o site inteiro, sem precisar mexer em cada componente.
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault()
})
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault()
})

// Garante que QUALQUER link do WhatsApp, em qualquer parte do site
// (produto, banner, botão VIP, grupo, etc.), sempre abra em nova aba,
// mesmo que o React Router tente interceptar o clique como navegação
// interna. Feito uma vez aqui pra valer o site inteiro.
document.addEventListener('click', (e) => {
  const link = e.target.closest('a')
  if (!link) return

  const href = link.getAttribute('href') || ''
  const isWhatsApp = href.includes('wa.me') || href.includes('api.whatsapp.com') || href.includes('web.whatsapp.com')

  if (isWhatsApp) {
    e.preventDefault()
    e.stopPropagation()
    window.open(href, '_blank', 'noopener,noreferrer')
  }
}, true)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
