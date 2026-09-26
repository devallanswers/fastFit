import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import logo from '../../assets/logo.png'
import { IconEye, IconEyeOff } from '../../components/Icon/Icon'
import styles from '../Login/Login.module.css'

const IcoLock = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

export function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = async () => {
    if (!password || password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return }
    if (password !== confirm) { setError('Senhas não coincidem'); return }
    const token = params.get('token')
    if (!token) { setError('Token inválido'); return }
    setLoading(true); setError('')
    try { await authApi.resetPassword(token, password); navigate('/login?reset=1') }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} style={{ minHeight: 180 }}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <img src={logo} alt="FastFit" className={styles.heroLogo} style={{ height: 44 }} />
        <div className={styles.heroText}>
          <p className={styles.heroSub}>Crie uma nova senha</p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.title}>Nova senha</h2>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.form}>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoLock /></span>
            <input
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha (mín. 8 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
              {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}><IcoLock /></span>
            <input
              className={styles.input}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmar senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
              {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
          <button className={styles.btn} onClick={() => void handle()} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </div>
    </div>
  )
}
