import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'
import styles from '../Login/Login.module.css'

const IcoMail = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4"/>
  </svg>
)

export function ForgotPassword() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { forgotPasswordFirebase } = useAuth()

  const handle = async () => {
    if (!email) return
    setLoading(true); setError('')
    try {
      // Firebase envia o email de recuperação — sem Resend
      await forgotPasswordFirebase(email)
      setSent(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar'
      // Firebase retorna erro específico se email não existe — mascaramos por segurança
      if (msg.includes('user-not-found') || msg.includes('invalid-email')) {
        setSent(true) // mostra mesmo assim (segurança)
      } else {
        setError(msg)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} style={{ minHeight: 180 }}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <img src={logo} alt="FastFit" className={styles.heroLogo} style={{ height: 44 }} />
        <div className={styles.heroText}>
          <p className={styles.heroSub}>Recuperar acesso</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.backRow}>
          <Link to="/login" className={styles.backLink}>← Voltar ao login</Link>
        </div>
        <h2 className={styles.title}>Recuperar senha</h2>

        {sent ? (
          <div className={styles.success}>
            📧 Se o email existir, você receberá as instruções em breve!<br />
            <small style={{ opacity: 0.8 }}>Verifique também sua caixa de spam.</small>
          </div>
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.form}>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><IcoMail /></span>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handle()}
                />
              </div>
              <button className={styles.btn} onClick={() => void handle()} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar instruções'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
