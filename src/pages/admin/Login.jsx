import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Login() {
  const { signIn, confirmarCodigo, session, profile, profileLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState('senha') // 'senha' | 'codigo'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session || profileLoading) return
    if (profile) {
      // Sessão de equipe de verdade — segue pro painel.
      navigate('/admin', { replace: true })
    } else {
      // Sessão existente mas sem perfil de equipe (ex: alguém que só
      // logou como comprador em "Minha conta" nesse navegador). Essa
      // sessão não serve pra admin — desloga em silêncio pra liberar
      // o formulário de login normalmente.
      signOut()
    }
  }, [session, profile, profileLoading])

  async function handleSenha(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('E-mail ou senha inválidos.')
      return
    }
    setEtapa('codigo')
  }

  async function handleCodigo(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await confirmarCodigo(email, codigo)
    setLoading(false)
    if (error) {
      setError('Código inválido ou expirado.')
      return
    }
    // A sessão criada aqui já dispara o useEffect acima, que navega pro painel.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-8">
        <h1 className="text-xl font-bold text-ink">Painel Rei Games</h1>
        <p className="mt-1 text-sm text-mist">Acesso restrito à equipe.</p>

        {etapa === 'senha' ? (
          <form onSubmit={handleSenha}>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-mist">E-mail</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-mist">Senha</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-ember">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodigo}>
            <p className="mt-6 text-sm text-mist">
              Enviamos um código de 6 dígitos pro e-mail <strong>{email}</strong>. Digita ele abaixo pra
              confirmar a entrada.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="input mt-4 text-center text-lg tracking-[0.3em]"
              placeholder="000000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              required
            />

            {error && <p className="mt-4 text-sm text-ember">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
              {loading ? 'Confirmando...' : 'Confirmar código'}
            </button>
            <button
              type="button"
              onClick={() => { setEtapa('senha'); setCodigo(''); setError('') }}
              className="mt-3 w-full text-center text-xs text-mist"
            >
              Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
