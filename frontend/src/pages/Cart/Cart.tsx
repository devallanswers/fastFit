import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { ordersApi, storeApi, ApiStoreSettings, GuestCartItem } from '../../services/api'
import { useToastContext } from '../../context/ToastContext'
import { CartItem } from '../../components/CartItem/CartItem'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { AddressSection, loadAddresses } from '../../components/AddressSection/AddressSection'
import { IconMotorcycle, IconWalking, IconMapPin, IconCreditCard, IconDollarSign, IconSmartphone, IconAlertCircle, IconCart, IconClock, IconCalendar, IconEdit } from '../../components/Icon/Icon'
import styles from './Cart.module.css'
import { saveLocalOrder } from '../Orders/Orders'

type PaymentMethod = 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT'
type CardType      = 'DEBIT' | 'CREDIT'
type OrderMode     = 'NOW' | 'SCHEDULED'
type NowType       = 'DELIVERY' | 'PICKUP'
type ScheduledHow  = 'DELIVERY' | 'PICKUP'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix', CASH: 'Dinheiro', DEBIT: 'Débito', CREDIT: 'Crédito',
}

export const GUEST_NAME_KEY  = 'fastfit_guest_name'
export const GUEST_PHONE_KEY = 'fastfit_guest_phone'

function formatPhoneInput(value: string) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

export function Cart() {
  const { items, getTotal, clearCart, isLoading } = useCart()
  const { toast } = useToastContext()
  const navigate  = useNavigate()

  const [orderMode,    setOrderMode]    = useState<OrderMode>('NOW')
  const [nowType,      setNowType]      = useState<NowType>('DELIVERY')
  const [scheduledHow, setScheduledHow] = useState<ScheduledHow>('DELIVERY')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [pickupTime,    setPickupTime]    = useState('')

  const [storeSettings, setStoreSettings] = useState<ApiStoreSettings | null>(null)
  const [placing,  setPlacing]  = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [cardType,      setCardType]      = useState<CardType>('DEBIT')
  const [changeFor,     setChangeFor]     = useState('')

  const [guestName,      setGuestName]      = useState(() => localStorage.getItem(GUEST_NAME_KEY)  ?? '')
  const [guestPhone,     setGuestPhone]     = useState(() => formatPhoneInput(localStorage.getItem(GUEST_PHONE_KEY) ?? ''))
  const [orderNotes,     setOrderNotes]     = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [guestError,     setGuestError]     = useState('')
  const [editingGuest,   setEditingGuest]   = useState(false)

  // Só guarda o id e a string formatada — o estado do form fica no AddressSection
  const initAddr = () => {
    const saved = loadAddresses()
    const def   = saved.find(a => a.isDefault) ?? saved[0]
    if (!def) return { id: null, str: '' }
    return {
      id:  def.id,
      str: `${def.street}, ${def.number}, ${def.neighborhood}${def.reference ? ` (Ref: ${def.reference})` : ''}`,
    }
  }
  const [selectedAddrId,  setSelectedAddrId]  = useState<number | null>(() => initAddr().id)
  const [selectedAddrStr, setSelectedAddrStr] = useState<string>(() => initAddr().str)

  const handleAddrSelect = (id: number, str: string) => {
    setSelectedAddrId(id < 0 ? null : id)
    setSelectedAddrStr(str)
  }

  useEffect(() => {
    storeApi.getPublic().then(s => {
      setStoreSettings(s)
      if (!s.acceptDelivery && s.acceptPickup) setNowType('PICKUP')
      if (!s.acceptDelivery && !s.acceptPickup && s.acceptScheduled) setOrderMode('SCHEDULED')
    }).catch(() => {})
  }, [])

  const neighborhoodList: string[] | null = storeSettings?.deliveryNeighborhoods
    ? storeSettings.deliveryNeighborhoods.split(',').map(n => n.trim()).filter(Boolean)
    : null

  const effectiveType: 'DELIVERY' | 'PICKUP' | 'SCHEDULED' =
    orderMode === 'SCHEDULED' ? 'SCHEDULED'
    : nowType === 'DELIVERY'  ? 'DELIVERY' : 'PICKUP'

  const needsAddress =
    (orderMode === 'NOW'       && nowType      === 'DELIVERY') ||
    (orderMode === 'SCHEDULED' && scheduledHow === 'DELIVERY')

  const deliveryFee = needsAddress ? (storeSettings?.deliveryFee ?? 0) : 0
  const subtotal    = getTotal()
  const total       = subtotal + deliveryFee

  const minDate = (() => {
    const now = new Date()
    // Determine lead time in milliseconds: priority minutes -> hours -> days (legacy)
    const leadMinutes = storeSettings?.scheduledMinMinutesAhead
    const leadHours   = storeSettings?.scheduledMinHoursAhead
    const leadDays    = storeSettings?.scheduledMinDaysAhead ?? 1
    const leadMs = leadMinutes != null
      ? leadMinutes * 60 * 1000
      : (leadHours != null ? leadHours * 60 * 60 * 1000 : leadDays * 24 * 60 * 60 * 1000)
    const earliest = new Date(now.getTime() + leadMs)
    return earliest.toISOString().split('T')[0]
  })()

  const earliestAllowedMs = (() => {
    const leadMinutes = storeSettings?.scheduledMinMinutesAhead
    const leadHours   = storeSettings?.scheduledMinHoursAhead
    const leadDays    = storeSettings?.scheduledMinDaysAhead ?? 1
    const leadMs = leadMinutes != null
      ? leadMinutes * 60 * 1000
      : (leadHours != null ? leadHours * 60 * 60 * 1000 : leadDays * 24 * 60 * 60 * 1000)
    return Date.now() + leadMs
  })()

  const mapsUrl = storeSettings?.storeAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(storeSettings.storeAddress)}` : null

  const effectivePayment: PaymentMethod =
    paymentMethod === 'CASH' ? 'CASH' : paymentMethod === 'PIX' ? 'PIX' : cardType

  const validateOrder = (): string | null => {
    if (needsAddress && !selectedAddrStr) return 'Selecione ou cadastre um endereço de entrega'
    // exigir horário de retirada quando for pickup agora
    if (orderMode === 'NOW' && nowType === 'PICKUP' && !pickupTime) return 'Selecione o horário desejado para retirada'
    if (orderMode === 'SCHEDULED' && (!scheduledDate || !scheduledTime)) return 'Selecione a data e horário da encomenda'
    // validar antecedência mínima configurada
    if (orderMode === 'SCHEDULED' && scheduledDate && scheduledTime) {
      const selected = new Date(`${scheduledDate}T${scheduledTime}`)
      if (isNaN(selected.getTime())) return 'Data/hora inválida'
      if (selected.getTime() < earliestAllowedMs) return 'Escolha uma data/hora respeitando o prazo mínimo de antecedência configurado'
    }
    if (paymentMethod === 'CASH' && changeFor && Number(changeFor) < total) return 'O troco deve ser maior que o total'
    return null
  }

  const handleFinalize = async () => {
    const err = validateOrder()
    if (err) { setErrorMsg(err); return }
    setErrorMsg('')
    if (!guestName.trim() || !guestPhone.trim()) { setEditingGuest(false); setShowGuestModal(true); return }
    // abrir modal de confirmação antes de enviar
    setShowConfirmModal(true)
  }

  const handleGuestConfirm = async () => {
    setGuestError('')
    const name  = guestName.trim()
    const phone = guestPhone.trim()
    if (!name) { setGuestError('Informe seu nome'); return }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setGuestError('Informe um telefone válido com DDD'); return
    }
    localStorage.setItem(GUEST_NAME_KEY,  name)
    localStorage.setItem(GUEST_PHONE_KEY, phone)
    setShowGuestModal(false)
    // depois de informar dados abrir modal de confirmação
    setShowConfirmModal(true)
  }

  const handleGuestSave = async () => {
    setGuestError('')
    const name  = guestName.trim()
    const phone = guestPhone.trim()
    if (!name) { setGuestError('Informe seu nome'); return }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setGuestError('Informe um telefone válido com DDD'); return
    }
    localStorage.setItem(GUEST_NAME_KEY,  name)
    localStorage.setItem(GUEST_PHONE_KEY, phone)
    setShowGuestModal(false)
    setEditingGuest(false)
    // se salvou dados, mostrar confirmação antes de enviar
    setShowConfirmModal(true)
  }

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const confirmAndSubmit = async () => {
    setShowConfirmModal(false)
    await submitOrder(guestName, guestPhone)
  }

  const submitOrder = async (name: string, phone: string) => {
    setPlacing(true)
    setErrorMsg('')
    try {
      const scheduledDateTime = orderMode === 'SCHEDULED' && scheduledDate && scheduledTime
        ? `${scheduledDate}T${scheduledTime}` : undefined

      const notes = [
    orderMode === 'NOW' && nowType === 'PICKUP' && pickupTime ? `Retirada às ${pickupTime}` : undefined,
    orderNotes.trim() || undefined,
  ].filter(Boolean).join(' · ') || undefined

      const guestCartItems: GuestCartItem[] = items.map(i => ({
        productId:             i.isPackage ? null : Number(i.id),
        packageId:             i.packageId ?? null,
        productName:           i.name,
        productImage:          (i.image && !i.image.includes('unsplash')) ? i.image : null,
        quantity:              i.quantity,
        priceSnapshot:         i.priceSnapshot,
        packageSelectionsJson: i.packageSelectionsJson ?? null,
      }))

      const order = await ordersApi.create(
        effectiveType,
        needsAddress ? selectedAddrStr || undefined : undefined,
        notes,
        effectivePayment,
        paymentMethod === 'CASH' && changeFor ? Number(changeFor) : undefined,
        scheduledDateTime,
        name, phone.replace(/\D/g, ''),
        guestCartItems,
      )

      saveLocalOrder({
        id: order.id, status: order.status,
        totalAmount: Number(order.totalAmount), type: order.type,
        deliveryAddress:   order.deliveryAddress   ?? undefined,
        notes:             order.notes             ?? undefined,
        paymentMethod:     order.paymentMethod     ?? undefined,
        scheduledDateTime: order.scheduledDateTime ?? undefined,
        createdAt:         order.createdAt         ?? new Date().toISOString(),
        items: order.items.map(i => ({
          id: i.id, productName: i.productName, productImage: i.productImage ?? null,
          quantity: i.quantity, price: Number(i.price), subtotal: Number(i.subtotal),
        })),
      })

      localStorage.setItem(GUEST_NAME_KEY,  name)
      localStorage.setItem(GUEST_PHONE_KEY, phone)
      await clearCart()

      if (effectivePayment === 'PIX' && order.pixCode) {
        navigate('/pix', { state: { code: order.pixCode, orderId: order.id, total: Number(order.totalAmount) } })
      } else {
        toast.success(orderMode === 'SCHEDULED' ? '🎉 Encomenda realizada!' : 'Pedido realizado com sucesso!')
        navigate('/orders')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao criar pedido')
    } finally { setPlacing(false) }
  }

  const PickupBlock = ({ showTimeField }: { showTimeField: boolean }) => (
    <>
      {storeSettings?.storeAddress && (
        <div className={styles.pickupCard}>
          <span className={styles.pickupIcon}><IconMapPin size={20} color="var(--primary)" /></span>
          <div className={styles.pickupInfo}>
            <span className={styles.pickupAddress}>{storeSettings.storeAddress}</span>
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.mapsLink}>Ver no Google Maps →</a>}
          </div>
        </div>
      )}
      {showTimeField && (
        <div className={styles.pickupTimeRow}>
          <label className={styles.scheduledLabel}><IconClock size={13} style={{ marginRight: 4 }} />Horário desejado para retirada</label>
          <input type="time" className={styles.scheduledInput} value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
        </div>
      )}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {guestName
          ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className={styles.title}>Olá, {guestName.split(' ')[0]}! 👋</h1>
              <button className={styles.editGuestBtn} onClick={() => { setEditingGuest(true); setShowGuestModal(true) }} title="Editar nome e telefone">
                <IconEdit size={16} />
              </button>
            </div>
          ) : <h1 className={styles.title}>Meu Carrinho</h1>
        }
        {items.length > 0 && (
          <button className={styles.clearBtn} onClick={() => void clearCart()}>Limpar</button>
        )}
      </div>

      <div className={styles.content}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><IconCart size={40} color="var(--gray-mid)" /></span>
            <p className={styles.emptyTitle}>Carrinho vazio</p>
            <p className={styles.emptyText}>Adicione produtos ao seu carrinho</p>
            <button className={styles.shopBtn} onClick={() => navigate('/')}>Ver Produtos</button>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {items.map(item => <CartItem key={item.cartItemId} item={item} />)}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionLabel}>Observações</p>
              <textarea
                className={styles.notesInput}
                placeholder="Alguma observação para o pedido? Ex: 'Sem alface no sanduíche', 'Deixe na portaria', etc."
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                rows={4}
              />
            </div>

            {/* MODO */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Quando você quer receber?</p>
              <div className={styles.modeTabs}>
                {(storeSettings?.acceptDelivery || storeSettings?.acceptPickup) && (
                  <button className={[styles.modeTab, orderMode === 'NOW' ? styles.modeTabActive : ''].join(' ')} onClick={() => setOrderMode('NOW')}>
                    <span className={styles.modeTabIcon}><IconClock size={18} /></span>
                    <span className={styles.modeTabLabel}>Agora</span>
                    <span className={styles.modeTabSub}>Pedido normal</span>
                  </button>
                )}
                {storeSettings?.acceptScheduled && (
                  <button className={[styles.modeTab, orderMode === 'SCHEDULED' ? styles.modeTabActive : ''].join(' ')} onClick={() => setOrderMode('SCHEDULED')}>
                    <span className={styles.modeTabIcon}><IconCalendar size={18} /></span>
                    <span className={styles.modeTabLabel}>Encomenda</span>
                    <span className={styles.modeTabSub}>Agendar data</span>
                  </button>
                )}
              </div>
            </div>

            {/* AGORA */}
            {orderMode === 'NOW' && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Como deseja receber?</p>
                <div className={styles.typeOptions}>
                  {storeSettings?.acceptDelivery !== false && (
                    <button className={[styles.typeBtn, nowType === 'DELIVERY' ? styles.typeActive : ''].join(' ')} onClick={() => setNowType('DELIVERY')}>
                      <IconMotorcycle size={16} style={{ marginRight: 6 }} /> Delivery
                    </button>
                  )}
                  {storeSettings?.acceptPickup !== false && (
                    <button className={[styles.typeBtn, nowType === 'PICKUP' ? styles.typeActive : ''].join(' ')} onClick={() => setNowType('PICKUP')}>
                      <IconWalking size={16} style={{ marginRight: 6 }} /> Retirada
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                  {nowType === 'DELIVERY' && (
                    <AddressSection
                      neighborhoodList={neighborhoodList}
                      selectedId={selectedAddrId}
                      onSelect={handleAddrSelect}
                    />
                  )}
                  {nowType === 'PICKUP' && <PickupBlock showTimeField={true} />}
                </div>
              </div>
            )}

            {/* ENCOMENDA */}
            {orderMode === 'SCHEDULED' && (
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Data e horário da encomenda</p>
                {storeSettings?.scheduledStartTime && storeSettings?.scheduledEndTime && (
                  <p className={styles.scheduledNote}><IconClock size={13} style={{ marginRight: 4 }} />Entregamos entre {storeSettings.scheduledStartTime} e {storeSettings.scheduledEndTime}</p>
                )}
                <div className={styles.scheduledRow}>
                  <div className={styles.scheduledField}>
                    <label className={styles.scheduledLabel}>Data *</label>
                    <input type="date" className={styles.scheduledInput} value={scheduledDate} min={minDate} onChange={e => setScheduledDate(e.target.value)} />
                  </div>
                  <div className={styles.scheduledField}>
                    <label className={styles.scheduledLabel}>Horário *</label>
                    <input type="time" className={styles.scheduledInput} value={scheduledTime}
                      min={storeSettings?.scheduledStartTime ?? undefined}
                      max={storeSettings?.scheduledEndTime ?? undefined}
                      onChange={e => setScheduledTime(e.target.value)} />
                  </div>
                </div>
                <p className={styles.sectionLabel} style={{ marginTop: 18 }}>Como deseja receber?</p>
                <div className={styles.typeOptions}>
                  <button className={[styles.typeBtn, scheduledHow === 'DELIVERY' ? styles.typeActive : ''].join(' ')} onClick={() => setScheduledHow('DELIVERY')}>
                    <IconMotorcycle size={16} style={{ marginRight: 6 }} /> Entrega em casa
                  </button>
                  <button className={[styles.typeBtn, scheduledHow === 'PICKUP' ? styles.typeActive : ''].join(' ')} onClick={() => setScheduledHow('PICKUP')}>
                    <IconWalking size={16} style={{ marginRight: 6 }} /> Vou retirar
                  </button>
                </div>
                <div style={{ marginTop: 14 }}>
                  {scheduledHow === 'DELIVERY' && (
                    <AddressSection
                      neighborhoodList={neighborhoodList}
                      selectedId={selectedAddrId}
                      onSelect={handleAddrSelect}
                    />
                  )}
                  {scheduledHow === 'PICKUP' && <PickupBlock showTimeField={false} />}
                </div>
              </div>
            )}

            {/* PAGAMENTO */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Forma de pagamento</p>
              <p className={styles.paymentNote}>Pagamento na entrega · Sem cobrança antecipada</p>
              <div className={styles.paymentGrid}>
                {(['PIX', 'CASH', 'CARD'] as const).map(method => {
                  const isCard   = method === 'CARD'
                  const isActive = isCard ? (paymentMethod === 'DEBIT' || paymentMethod === 'CREDIT') : paymentMethod === method
                  return (
                    <button key={method} className={[styles.payBtn, isActive ? styles.payBtnActive : ''].join(' ')}
                      onClick={() => { if (isCard) setPaymentMethod(cardType); else setPaymentMethod(method as PaymentMethod) }}>
                      <span className={styles.payIcon}>{isCard ? <IconCreditCard size={18} /> : method === 'PIX' ? <IconSmartphone size={18} /> : <IconDollarSign size={18} />}</span>
                      <span className={styles.payLabel}>{isCard ? 'Cartão' : PAYMENT_LABELS[method as PaymentMethod]}</span>
                    </button>
                  )
                })}
              </div>
              {(paymentMethod === 'DEBIT' || paymentMethod === 'CREDIT') && (
                <div className={styles.cardTypes}>
                  <button className={[styles.cardTypeBtn, cardType === 'DEBIT' ? styles.cardTypeActive : ''].join(' ')} onClick={() => { setCardType('DEBIT'); setPaymentMethod('DEBIT') }}>Débito</button>
                  <button className={[styles.cardTypeBtn, cardType === 'CREDIT' ? styles.cardTypeActive : ''].join(' ')} onClick={() => { setCardType('CREDIT'); setPaymentMethod('CREDIT') }}>Crédito</button>
                </div>
              )}
              {paymentMethod === 'CASH' && (
                <div className={styles.changeWrap}>
                  <label className={styles.changeLabel}>Precisa de troco?</label>
                  <div className={styles.changeInputWrap}>
                    <span className={styles.changeCurrency}>R$</span>
                    <input className={styles.changeInput} type="number" min={total} step="1"
                      value={changeFor} onChange={e => setChangeFor(e.target.value)}
                      placeholder={`${Math.ceil(total / 10) * 10},00 (opcional)`} />
                  </div>
                  {changeFor && Number(changeFor) >= total && (
                    <p className={styles.changeInfo}>Troco: R$ {(Number(changeFor) - total).toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
              )}
            </div>

            {/* RESUMO */}
            <div className={styles.summary}>
              <div className={styles.summaryRow}><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              <div className={styles.summaryRow}>
                <span>Taxa de entrega</span>
                {deliveryFee > 0 ? <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span> : <span className={styles.free}>{!needsAddress ? 'N/A' : 'Grátis'}</span>}
              </div>
              <div className={[styles.summaryRow, styles.total].join(' ')}><span>Total</span><span>R$ {total.toFixed(2).replace('.', ',')}</span></div>
              <div className={styles.paymentSummary}>{PAYMENT_LABELS[effectivePayment]} na entrega</div>
            </div>

            {errorMsg && <div className={styles.errorBox}><IconAlertCircle size={15} style={{ flexShrink: 0 }} /> {errorMsg}</div>}

            {/* MODAL CONFIRMAÇÃO FINAL */}
            {showConfirmModal && (
              <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false) }}>
                <div className={styles.modal}>
                  <div className={styles.modalHandle} />
                  <h2 className={styles.modalTitle}>Confirme seu pedido</h2>
                  <p className={styles.modalSubtitle}>Revise antes de confirmar para evitar erros.</p>
                  <div style={{ maxHeight: '40vh', overflow: 'auto', marginBottom: 12 }}>
                    <div className={styles.modalField}><strong>Itens:</strong>
                      {items.map(i => (
                        <div key={i.cartItemId} style={{ marginTop: 6 }}>
                          {i.quantity}× {i.name} — R$ {(i.priceSnapshot * i.quantity).toFixed(2).replace('.', ',')}
                        </div>
                      ))}
                    </div>
                    <div className={styles.modalField} style={{ marginTop: 8 }}><strong>Total:</strong> R$ {total.toFixed(2).replace('.', ',')}</div>
                    {needsAddress && <div className={styles.modalField}><strong>Endereço:</strong><div style={{ marginTop:6 }}>{selectedAddrStr}</div></div>}
                    {orderMode === 'SCHEDULED' && scheduledDate && scheduledTime && (
                      <div className={styles.modalField}><strong>Encomenda p/:</strong> {scheduledDate} {scheduledTime}</div>
                    )}
                    {(orderMode === 'NOW' && nowType === 'PICKUP') && pickupTime && (
                      <div className={styles.modalField}><strong>Retirada:</strong> {pickupTime}</div>
                    )}
                    <div className={styles.modalField}><strong>Pagamento:</strong> {PAYMENT_LABELS[effectivePayment]}</div>
                    {orderNotes && (
                      <div className={styles.modalField}><strong>Observações:</strong> <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{orderNotes}</div></div>
                    )}
                    {changeFor && <div className={styles.modalField}><strong>Troco:</strong> R$ {Number(changeFor).toFixed(2).replace('.', ',')}</div>}
                    {paymentMethod === 'CASH' && changeFor && Number(changeFor) >= total}
                  </div>
                  <button className={styles.modalBtn} onClick={() => void confirmAndSubmit()} disabled={placing}>{placing ? 'Enviando...' : `Confirmar · R$ ${total.toFixed(2).replace('.', ',')}`}</button>
                  <button type="button" className={styles.modalBtnSecondary} onClick={() => setShowConfirmModal(false)} style={{ marginTop: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 15 }}>← Voltar ao carrinho</button>
                </div>
              </div>
            )}

            <button className={styles.finalizeBtn} onClick={() => void handleFinalize()} disabled={placing || isLoading}>
              {placing ? 'Processando...' : `Finalizar · R$ ${total.toFixed(2).replace('.', ',')}`}
            </button>
          </>
        )}
      </div>

      {/* MODAL IDENTIFICAÇÃO */}
      {showGuestModal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowGuestModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHandle} />
            <h2 className={styles.modalTitle}>Quase lá! 🎉</h2>
            <p className={styles.modalSubtitle}>Só precisamos do seu nome e telefone — salvamos para a próxima vez.</p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Nome *</label>
              <input className={styles.modalInput} type="text" placeholder="Seu nome"
                value={guestName} onChange={e => setGuestName(e.target.value)} autoFocus />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Telefone (WhatsApp) *</label>
              <input className={styles.modalInput} type="tel" placeholder="(00) 00000-0000"
                value={guestPhone} onChange={e => setGuestPhone(formatPhoneInput(e.target.value))} />
            </div>
            {guestError && <div className={styles.modalError}><IconAlertCircle size={14} style={{ flexShrink: 0 }} /> {guestError}</div>}
            <button className={styles.modalBtn} onClick={() => void (editingGuest ? handleGuestSave() : handleGuestConfirm())} disabled={placing}>
              {placing ? 'Processando...' : (editingGuest ? 'Salvar' : `Confirmar pedido · R$ ${total.toFixed(2).replace('.', ',')}`)}
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  )
}