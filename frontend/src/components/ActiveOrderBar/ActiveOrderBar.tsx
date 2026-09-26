import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersApi, storeApi } from '../../services/api'
import { loadLocalOrders } from '../../pages/Orders/Orders'
import { IconClipboard, IconChefHat, IconMotorcycle, IconWhatsapp, IconX } from '../Icon/Icon'
import styles from './ActiveOrderBar.module.css'

const ACTIVE_STATUSES = ['RECEIVED', 'IN_PREPARATION', 'READY']
const GUEST_PHONE_KEY = 'fastfit_guest_phone'

const STEPS = [
  { status: 'RECEIVED',       Icon: IconClipboard, label: 'Recebido' },
  { status: 'IN_PREPARATION', Icon: IconChefHat,   label: 'Preparo'  },
  { status: 'READY',          Icon: IconMotorcycle, label: 'Saiu!'   },
]

interface ActiveOrder {
  id: number
  status: string
}

export function ActiveOrderBar() {
  const navigate = useNavigate()
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedIdRef = useRef<number | null>(null)

  const fetchActiveOrder = useCallback(async () => {
    const phone = localStorage.getItem(GUEST_PHONE_KEY)
    if (!phone) {
      // sem telefone: usa localStorage local para mostrar pedidos recentes
      const local = loadLocalOrders()
      const found = local.find(o => ACTIVE_STATUSES.includes(o.status))
      if (found) {
        setActiveOrder({ id: found.id, status: found.status })
      } else {
        setActiveOrder(null)
      }
      return
    }

    try {
      const orders = await ordersApi.getAll(phone)
      const found = orders.find(o => ACTIVE_STATUSES.includes(o.status))
      if (found) {
        setActiveOrder({ id: found.id, status: found.status })
        // Atualiza localStorage com o status mais recente
        const local = loadLocalOrders()
        const localOrder = local.find(o => o.id === found.id)
        if (localOrder && localOrder.status !== found.status) {
          const updated = local.map(o => o.id === found.id ? { ...o, status: found.status } : o)
          localStorage.setItem('fastfit_orders', JSON.stringify(updated))
        }
      } else {
        setActiveOrder(null)
      }
    } catch {
      // fallback para localStorage
      const local = loadLocalOrders()
      const found = local.find(o => ACTIVE_STATUSES.includes(o.status))
      setActiveOrder(found ? { id: found.id, status: found.status } : null)
    }
  }, [])

  useEffect(() => {
    void fetchActiveOrder()
    storeApi.getPublic().then(s => setWhatsappNumber(s.whatsappNumber ?? null)).catch(() => {})
  }, [fetchActiveOrder])

  // Polling a cada 20s enquanto tem pedido ativo
  useEffect(() => {
    if (activeOrder && (!dismissed || dismissedIdRef.current !== activeOrder.id)) {
      intervalRef.current = setInterval(() => void fetchActiveOrder(), 20000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeOrder, dismissed, fetchActiveOrder])

  const handleDismiss = () => {
    dismissedIdRef.current = activeOrder?.id ?? null
    setDismissed(true)
  }

  if (!activeOrder || (dismissed && dismissedIdRef.current === activeOrder.id)) return null

  const currentStepIndex = STEPS.findIndex(s => s.status === activeOrder.status)
  

  return (
    <div className={styles.bar}>
      <div className={styles.barContent}>
        <div className={styles.barLeft}>
          <span className={styles.barTitle}>Pedido #{activeOrder.id}</span>
          <div className={styles.steps}>
            {STEPS.map(({ status, Icon, label }, i) => (
              <div key={status} className={styles.stepWrap}>
                <div className={[
                  styles.step,
                  i < currentStepIndex ? styles.stepDone :
                  i === currentStepIndex ? styles.stepActive : styles.stepPending
                ].join(' ')}>
                  <Icon size={14} />
                </div>
                <span className={[styles.stepLabel, i === currentStepIndex ? styles.stepLabelActive : ''].join(' ')}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={[styles.connector, i < currentStepIndex ? styles.connectorDone : ''].join(' ')} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.barRight}>
          <button className={styles.viewBtn} onClick={() => navigate('/orders')}>Ver</button>
          <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Fechar">
            <IconX size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}