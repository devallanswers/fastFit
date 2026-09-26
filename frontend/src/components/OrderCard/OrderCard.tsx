import { Order } from '../../types'
import { IconClipboard, IconChefHat, IconMotorcycle, IconCheckCircle, IconXCircle, IconWalking } from '../Icon/Icon'
import React from 'react'
import styles from './OrderCard.module.css'

interface OrderCardProps { order: Order }

const statusConfig: Record<string, { color: string; bg: string; Icon: React.ElementType }> = {
  'Entregue':           { color: '#059669', bg: '#D1FAE5', Icon: IconCheckCircle },
  'Saiu para entrega':  { color: '#D97706', bg: '#FEF3C7', Icon: IconMotorcycle  },
  'Em preparo':         { color: '#2563EB', bg: '#DBEAFE', Icon: IconChefHat     },
  'Recebido':           { color: '#6B7280', bg: '#F3F4F6', Icon: IconClipboard   },
  'Cancelado':          { color: '#DC2626', bg: '#FEE2E2', Icon: IconXCircle     },
}

export function OrderCard({ order }: OrderCardProps) {
  const config = statusConfig[order.status] ?? statusConfig['Recebido']
  const { Icon } = config
  const date = new Date(order.createdAt)
  const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.idWrap}>
          <span className={styles.id}>#{order.id}</span>
          <span className={styles.date}>{formatted}</span>
        </div>
        <span className={styles.status} style={{ color: config.color, background: config.bg }}>
          <Icon size={13} color={config.color} /> {order.status}
        </span>
      </div>
      <div className={styles.items}>
        {order.items.slice(0, 2).map(item => (
          <span key={item.id} className={styles.itemName}>{item.quantity}x {item.productName}</span>
        ))}
        {order.items.length > 2 && <span className={styles.more}>+{order.items.length - 2} itens</span>}
      </div>
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.total}>R$ {order.total.toFixed(2).replace('.', ',')}</span>
          <span className={styles.type}>
            {order.type === 'DELIVERY'
              ? <><IconMotorcycle size={13} /> Entrega</>
              : <><IconWalking size={13} /> Retirada</>}
          </span>
        </div>
        <button className={styles.detailsBtn}>Ver Detalhes →</button>
      </div>
    </div>
  )
}
