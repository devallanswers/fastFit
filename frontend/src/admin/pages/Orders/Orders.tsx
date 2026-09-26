import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiOrder, ApiDeliveryDriver, storeApi } from '../../../services/api'
import { printThermalOrder } from '../../utils/thermalPrint'
import { IconClipboard, IconChefHat, IconMotorcycle, IconCheckCircle, IconXCircle, IconSearch, IconPrinter, IconChevronRight } from '../../../components/Icon/Icon'

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const beep = (start: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
      osc.start(start); osc.stop(start + 0.18)
    }
    beep(ctx.currentTime)
    beep(ctx.currentTime + 0.22)
  } catch { /* audio bloqueado */ }
}

function notifyNewOrder(order: ApiOrder) {
  playNotificationSound()
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification('🛎️ Novo pedido!', {
      body: `Pedido #${order.id} de ${order.userName} — R$ ${order.totalAmount.toFixed(2).replace('.', ',')}`,
      icon: '/favicon.ico',
      tag: `order-${order.id}`,
    })
    setTimeout(() => n.close(), 8000)
  }
}

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=60&h=60&fit=crop'

const STATUSES = ['RECEIVED', 'IN_PREPARATION', 'READY', 'FINISHED', 'DELIVERED_PAYMENT_DUE', 'CANCELED']
const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recebido', IN_PREPARATION: 'Em preparo',
  READY: 'Pronto para entrega', FINISHED: 'Entregue', DELIVERED_PAYMENT_DUE: 'Entregue — falta pagar', CANCELED: 'Cancelado',
}
const STATUS_CLASS: Record<string, string> = {
  RECEIVED: 'badgeReceived', IN_PREPARATION: 'badgePrep',
  READY: 'badgeReady', FINISHED: 'badgeFinished', DELIVERED_PAYMENT_DUE: 'badgeReady', CANCELED: 'badgeCanceled',
}

// ── Helpers de fuso horário (America/Sao_Paulo) ───────────────────────────────

function toBRDateString(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
}

function getDayKey(iso: string): string {
  return toBRDateString(iso)
}

function getMonthKey(iso: string): string {
  const str = new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit',
  }) // "04/2026"
  const [month, year] = str.split('/')
  return `${year}-${month}` // "2026-04"
}

function todayKeyBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-')
}

function thisMonthKeyBR(): string {
  return todayKeyBR().slice(0, 7)
}

function formatDayLabel(key: string): string {
  const date = new Date(key + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Hoje'
  if (isSameDay(date, yesterday)) return 'Ontem'

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

interface DayGroup { dayKey: string; orders: ApiOrder[] }
interface MonthGroup { monthKey: string; days: DayGroup[] }

function groupOrders(orders: ApiOrder[]): MonthGroup[] {
  const monthMap = new Map<string, Map<string, ApiOrder[]>>()

  for (const o of orders) {
    const mk = getMonthKey(o.createdAt)
    const dk = getDayKey(o.createdAt)
    if (!monthMap.has(mk)) monthMap.set(mk, new Map())
    const dayMap = monthMap.get(mk)!
    if (!dayMap.has(dk)) dayMap.set(dk, [])
    dayMap.get(dk)!.push(o)
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, dayMap]) => ({
      monthKey,
      days: Array.from(dayMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dayKey, orders]) => ({ dayKey, orders })),
    }))
}

// ── Componente principal ──────────────────────────────────────────────────────
export function AdminOrders() {
  const [orders, setOrders]       = useState<ApiOrder[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [updating, setUpdating]   = useState<number | null>(null)
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [storeName, setStoreName] = useState('FastFit Store')
  const [newOrderToast, setNewOrderToast] = useState<ApiOrder | null>(null)
  const [pixConfirmed, setPixConfirmed] = useState<Set<number>>(new Set())
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [drivers, setDrivers] = useState<ApiDeliveryDriver[]>([])

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const knownIds = useRef<Set<number>>(new Set())
  const firstLoad = useRef(true)

  useEffect(() => { requestNotificationPermission() }, [])

  useEffect(() => {
    storeApi.getPublic().then(s => { if (s.storeName) setStoreName(s.storeName) }).catch(() => {})
    adminApi.getDrivers().then(setDrivers).catch(() => {})
  }, [])

  const load = async () => {
    try {
      const fetched = await adminApi.getOrders()

      if (firstLoad.current) {
        fetched.forEach(o => knownIds.current.add(o.id))
        firstLoad.current = false

        const todayMonth = thisMonthKeyBR()
        const todayDay   = todayKeyBR()
        const months = new Set(fetched.map(o => getMonthKey(o.createdAt)))
        const days   = new Set(fetched.map(o => getDayKey(o.createdAt)))

        setCollapsedMonths(new Set([...months].filter(m => m !== todayMonth)))
        setCollapsedDays(new Set([...days].filter(d => d !== todayDay)))
      } else {
        const newOrders = fetched.filter(o => !knownIds.current.has(o.id) && o.status === 'RECEIVED')
          newOrders.forEach(o => {
          knownIds.current.add(o.id)
          notifyNewOrder(o)
          setNewOrderToast(o)
          if (toastTimeout.current) clearTimeout(toastTimeout.current)
          toastTimeout.current = setTimeout(() => setNewOrderToast(null), 8000)
            setTimeout(() => printThermalOrder(o, storeName), 300)
        })
        fetched.forEach(o => knownIds.current.add(o.id))
      }

      setOrders(fetched)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const interval = setInterval(() => void load(), 15000)
    return () => clearInterval(interval)
  }, [storeName])

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdating(orderId)
    try {
      const updated = await adminApi.updateOrderStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
    } finally { setUpdating(null) }
  }

  const handleConfirmPix = async (orderId: number) => {
    setUpdating(orderId)
    try {
      const updated = await adminApi.updateOrderStatus(orderId, 'IN_PREPARATION')
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      setPixConfirmed(prev => new Set([...prev, orderId]))
    } catch { } finally { setUpdating(null) }
  }

  const isPixPending = (o: ApiOrder) =>
    o.paymentMethod === 'PIX' && o.status === 'RECEIVED' && !pixConfirmed.has(o.id)
  const isPixConfirmedFn = (o: ApiOrder) =>
    o.paymentMethod === 'PIX' && (o.status !== 'RECEIVED' || pixConfirmed.has(o.id))

  const toggleMonth = (mk: string) =>
    setCollapsedMonths(prev => { const s = new Set(prev); s.has(mk) ? s.delete(mk) : s.add(mk); return s })
  const toggleDay = (dk: string) =>
    setCollapsedDays(prev => { const s = new Set(prev); s.has(dk) ? s.delete(dk) : s.add(dk); return s })

  const filtered = orders.filter(o => {
    const matchSearch = !search
      || o.id.toString().includes(search)
      || o.userName.toLowerCase().includes(search.toLowerCase())
      || (o.userEmail ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const groups = groupOrders(filtered)
  const dayTotal = (dayOrders: ApiOrder[]) =>
    dayOrders
      .filter(o => o.status !== 'CANCELED')
      .reduce((s, o) => s + o.totalAmount, 0)
  const activeCount = (dayOrders: ApiOrder[]) =>
    dayOrders.filter(o => ['RECEIVED', 'IN_PREPARATION', 'READY'].includes(o.status)).length

  return (
    <AdminLayout
      title="Pedidos"
      actions={
        <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="liveDot" /> Atualização automática · Impressão automática ativa
        </span>
      }
    >
      <div className="tableCard" style={{ marginBottom: 16 }}>
        <div className="tableHeader" style={{ flexWrap: 'wrap', gap: 12 }}>
          <span className="tableTitle">Todos os Pedidos</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="searchBar">
              <IconSearch size={15} color='#94A3B8' />
              <input
                className="searchInput"
                placeholder="Buscar por ID, nome ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="formInput formSelect"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="">Todos os status</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Nenhum pedido encontrado</div>
      ) : (
        groups.map(monthGroup => {
          const monthCollapsed = collapsedMonths.has(monthGroup.monthKey)
          const monthOrders = monthGroup.days.flatMap(d => d.orders)
          const monthRevenue = dayTotal(monthOrders)

          return (
            <div key={monthGroup.monthKey} style={{ marginBottom: 24 }}>
              <button
                onClick={() => toggleMonth(monthGroup.monthKey)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#1E293B', color: 'white', border: 'none', borderRadius: 12,
                  padding: '12px 18px', cursor: 'pointer', marginBottom: monthCollapsed ? 0 : 12,
                  fontWeight: 700, fontSize: 14, textTransform: 'capitalize',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconChevronRight
                    size={16}
                    style={{ transform: monthCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}
                  />
                  📅 {formatMonthLabel(monthGroup.monthKey)}
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ opacity: 0.8 }}>{monthOrders.length} pedido{monthOrders.length !== 1 ? 's' : ''}</span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 10px', fontWeight: 800 }}>
                    R$ {monthRevenue.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </button>

              {!monthCollapsed && monthGroup.days.map(dayGroup => {
                const dayCollapsed = collapsedDays.has(dayGroup.dayKey)
                const revenue = dayTotal(dayGroup.orders)
                const active = activeCount(dayGroup.orders)
                const isToday = dayGroup.dayKey === todayKeyBR()

                return (
                  <div key={dayGroup.dayKey} style={{ marginBottom: 12 }}>
                    <button
                      onClick={() => toggleDay(dayGroup.dayKey)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: isToday ? '#F0FDF4' : '#F8FAFC',
                        border: `1.5px solid ${isToday ? '#86EFAC' : '#E2E8F0'}`,
                        borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
                        marginBottom: dayCollapsed ? 0 : 8, fontWeight: 600, fontSize: 13,
                        color: isToday ? '#166534' : '#475569',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconChevronRight
                          size={14}
                          style={{ transform: dayCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}
                        />
                        {isToday ? '🟢' : '📋'} {formatDayLabel(dayGroup.dayKey)}
                        {active > 0 && (
                          <span style={{
                            background: '#DCFCE7', color: '#166534', borderRadius: 20,
                            padding: '1px 8px', fontSize: 11, fontWeight: 700,
                          }}>
                            {active} ativo{active !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#94A3B8' }}>{dayGroup.orders.length} pedido{dayGroup.orders.length !== 1 ? 's' : ''}</span>
                        <span style={{ fontWeight: 800, color: '#ff8200' }}>R$ {revenue.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </button>

                    {!dayCollapsed && (
                      <div className="tableCard" style={{ marginBottom: 0 }}>
                        <div className="tableWrapper">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Pedido</th><th>Cliente</th><th>Tipo</th>
                                <th>Total</th><th>Horário</th><th>Status</th><th>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayGroup.orders.map(o => (
                                <>
                                  <tr
                                    key={o.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                                  >
                                    <td><strong>#{o.id}</strong></td>
                                    <td>
                                      <div style={{ fontWeight: 700 }}>{o.userName}</div>
                                      {o.userEmail && <div style={{ fontSize: 12, color: '#64748B' }}>{o.userEmail}</div>}
                                    </td>
                                    <td>
                                      <span style={{ fontSize: 13 }}>
                                        {o.type === 'DELIVERY' ? '🛵 Entrega' : o.type === 'SCHEDULED' ? '📅 Encomenda' : '🏃 Retirada'}
                                      </span>
                                    </td>
                                    <td><strong>R$ {o.totalAmount.toFixed(2).replace('.', ',')}</strong></td>
                                    <td style={{ fontSize: 13, color: '#64748B' }}>
                                      {new Date(o.createdAt).toLocaleTimeString('pt-BR', {
                                        timeZone: 'America/Sao_Paulo',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </td>
                                    <td>
                                      <span className={`badge ${STATUS_CLASS[o.status]}`}>
                                        {STATUS_LABELS[o.status]}
                                      </span>
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                          className="formInput formSelect"
                                          value={o.status}
                                          disabled={updating === o.id}
                                          onChange={e => void handleStatusChange(o.id, e.target.value)}
                                          style={{ width: 160, fontSize: 13, padding: '6px 28px 6px 10px' }}
                                        >
                                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                        </select>

                                        {o.type !== 'PICKUP' && (
                                          <select className="formInput formSelect" value={o.deliveryDriverId ?? ''} onChange={e => e.target.value && void adminApi.assignDriver(o.id, Number(e.target.value)).then(updated => setOrders(prev => prev.map(x => x.id === updated.id ? updated : x)))} style={{ width: 145, fontSize: 13, padding: '6px 28px 6px 10px' }}>
                                            <option value="">Entregador</option>
                                            {drivers.filter(d => d.active || d.id === o.deliveryDriverId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                          </select>
                                        )}

                                        {isPixPending(o) && (
                                          <button
                                            title="Confirmar pagamento Pix"
                                            onClick={() => void handleConfirmPix(o.id)}
                                            disabled={updating === o.id}
                                            style={{
                                              background: '#DCFCE7', border: '1px solid #86EFAC',
                                              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                              fontSize: 12, fontWeight: 700, color: '#166534',
                                              flexShrink: 0, whiteSpace: 'nowrap',
                                            }}
                                          >✅ Pix pago</button>
                                        )}
                                        {isPixConfirmedFn(o) && (
                                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 700, flexShrink: 0 }}>
                                            💚 Pix confirmado
                                          </span>
                                        )}

                                        <button
                                          title="Reimprimir comanda"
                                          onClick={() => printThermalOrder(o, storeName)}
                                          style={{
                                            background: '#F1F5F9', border: '1px solid #E2E8F0',
                                            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                            fontSize: 15, lineHeight: 1, flexShrink: 0,
                                          }}
                                        ><IconPrinter size={15} /></button>
                                      </div>
                                    </td>
                                  </tr>

                                  {expanded === o.id && (
                                    <tr key={`${o.id}-detail`}>
                                      <td colSpan={7} style={{ background: '#F8FAFC', padding: '16px 20px' }}>
                                        <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13, color: '#64748B', textTransform: 'uppercase' }}>
                                          Itens do Pedido
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                          {o.items.map(i => (
                                            <div key={i.id} style={{
                                              display: 'flex', alignItems: 'center', gap: 12,
                                              background: 'white', border: '1px solid #E2E8F0',
                                              borderRadius: 10, padding: '8px 12px',
                                            }}>
                                              <img
                                                src={
                                                  i.productImage
                                                    ? i.productImage.startsWith('http')
                                                      ? i.productImage
                                                      : `${BASE}${i.productImage}`
                                                    : FALLBACK_IMG
                                            }
                                                alt={i.productName}
                                                onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }}
                                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#F1F5F9' }}
                                              />
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{i.productName}</div>
                                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                                  {i.quantity}x · R$ {i.price.toFixed(2).replace('.', ',')} / un.
                                                </div>
                                                {i.packageSelectionsJson && (() => {
                                                  try {
                                                    const sels = JSON.parse(i.packageSelectionsJson) as Array<{ slotId: number; slotName?: string; productNames?: string[] }>
                                                    return (
                                                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {sels.map((s, idx) => (
                                                          <div key={idx} style={{ fontSize: 11, color: '#64748B' }}>
                                                            <span style={{ fontWeight: 700, color: '#2E7D5B' }}>
                                                              {s.slotName ?? `Slot ${s.slotId}`}:
                                                            </span>{' '}
                                                            {s.productNames?.join(', ') ?? '—'}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )
                                                  } catch { return null }
                                                })()}
                                              </div>
                                              <span style={{ fontWeight: 800, fontSize: 14, color: '#ff8200', flexShrink: 0 }}>
                                                R$ {i.subtotal.toFixed(2).replace('.', ',')}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                        {o.deliveryAddress && (
                                          <p style={{ marginTop: 10, fontSize: 13, color: '#64748B' }}>📍 {o.deliveryAddress}</p>
                                        )}
                                        {o.notes && (
                                          <p style={{ marginTop: 6, fontSize: 13, color: '#64748B' }}>📝 {o.notes}</p>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {newOrderToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#1a6b3c', color: '#fff', borderRadius: 16, padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 14,
          animation: 'slideInRight 0.3s ease', maxWidth: 340, cursor: 'pointer',
        }} onClick={() => setNewOrderToast(null)}>
          <span style={{ fontSize: 32 }}>🛎️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Novo pedido #{newOrderToast.id}!</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{newOrderToast.userName}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {newOrderToast.type === 'DELIVERY' ? '🛵 Entrega' : newOrderToast.type === 'PICKUP' ? '🏃 Retirada' : '📦 Encomenda'}
              {' · '}R$ {newOrderToast.totalAmount.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, padding: 0 }}>✕</button>
        </div>
      )}
    </AdminLayout>
  )
}
