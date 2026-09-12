import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-mist">
        Carregando...
      </div>
    )
  }

  if (!session) return <Navigate to="/admin/login" replace />

  return children
}
