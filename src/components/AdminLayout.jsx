import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminLayout() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-gold/10 text-gold' : 'text-mist hover:text-ink'}`

  return (
    <div className="min-h-screen bg-white md:flex">
      {/* Barra de topo só aparece no celular, com o botão que abre o menu */}
      <div className="flex items-center justify-between border-b border-line p-4 md:hidden">
        <p className="font-display text-lg font-bold text-ink">Painel Rei Games</p>
        <button
          onClick={() => setMenuAberto(true)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-ink"
          aria-label="Abrir menu"
        >
          ☰ Menu
        </button>
      </div>

      {/* Fundo escuro atrás do menu quando ele está aberto no celular */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Menu lateral: a partir de "md" (tablet/computador) fica sempre visível
          do lado, do jeito que já era. No celular, some por padrão e desliza
          por cima da página (sem dividir espaço com o conteúdo) quando o
          botão "Menu" é clicado. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-line bg-white p-4 transition-transform duration-200 md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-start justify-between px-2">
          <div>
            <p className="font-display text-lg font-bold text-ink">Painel Rei Games</p>
            <p className="text-xs text-mist">
              {profile?.full_name} · {isAdmin ? 'admin' : 'membro da equipe'}
            </p>
          </div>
          <button onClick={() => setMenuAberto(false)} className="text-xl text-mist md:hidden">✕</button>
        </div>

        <nav className="space-y-1" onClick={() => setMenuAberto(false)}>
          <NavLink to="/admin" end className={linkClass}>Visão geral</NavLink>
          <NavLink to="/admin/produtos" className={linkClass}>
            {isAdmin ? 'Todas as contas' : 'Minhas contas'}
          </NavLink>
          <NavLink to="/admin/produtos/novo" className={linkClass}>Nova conta</NavLink>
          <NavLink to="/admin/perfil" className={linkClass}>Meu perfil</NavLink>
          {isAdmin && <NavLink to="/admin/equipe" className={linkClass}>Equipe</NavLink>}
          {isAdmin && <NavLink to="/admin/mapa-do-site" className={linkClass}>Mapa do site</NavLink>}
          {isAdmin && <NavLink to="/admin/categorias" className={linkClass}>Categorias e subcategorias</NavLink>}
          {isAdmin && <NavLink to="/admin/paginas" className={linkClass}>Páginas do site</NavLink>}
          {isAdmin && <NavLink to="/admin/categorias-pagina" className={linkClass}>Categorias de página</NavLink>}
          {isAdmin && <NavLink to="/admin/menu" className={linkClass}>Menu do site</NavLink>}
          {isAdmin && <NavLink to="/admin/banner" className={linkClass}>Banner e Parcerias</NavLink>}
          {isAdmin && <NavLink to="/admin/parcelamento" className={linkClass}>Parcelamento</NavLink>}
          {isAdmin && <NavLink to="/admin/aparencia" className={linkClass}>Aparência</NavLink>}
        </nav>

        <button onClick={handleSignOut} className="btn-ghost mt-8 w-full text-sm">Sair</button>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
