import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { storeApi } from '../../services/api'
import { IconCart } from '../Icon/Icon'
import logo from '../../assets/logo.png'
import styles from './Header.module.css'

function useStoreStatus() {
  const [status, setStatus] = useState<{ isOpenNow: boolean; label: string } | null>(null)
  useEffect(() => {
    storeApi.getPublic().then(s => {
      // Fix: usar isOpenNow do backend (já considera schedule + fuso do servidor)
      if (!s.isOpenNow) { setStatus({ isOpenNow: false, label: 'Fechado' }); return }
      let label = 'Aberto'
      if (s.scheduleJson) {
        try {
          const schedule = JSON.parse(s.scheduleJson) as Array<{ day: string; active: boolean; open: string; close: string }>
          // Fix: calcular o dia no fuso America/Sao_Paulo (mesmo que o backend)
          // Antes: new Date().getDay() usava o fuso local do browser (podia divergir do servidor)
          const brDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
          const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
          const today = days[brDate.getDay()]
          const d = schedule.find(x => x.day === today)
          if (d?.active && d.close) label = `Aberto até ${d.close}`
        } catch { /**/ }
      }
      setStatus({ isOpenNow: true, label })
    }).catch(() => {})
  }, [])
  return status
}

export function Header() {
  const { getTotalItems } = useCart()
  const navigate = useNavigate()
  const total = getTotalItems()
  const storeStatus = useStoreStatus()

  return (
    <header className={styles.header}>
      <div className={styles.logoWrap} onClick={() => navigate('/')}>
        <img src={logo} alt="FastFit" className={styles.logoImg} />
        {storeStatus && (
          <span className={storeStatus.isOpenNow ? styles.statusOpen : styles.statusClosed}>
            <span className={storeStatus.isOpenNow ? styles.dotOpen : styles.dotClosed} />
            {storeStatus.label}
          </span>
        )}
      </div>
      <button className={styles.cartBtn} onClick={() => navigate('/cart')} aria-label="Carrinho">
        <IconCart size={20} />
        {total > 0 && <span className={styles.badge}>{total}</span>}
      </button>
    </header>
  )
}