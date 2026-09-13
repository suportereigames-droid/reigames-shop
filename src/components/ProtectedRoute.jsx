import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { session, profile, loading, profileLoading } = useAuth()

  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-mist">
        Carregando...
      </div>
    )
  }

  if (!session) return <Navigate to="/admin/login" replace />

  // Tem sessão (pode até ser um comprador logado em "Minha conta"), mas
  // só quem tem uma linha em profiles é de fato equipe/admin.
  if (!profile) return <Navigate to="/admin/login" replace />

  return children
}
