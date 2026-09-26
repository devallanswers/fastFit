import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType } from '../types'
import { authApi, userApi } from '../services/api'
import {
  loginWithGoogle, loginWithApple, firebaseSignOut,
  firebaseLoginEmail, firebaseRegisterEmail,
  type FirebaseUser,
} from '../lib/firebase'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(() => {
    const s = localStorage.getItem('fastfit_user')
    return s ? JSON.parse(s) as User : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fastfit_token'))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => { token ? localStorage.setItem('fastfit_token', token) : localStorage.removeItem('fastfit_token') }, [token])
  useEffect(() => { user  ? localStorage.setItem('fastfit_user', JSON.stringify(user))  : localStorage.removeItem('fastfit_user')  }, [user])

  const mapUser = (u: { id: number; name: string; email: string; phone: string; role: 'USER' | 'ADMIN'; emailVerified: boolean }): User => ({
    id: String(u.id), name: u.name, email: u.email, phone: u.phone, role: u.role, emailVerified: u.emailVerified,
  })

  /** Trocar idToken Firebase → JWT próprio */
  const saveToken = (value: string | null) => {
    if (value) localStorage.setItem('fastfit_token', value)
    else localStorage.removeItem('fastfit_token')
    setToken(value)
  }

  const firebaseExchange = async (idToken: string) => {
    const res = await authApi.firebaseLogin(idToken)
    saveToken(res.token)
    setUser(mapUser(res.user))
  }

  /** Login email+senha — tenta Firebase primeiro; se falhar (ex: admin criado direto no banco),
   *  cai no login direto no backend. */
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      try {
        // Caminho normal: Firebase → troca por JWT próprio
        const result = await firebaseLoginEmail(email, password) as { user: FirebaseUser }
        const idToken = await result.user.getIdToken()
        await firebaseExchange(idToken)
      } catch (firebaseErr: unknown) {
        // Firebase não conhece este usuário (ex: admin criado direto no banco)?
        // Verifica se é erro de credencial do Firebase e tenta login direto no backend
        const code = (firebaseErr as { code?: string })?.code ?? ''
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-email') {
          // Fallback: login direto no backend (JWT)
          const res = await authApi.login(email, password)
          saveToken(res.token)
          setUser(mapUser(res.user))
        } else {
          // Outro erro do Firebase (senha errada, conta desativada, etc.) — repassa
          const msg = (firebaseErr as { message?: string })?.message ?? 'Email ou senha incorretos'
          throw new Error(
            msg.includes('wrong-password') || msg.includes('invalid-credential')
              ? 'Email ou senha incorretos'
              : msg
          )
        }
      }
    } finally { setIsLoading(false) }
  }

  /** Login Google ou Apple */
  const loginWithSocial = async (provider: 'google' | 'apple') => {
    setIsLoading(true)
    try {
      const result = (provider === 'google' ? await loginWithGoogle() : await loginWithApple()) as { user: FirebaseUser }
      const idToken = await result.user.getIdToken()
      await firebaseExchange(idToken)
    } finally { setIsLoading(false) }
  }

  /** Cadastro via Firebase + cria usuário no backend */
  const registerWithFirebase = async (name: string, email: string, password: string, phone?: string) => {
    // 1. Cria conta no Firebase
    const result = await firebaseRegisterEmail(email, password) as { user: FirebaseUser }
    const idToken = await result.user.getIdToken()

    // 2. Cria usuário no backend com nome/telefone (Firebase não tem esses campos)
    await authApi.register(name, email, password, phone)

    // 3. Loga via Firebase token
    await firebaseExchange(idToken)
  }

  /** Recuperação de senha — Firebase cuida do email */
  const forgotPasswordFirebase = async (email: string) => {
    const { firebaseForgotPassword } = await import('../lib/firebase')
    await firebaseForgotPassword(email)
  }

  const logout = () => {
    saveToken(null)
    setUser(null)
    firebaseSignOut().catch(() => {})
  }

  return (
    <AuthContext.Provider value={{
      user, token, login, loginWithSocial, register: registerWithFirebase,
      registerWithFirebase, forgotPasswordFirebase,
      logout, isAuthenticated: !!user && !!token, isAdmin: user?.role === 'ADMIN', isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
