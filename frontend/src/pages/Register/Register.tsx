import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'
import { IconEye, IconEyeOff } from '../../components/Icon/Icon'
import styles from '../Login/Login.module.css'

const IcoUser = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
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
const IcoPhone = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
  </svg>
)

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { registerWithFirebase } = useAuth()
  const navigate = useNavigate()
  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handle = async () => {
    if (!form.name || !form.email || !form.password) { setError('Preencha os campos obrigatórios'); return }
    if (form.password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await registerWithFirebase(form.name, form.email, form.password, form.phone || undefined)
      // Conta criada e logada — redireciona direto para home
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} style={{ minHeight: 160 }}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <img src={logo} alt="FastFit" className={styles.heroLogo} style={{ height: 40 }} />
        <div className={styles.heroText}>
          <p className={styles.heroSub}>Crie sua conta</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.backRow}>
          <Link to="/login" className={styles.backLink}>← Voltar ao login</Link>
        </div>
        <h2 className={styles.title}>Cadastro</h2>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.form}>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoUser /></span>
            <input className={styles.input} placeholder="Nome completo" value={form.name} onChange={F('name')} />
          </div>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoMail /></span>
            <input className={styles.input} type="email" placeholder="Email" value={form.email} onChange={F('email')} />
          </div>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoLock /></span>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mín. 6 caracteres)"
              value={form.password}
              onChange={F('password')}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoPhone /></span>
            <input className={styles.input} type="tel" placeholder="Telefone (opcional)" value={form.phone} onChange={F('phone')} />
          </div>

          <button className={styles.btn} onClick={() => void handle()} disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </div>

        <p className={styles.footer}>Já tem conta? <Link to="/login">Entrar</Link></p>
      </div>
    </div>
  )
}
