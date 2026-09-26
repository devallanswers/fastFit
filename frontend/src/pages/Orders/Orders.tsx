import React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storeApi, ordersApi } from '../../services/api'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import {
  IconClipboard, IconChefHat, IconMotorcycle, IconCheckCircle, IconXCircle,
  IconSearch, IconX, IconOrders, IconWhatsapp, IconWalking, IconCalendar, IconClock,
} from '../../components/Icon/Icon'
import styles from './Orders.module.css'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=80&h=80&fit=crop'
export const LOCAL_ORDERS_KEY = 'fastfit_orders'

export interface LocalOrder {
  id: number
  status: string
  totalAmount: number
  type: string
  deliveryAddress?: string
  notes?: string
  paymentMethod?: string
  scheduledDateTime?: string
  createdAt: string
  items: Array<{
    id: number
    productName: string
    productImage?: string | null
    quantity: number
    price: number
    subtotal: number
  }>
}

export function loadLocalOrders(): LocalOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY)
    return raw ? (JSON.parse(raw) as LocalOrder[]) : []
  } catch { return [] }
}

export function saveLocalOrder(order: LocalOrder) {
  const orders = loadLocalOrders()
  const idx = orders.findIndex(o => o.id === order.id)
  if (idx >= 0) orders[idx] = order
  else orders.unshift(order)
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders))
}

export function updateLocalOrderStatus(orderId: number, status: string) {
  const orders = loadLocalOrders()
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o)
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated))
}

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recebido',
  IN_PREPARATION: 'Em preparo',
  READY: 'Pronto para entrega',
  FINISHED: 'Entregue',
  DELIVERED_PAYMENT_DUE: 'Entregue — falta pagar',
  CANCELED: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: '#6B7280',
  IN_PREPARATION: '#1D4ED8',
  READY: '#D97706',
  FINISHED: '#059669',
  DELIVERED_PAYMENT_DUE: '#D97706',
  CANCELED: '#DC2626',
}

const STATUS_BG: Record<string, string> = {
  RECEIVED: '#F3F4F6',
  IN_PREPARATION: '#DBEAFE',
  READY: '#FEF3C7',
  FINISHED: '#D1FAE5',
  DELIVERED_PAYMENT_DUE: '#FEF3C7',
  CANCELED: '#FEE2E2',
}

const STATUS_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>> = {
  RECEIVED: IconClipboard,
  IN_PREPARATION: IconChefHat,
  READY: IconMotorcycle,
  FINISHED: IconCheckCircle,
  DELIVERED_PAYMENT_DUE: IconClock,
  CANCELED: IconXCircle,
}

const ACTIVE_STATUSES = new Set(['RECEIVED', 'IN_PREPARATION', 'READY', 'DELIVERED_PAYMENT_DUE'])

// Sincroniza status dos pedidos ativos com a API
async function syncActiveOrders(orders: LocalOrder[]): Promise<LocalOrder[]> {
  const activeIds = orders.filter(o => ACTIVE_STATUSES.has(o.status)).map(o => o.id)
  if (activeIds.length === 0) return orders

  try {
    // Busca todos os pedidos da API (sem phone pois é guest local)
    // Filtra apenas os que temos localmente e atualiza status
    const apiOrders = await ordersApi.getAll()
    let changed = false
    const updated = orders.map(local => {
      const remote = apiOrders.find(a => a.id === local.id)
      if (remote && remote.status !== local.status) {
        changed = true
        return { ...local, status: remote.status }
      }
      return local
    })
    if (changed) {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(updated))
    }
    return updated
  } catch {
    return orders
  }
}

export function Orders() {
  const [orders, setOrders] = useState<LocalOrder[]>(() => loadLocalOrders())
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null)
  const navigate = useNavigate()

  const hasActiveOrders = orders.some(o => ACTIVE_STATUSES.has(o.status))

  useEffect(() => {
    storeApi.getPublic()
      .then(s => { if (s.whatsappNumber) setWhatsappNumber(s.whatsappNumber) })
      .catch(() => {})
  }, [])

  // Polling: atualiza status dos pedidos ativos a cada 30s
  useEffect(() => {
    const sync = async () => {
      const updated = await syncActiveOrders(loadLocalOrders())
      setOrders(updated)
    }

    void sync() // roda imediatamente ao montar

    if (!hasActiveOrders) return // sem pedidos ativos, não precisa de polling

    const interval = setInterval(() => void sync(), 30000)
    return () => clearInterval(interval)
  }, [hasActiveOrders])

  // Recarrega ao voltar para a aba
  useEffect(() => {
    const onFocus = () => {
      void syncActiveOrders(loadLocalOrders()).then(setOrders)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const handleCancel = async (orderId: number) => {
    if (!window.confirm('Deseja mesmo cancelar este pedido?')) return
    try {
      const guestPhone = localStorage.getItem('fastfit_guest_phone')
      const phoneDigits = guestPhone ? guestPhone.replace(/\D/g, '') : undefined
      await ordersApi.cancel(orderId, phoneDigits ?? undefined)
      updateLocalOrderStatus(orderId, 'CANCELED')
      setOrders(loadLocalOrders())
    } catch (e) {
      console.error('Erro ao cancelar pedido', e)
      const msg = e instanceof Error ? e.message : 'Não foi possível cancelar o pedido. Tente novamente mais tarde.'
      window.alert(msg)
    }
  }

  const filtered = orders.filter(o =>
    !search ||
    o.id.toString().includes(search) ||
    o.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Meus Pedidos</h1>
        {hasActiveOrders && (
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            <span className={styles.liveText}>ao vivo</span>
          </div>
        )}
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <IconSearch size={16} color="var(--text-secondary)" />
          <input
            className={styles.search}
            placeholder="Buscar pedido ou produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <IconOrders size={40} color="var(--gray-mid)" />
            </span>
            <p className="empty-state-title">
              {search ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
            </p>
            <p className="empty-state-text">
              {search ? 'Tente outro termo' : 'Faça seu primeiro pedido!'}
            </p>
            {!search && (
              <button className={styles.shopBtn} onClick={() => navigate('/')}>
                Ver Cardápio
              </button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map(order => {
              const active = ACTIVE_STATUSES.has(order.status)
              const expanded = expandedId === order.id
              const bg = STATUS_BG[order.status] ?? '#F3F4F6'
              const color = STATUS_COLOR[order.status] ?? '#6B7280'
              const StatusIcon = STATUS_ICON_MAP[order.status] ?? IconClipboard
              const label = STATUS_LABEL[order.status] ?? order.status

              return (
                <div key={order.id} className={[styles.orderCard, active ? styles.orderActive : ''].join(' ')}>
                  <button
                    className={styles.orderHeader}
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                    aria-expanded={expanded}
                  >
                    <div className={styles.orderMeta}>
                      <div className={styles.orderIdRow}>
                        <span className={styles.orderId}>Pedido #{order.id}</span>
                        {active && <span className={styles.activePulse} />}
                      </div>
                      <span className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className={styles.badge} style={{ background: bg, color }}>
                      <StatusIcon size={13} color={color} style={{ marginRight: 4 }} />{label}
                    </span>
                  </button>

                  <div className={styles.itemsPreview}>
                    {order.items.slice(0, 2).map(i => (
                      <span key={i.id} className={styles.itemChip}>{i.quantity}× {i.productName}</span>
                    ))}
                    {order.items.length > 2 && (
                      <span className={styles.itemChipMore}>+{order.items.length - 2} mais</span>
                    )}
                  </div>

                  <div className={styles.orderFooter}>
                    <span className={styles.orderType}>
                      {order.type === 'DELIVERY'
                        ? <><IconMotorcycle size={13} style={{ marginRight: 4 }} />Delivery</>
                        : order.type === 'SCHEDULED'
                          ? <><IconCalendar size={13} style={{ marginRight: 4 }} />Encomenda</>
                          : <><IconWalking size={13} style={{ marginRight: 4 }} />Retirada</>
                      }
                    </span>
                    <span className={styles.orderTotal}>
                      R$ {order.totalAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  {expanded && (
                    <div className={styles.expandedSection}>
                      <div className={styles.divider} />
                      <p className={styles.expandLabel}>Itens do pedido</p>

                      {active && whatsappNumber && (
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Gostaria de acompanhar meu pedido #${order.id}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className={styles.waTrackBtn}
                        >
                          <IconWhatsapp size={16} color="white" style={{ marginRight: 6 }} />
                          Acompanhar pelo WhatsApp
                        </a>
                      )}

                      {order.status === 'RECEIVED' && (
                        <button className={styles.cancelOrderBtn} onClick={() => handleCancel(order.id)}>
                          Cancelar pedido
                        </button>
                      )}

                      <div className={styles.fullItemList}>
                        {order.items.map(i => (
                          <div key={i.id} className={styles.fullItem}>
                            <img
                              src={
                                i.productImage
                                  ? i.productImage.startsWith('http')
                                    ? i.productImage
                                    : `${BASE}${i.productImage}`
                                  : FALLBACK_IMG
                                }
                              alt={i.productName}
                              className={styles.fullItemImg}
                              onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }}
                            />
                            <span className={styles.fullItemName}>{i.productName}</span>
                            <span className={styles.fullItemQty}>{i.quantity}×</span>
                            <span className={styles.fullItemPrice}>
                              R$ {i.subtotal.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.scheduledDateTime && (
                        <>
                          <div className={styles.expandLabel}>Data da Encomenda</div>
                          <div className={styles.expandValue}>
                            <IconClock size={13} style={{ marginRight: 4 }} />{order.scheduledDateTime}
                          </div>
                        </>
                      )}
                      {order.deliveryAddress && (
                        <>
                          <p className={styles.expandLabel}>Endereço de entrega</p>
                          <p className={styles.expandValue}>{order.deliveryAddress}</p>
                        </>
                      )}
                      {order.notes && (
                        <>
                          <p className={styles.expandLabel}>Observações</p>
                          <p className={styles.expandValue}>{order.notes}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
