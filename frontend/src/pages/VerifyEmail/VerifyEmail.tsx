import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../../services/api'
import { IconClock, IconCheckCircle, IconXCircle } from '../../components/Icon/Icon'
import logo from '../../assets/logo.png'
import styles from '../Login/Login.module.css'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setStatus('error'); setMsg('Token inválido'); return }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(e => { setStatus('error'); setMsg(e instanceof Error ? e.message : 'Erro') })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.hero} style={{ minHeight: 160 }}>
        <div className={styles.heroBlobA} />
        <div className={styles.heroBlobB} />
        <img src={logo} alt="FastFit" className={styles.heroLogo} style={{ height: 44 }} />
      </div>

      <div className={styles.card} style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <IconClock size={52} color="#9ceb2b" />
            </div>
            <h2 className={styles.title}>Verificando...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <IconCheckCircle size={56} color="#16a34a" />
            </div>
            <h2 className={styles.title}>Email verificado!</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
              Sua conta está ativa. Faça login para continuar.
            </p>
            <Link to="/login">
              <button className={styles.btn}>Fazer Login</button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <IconXCircle size={56} color="#dc2626" />
            </div>
            <h2 className={styles.title}>Erro na verificação</h2>
            <p style={{ color: '#dc2626', marginBottom: 24, fontSize: 14 }}>{msg}</p>
            <Link to="/login">
              <button className={styles.btn}>Voltar ao Login</button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
