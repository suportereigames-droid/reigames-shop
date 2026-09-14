import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminLayout() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-gold/10 text-gold' : 'text-mist hover:text-ink'}`

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-56 shrink-0 border-r border-line p-4">
        <div className="mb-6 px-2">
          <p className="font-display text-lg font-bold text-ink">Painel Rei Games</p>
          <p className="text-xs text-mist">
            {profile?.full_name} · {isAdmin ? 'admin' : 'membro da equipe'}
          </p>
        </div>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={linkClass}>Visão geral</NavLink>
          <NavLink to="/admin/produtos" className={linkClass}>
            {isAdmin ? 'Todas as contas' : 'Minhas contas'}
          </NavLink>
          <NavLink to="/admin/produtos/novo" className={linkClass}>Nova conta</NavLink>
          <NavLink to="/admin/perfil" className={linkClass}>Meu perfil</NavLink>
          {isAdmin && <NavLink to="/admin/equipe" className={linkClass}>Equipe</NavLink>}
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
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
