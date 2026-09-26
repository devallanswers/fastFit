import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToastContext } from '../../context/ToastContext'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { IconPix, IconClipboard, IconClock, IconChevronRight } from '../../components/Icon/Icon'
import styles from './PixPayment.module.css'

interface PixState {
  code: string
  orderId: number
  total: number
}

export function PixPayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToastContext()

  const state = location.state as PixState | undefined

  // Se acessar direto sem dados, manda pro início
  useEffect(() => {
    if (!state?.code) navigate('/', { replace: true })
  }, [])

  if (!state?.code) return null

  const { code, orderId, total } = state

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pagamento Pix</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.iconWrap}>
          <IconPix size={32} color="var(--primary)" />
        </div>

        <h2 className={styles.heading}>Pague com Pix</h2>
        <p className={styles.sub}>
          Pedido <strong>#{orderId}</strong> · <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
        </p>

        <p className={styles.instructions}>
          Copie o código abaixo e cole no app do seu banco:
        </p>

        <div className={styles.codeBox}>
          <span className={styles.codeText}>{code}</span>
        </div>

        <button
          className={styles.copyBtn}
          onClick={() => {
            void navigator.clipboard.writeText(code)
            toast.success('Código copiado!')
          }}
        >
          <IconClipboard size={16} style={{ marginRight: 8 }} />
          Copiar código Pix
        </button>

        <div className={styles.note}>
          <IconClock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Após pagar, aguarde a confirmação do estabelecimento.
            Acompanhe em <strong>Meus Pedidos</strong>.
          </span>
        </div>

        <button className={styles.ordersBtn} onClick={() => navigate('/orders')}>
          Ver meus pedidos
          <IconChevronRight size={14} style={{ marginLeft: 4 }} />
        </button>
      </div>

      <BottomNavigation />
    </div>
  )
}