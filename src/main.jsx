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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
