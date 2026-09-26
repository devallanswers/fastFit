import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { IconEye, IconEyeOff } from '../../components/Icon/Icon'
import logo from '../../assets/logo.png'
import styles from './Login.module.css'

const IcoMail = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4"/>
  </svg>
)
const IcoLock = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

// SVGs inline dos logos Google e Apple para não precisar de libs externas
const IcoGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)


export function Login() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]         = useState('')
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)

  const { login, loginWithSocial, isLoading, isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) { navigate(isAdmin ? '/admin' : '/'); return null }

  const handle = async () => {
    if (!email || !password) { setError('Preencha todos os campos'); return }
    setError('')
    try { await login(email, password) }
    catch (e) { setError(e instanceof Error ? e.message : 'Email ou senha incorretos') }
  }

  const handleSocial = async (provider: 'google' | 'apple') => {
    setError('')
    setSocialLoading(provider)
    try { await loginWithSocial(provider) }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao entrar com conta social'
      if (!msg.includes('popup-closed')) setError(msg)
    } finally { setSocialLoading(null) }
  }

  return (
    <div className={styles.page}>
      {/* ── Hero topo ──────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <img src={logo} alt="FastFit" className={styles.heroLogo} />
        <div className={styles.heroText}>
          <h1 className={styles.heroHello}>Olá! 👋</h1>
          <p className={styles.heroSub}>Bem-vindo ao FastFit</p>
        </div>
      </div>

      {/* ── Card branco ────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.title}>Login</h2>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.form}>
          {/* Email */}
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoMail /></span>
            <input className={styles.input} type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handle()} />
          </div>

          {/* Senha */}
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoLock /></span>
            <input className={styles.input}
              type={showPassword ? 'text' : 'password'} placeholder="Senha"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handle()} />
            <button type="button" className={styles.eyeBtn}
              onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>

          <div className={styles.forgotRow}>
            <Link to="/forgot-password" className={styles.forgot}>Esqueci minha senha</Link>
          </div>

          <button className={styles.btn} onClick={() => void handle()} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        {/* ── Divisor ── */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>ou entre com</span>
          <span className={styles.dividerLine} />
        </div>

        {/* ── Botões sociais ── */}
        <div className={styles.socialRow}>
          <button
            className={styles.socialBtn}
            onClick={() => void handleSocial('google')}
            disabled={!!socialLoading || isLoading}
            aria-label="Entrar com Google"
          >
            {socialLoading === 'google'
              ? <span className={styles.socialSpinner} />
              : <IcoGoogle />}
            <span>Google</span>
          </button>

        </div>

        <p className={styles.footer}>
          Não tem conta? <Link to="/register">Cadastrar</Link>
        </p>
      </div>
    </div>
  )
}
