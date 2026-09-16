import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  async function loadProfile(userId) {
    setProfileLoading(true)
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()
    setProfile(error ? null : data)
    setProfileLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Primeira etapa do login da equipe: confere a senha, mas não deixa a
  // sessão valendo ainda — desloga na hora e manda um código por e-mail
  // como segunda etapa. Só depois de confirmar o código (confirmarCodigo)
  // é que a sessão de verdade é criada.
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    await supabase.auth.signOut()
    const { error: erroCodigo } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    return { error: erroCodigo }
  }

  // Segunda etapa: confirma o código de 6 dígitos recebido por e-mail —
  // é isso que efetivamente cria a sessão usada pelo resto do painel.
  async function confirmarCodigo(email, codigo) {
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading,
    profileLoading,
    signIn,
    confirmarCodigo,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
