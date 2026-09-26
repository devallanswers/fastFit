import { useState, useEffect } from 'react'
import { IconCheck, IconClock, IconMotorcycle, IconSmartphone, IconClipboard, IconDownload } from '../../../components/Icon/Icon'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiStoreSettings, ApiDeliveryDriver } from '../../../services/api'

// ── Schedule types ────────────────────────────────────────────────
type DayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

interface DaySchedule {
  day: DayKey
  active: boolean
  open: string
  close: string
}

const DAY_LABELS: Record<DayKey, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

const ALL_DAYS: DayKey[] = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']

const DEFAULT_SCHEDULE: DaySchedule[] = ALL_DAYS.map(day => ({
  day,
  active: day !== 'SUNDAY',
  open: '08:00',
  close: '22:00',
}))

function parseSchedule(json?: string | null): DaySchedule[] {
  if (!json) return DEFAULT_SCHEDULE
  try {
    const parsed = JSON.parse(json) as DaySchedule[]
    // Garantir que todos os dias estão presentes
    return ALL_DAYS.map(day => {
      const found = parsed.find(d => d.day === day)
      return found ?? { day, active: false, open: '08:00', close: '22:00' }
    })
  } catch { return DEFAULT_SCHEDULE }
}

// ── Component ─────────────────────────────────────────────────────
export function AdminSettings() {
  const [settings, setSettings] = useState<ApiStoreSettings | null>(null)
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE)
  const [form, setForm] = useState({
    open: false, storeName: '', storePhone: '', storeAddress: '',
    storeDescription: '', closedMessage: '', estimatedDeliveryMinutes: '45',
    acceptDelivery: true, acceptPickup: true, deliveryFee: '0',
    whatsappNumber: '', instagramUrl: '',
    adminPhoneNumbers: '',
    deliveryNeighborhoods: '',
    neighborhoodInput: '',
    acceptScheduled: false,
    scheduledStartTime: '08:00',
    scheduledEndTime: '18:00',
    scheduledMinDaysAhead: '1',
    scheduledMinHoursAhead: '0',
    scheduledMinMinutesAhead: '0',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [drivers, setDrivers] = useState<ApiDeliveryDriver[]>([])
  const [driverName, setDriverName] = useState('')
  const [driverPayment, setDriverPayment] = useState('')

  useEffect(() => {
    adminApi.getSettings().then(s => {
      setSettings(s)
      setForm({
        open: s.open, storeName: s.storeName ?? '', storePhone: s.storePhone ?? '',
        storeAddress: s.storeAddress ?? '', storeDescription: s.storeDescription ?? '',
        closedMessage: s.closedMessage ?? '',
        estimatedDeliveryMinutes: String(s.estimatedDeliveryMinutes),
        acceptDelivery: s.acceptDelivery, acceptPickup: s.acceptPickup,
        deliveryFee: String(s.deliveryFee ?? 0),
        whatsappNumber: s.whatsappNumber ?? '', adminPhoneNumbers: s.adminPhoneNumbers ?? '', instagramUrl: s.instagramUrl ?? '',
        deliveryNeighborhoods: s.deliveryNeighborhoods ?? '',
        neighborhoodInput: '',
        acceptScheduled: s.acceptScheduled ?? false,
        scheduledStartTime: s.scheduledStartTime ?? '08:00',
        scheduledEndTime: s.scheduledEndTime ?? '18:00',
        scheduledMinDaysAhead: String(s.scheduledMinDaysAhead ?? 1),
        scheduledMinHoursAhead: String(s.scheduledMinHoursAhead ?? 0),
        scheduledMinMinutesAhead: String(s.scheduledMinMinutesAhead ?? 0),
      })
      setSchedule(parseSchedule(s.scheduleJson))
    })
    adminApi.getDrivers().then(setDrivers)
  }, [])

  const addDriver = async () => {
    if (!driverName.trim()) return
    const driver = await adminApi.createDriver({ name: driverName.trim(), defaultPayment: driverPayment ? Number(driverPayment) : undefined })
    setDrivers(prev => [...prev, driver].sort((a, b) => a.name.localeCompare(b.name)))
    setDriverName(''); setDriverPayment('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await adminApi.updateSettings({
        ...form,
        deliveryNeighborhoods: form.deliveryNeighborhoods || null,
        acceptScheduled: form.acceptScheduled,
        scheduledStartTime: form.scheduledStartTime || null,
        scheduledEndTime: form.scheduledEndTime || null,
        scheduledMinDaysAhead: Number(form.scheduledMinDaysAhead) || 1,
        scheduledMinHoursAhead: Number(form.scheduledMinHoursAhead) || 0,
        scheduledMinMinutesAhead: Number(form.scheduledMinMinutesAhead) || 0,
        estimatedDeliveryMinutes: Number(form.estimatedDeliveryMinutes),
        deliveryFee: parseFloat(form.deliveryFee) || 0,
        scheduleJson: JSON.stringify(schedule),
        openingTime: null,   // migrado para scheduleJson
        closingTime: null,
        whatsappNumber: form.whatsappNumber || null,
        adminPhoneNumbers: form.adminPhoneNumbers || null,
        instagramUrl: form.instagramUrl || null,
      })
      setSettings(updated); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const F = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const updateDay = (day: DayKey, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => prev.map(d => d.day === day ? { ...d, [field]: value } : d))
  }

  // Aplicar mesmo horário para todos os dias ativos
  const applyToAll = (source: DaySchedule) => {
    setSchedule(prev => prev.map(d =>
      d.active ? { ...d, open: source.open, close: source.close } : d
    ))
  }

  const Toggle = ({ field, label, sub }: { field: 'open' | 'acceptDelivery' | 'acceptPickup' | 'acceptScheduled'; label: string; sub: string }) => (
    <div className="settingsRow">
      <div>
        <div className="settingsRowLabel">{label}</div>
        <div className="settingsRowSub">{sub}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={form[field] as boolean}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))} />
        <span className="toggleSlider" />
      </label>
    </div>
  )

  if (!settings) return (
    <AdminLayout title="Configurações da Loja">
      <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Carregando...</div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Configurações da Loja" actions={
      <button className="btn btnPrimary" onClick={() => void handleSave()} disabled={saving}>
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
      </button>
    }>
      <div className="settingsGrid">

        {/* Status geral */}
        <div className="tableCard">
          <div className="tableHeader"><span className="tableTitle">🏪 Status</span></div>
          <div className="settingsBody">
            <Toggle field="open" label="Loja aberta" sub="Clientes podem fazer pedidos" />
            <Toggle field="acceptDelivery" label="Aceitar delivery" sub="Entrega em endereço" />
            <Toggle field="acceptPickup" label="Aceitar retirada" sub="Cliente retira no local" />
            <div className="formGrid" style={{ padding: '12px 0 0' }}>
              <div className="formGroup formGroupFull">
                <label className="formLabel">Mensagem quando fechado</label>
                <input className="formInput" value={form.closedMessage} onChange={F('closedMessage')}
                  placeholder="Ex: Voltamos amanhã às 8h! 😊" />
              </div>
            </div>
          </div>
        </div>

        {/* Horários por dia da semana */}
        <div className="tableCard settingsFull">
          <div className="tableHeader">
            <span className="tableTitle">Horários de Funcionamento</span>
            <span className="tableSubtitle">Configure cada dia da semana individualmente</span>
          </div>
          <div className="settingsBody">
            {/* Header da tabela */}
            <div style={scheduleGrid}>
              <span style={scheduleColHeader}>Dia</span>
              <span style={{ ...scheduleColHeader, justifyContent: 'center' }}>Aberto</span>
              <span style={scheduleColHeader}>Abertura</span>
              <span style={scheduleColHeader}>Fechamento</span>
              <span style={scheduleColHeader}></span>
            </div>

            {schedule.map((day, i) => (
              <div key={day.day} style={{
                ...scheduleGrid,
                background: day.active ? 'white' : '#F8FAFC',
                borderTop: i === 0 ? '1px solid #E2E8F0' : undefined,
                borderBottom: '1px solid #E2E8F0',
                borderLeft: day.active ? '3px solid #2E7D5B' : '3px solid transparent',
              }}>
                {/* Dia */}
                <span style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: day.active ? '#1E293B' : '#94A3B8',
                  paddingLeft: 4,
                }}>
                  {DAY_LABELS[day.day]}
                </span>

                {/* Toggle ativo */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label className="toggle" style={{ transform: 'scale(0.85)' }}>
                    <input type="checkbox" checked={day.active}
                      onChange={e => updateDay(day.day, 'active', e.target.checked)} />
                    <span className="toggleSlider" />
                  </label>
                </div>

                {/* Horário abertura */}
                <input
                  type="time"
                  value={day.open}
                  disabled={!day.active}
                  onChange={e => updateDay(day.day, 'open', e.target.value)}
                  style={{
                    ...timeInput,
                    opacity: day.active ? 1 : 0.35,
                    cursor: day.active ? 'text' : 'not-allowed',
                  }}
                />

                {/* Horário fechamento */}
                <input
                  type="time"
                  value={day.close}
                  disabled={!day.active}
                  onChange={e => updateDay(day.day, 'close', e.target.value)}
                  style={{
                    ...timeInput,
                    opacity: day.active ? 1 : 0.35,
                    cursor: day.active ? 'text' : 'not-allowed',
                  }}
                />

                {/* Botão "aplicar a todos" */}
                {day.active && (
                  <button
                    title="Aplicar este horário a todos os dias ativos"
                    onClick={() => applyToAll(day)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 16, color: '#94A3B8', padding: '0 4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#2E7D5B')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                  >
                    ⎘
                  </button>
                )}
              </div>
            ))}

            {/* Dica */}
            <div style={{ padding: '10px 4px 0', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span>
              <span>Clique em ⎘ ao lado de um dia para aplicar o mesmo horário a todos os dias ativos.</span>
            </div>
          </div>
        </div>

        {/* Entrega */}
        <div className="tableCard">
          <div className="tableHeader"><span className="tableTitle">Entrega</span></div>
          <div className="settingsBody">
            <div className="formGrid">
              <div className="formGroup">
                <label className="formLabel">Tempo estimado (min)</label>
                <input type="number" className="formInput" value={form.estimatedDeliveryMinutes}
                  onChange={F('estimatedDeliveryMinutes')} min="1" />
              </div>
              <div className="formGroup">
                <label className="formLabel">Taxa de entrega (R$)</label>
                <input type="number" className="formInput" value={form.deliveryFee}
                  onChange={F('deliveryFee')} min="0" step="0.01" placeholder="0,00" />
              </div>
            </div>

            {/* Bairros atendidos */}
            <div className="formGroup" style={{ marginTop: 16 }}>
              <label className="formLabel">Bairros atendidos</label>
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Deixe vazio para aceitar qualquer bairro. Quando preenchido, o cliente escolhe da lista.
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  className="formInput"
                  style={{ flex: 1 }}
                  value={form.neighborhoodInput}
                  onChange={e => setForm(p => ({ ...p, neighborhoodInput: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && form.neighborhoodInput.trim()) {
                      e.preventDefault()
                      const n = form.neighborhoodInput.trim()
                      const list = form.deliveryNeighborhoods ? form.deliveryNeighborhoods.split(',').map(x => x.trim()).filter(Boolean) : []
                      if (!list.includes(n)) {
                        setForm(p => ({
                          ...p,
                          deliveryNeighborhoods: [...list, n].join(','),
                          neighborhoodInput: ''
                        }))
                      } else {
                        setForm(p => ({ ...p, neighborhoodInput: '' }))
                      }
                    }
                  }}
                  placeholder="Ex: Centro — pressione Enter para adicionar"
                />
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => {
                    const n = form.neighborhoodInput.trim()
                    if (!n) return
                    const list = form.deliveryNeighborhoods ? form.deliveryNeighborhoods.split(',').map(x => x.trim()).filter(Boolean) : []
                    if (!list.includes(n)) {
                      setForm(p => ({
                        ...p,
                        deliveryNeighborhoods: [...list, n].join(','),
                        neighborhoodInput: ''
                      }))
                    } else {
                      setForm(p => ({ ...p, neighborhoodInput: '' }))
                    }
                  }}
                >Adicionar</button>
              </div>
              {form.deliveryNeighborhoods && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.deliveryNeighborhoods.split(',').map(n => n.trim()).filter(Boolean).map(n => (
                    <span key={n} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#E8F5EE', color: '#2E7D5B', fontWeight: 700,
                      fontSize: 13, padding: '5px 10px', borderRadius: 8,
                      border: '1px solid #C8E6D8'
                    }}>
                      {n}
                      <button
                        type="button"
                        onClick={() => {
                          const list = form.deliveryNeighborhoods.split(',').map(x => x.trim()).filter(x => x && x !== n)
                          setForm(p => ({ ...p, deliveryNeighborhoods: list.join(',') }))
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2E7D5B', lineHeight: 1, padding: 0, fontSize: 14, fontWeight: 700 }}
                        aria-label={`Remover ${n}`}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Encomendas */}
        <div className="tableCard">
          <div className="tableHeader"><span className="tableTitle">Encomendas Agendadas</span></div>
          <div className="settingsBody">
            <Toggle field="acceptScheduled" label="Aceitar encomendas" sub="Clientes podem agendar pedidos com antecedência" />
            {form.acceptScheduled && (
              <div className="formGrid" style={{ marginTop: 16 }}>
                <div className="formGroup">
                  <label className="formLabel">Horário de início</label>
                  <input type="time" className="formInput" value={form.scheduledStartTime} onChange={F('scheduledStartTime')} />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Horário de fim</label>
                  <input type="time" className="formInput" value={form.scheduledEndTime} onChange={F('scheduledEndTime')} />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Antecedência mínima (dias)</label>
                  <input type="number" className="formInput" value={form.scheduledMinDaysAhead}
                    onChange={F('scheduledMinDaysAhead')} min="0" max="30" />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Antecedência mínima (horas)</label>
                  <input type="number" className="formInput" value={form.scheduledMinHoursAhead}
                    onChange={F('scheduledMinHoursAhead')} min="0" max="23" />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Antecedência mínima (minutos)</label>
                  <input type="number" className="formInput" value={form.scheduledMinMinutesAhead}
                    onChange={F('scheduledMinMinutesAhead')} min="0" max="59" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Redes sociais */}
        <div className="tableCard">
          <div className="tableHeader"><span className="tableTitle">Entregadores</span><span className="tableSubtitle">Usados na atribuição dos pedidos de delivery</span></div>
          <div className="settingsBody">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <input className="formInput" style={{ flex: 1, minWidth: 180 }} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nome do entregador" />
              <input className="formInput" style={{ width: 150 }} value={driverPayment} onChange={e => setDriverPayment(e.target.value)} type="number" min="0" step="0.01" placeholder="Valor por entrega" />
              <button className="btn btnPrimary" onClick={() => void addDriver()}>Adicionar</button>
            </div>
            {drivers.length === 0 ? <span style={{ color: '#94A3B8', fontSize: 13 }}>Nenhum entregador cadastrado.</span> : drivers.map(driver => <div key={driver.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid #E2E8F0' }}><span style={{ fontWeight: 700 }}>{driver.name}</span><span style={{ color: '#64748B' }}>R$ {(driver.defaultPayment ?? 0).toFixed(2).replace('.', ',')} / entrega</span><button className="btn btnDanger btnSm" onClick={() => void adminApi.deleteDriver(driver.id).then(() => setDrivers(prev => prev.filter(d => d.id !== driver.id)))}>Remover</button></div>)}
          </div>
        </div>

        {/* Redes sociais */}
        <div className="tableCard">
          <div className="tableHeader"><span className="tableTitle">Redes Sociais</span></div>
          <div className="settingsBody">
            <div className="formGrid">
              <div className="formGroup">
                <label className="formLabel">WhatsApp Business</label>
                <input className="formInput" value={form.whatsappNumber} onChange={F('whatsappNumber')}
                  placeholder="5511999999999 (sem +)" />
              </div>
              <div className="formGroup">
                <label className="formLabel">Números de notificação (admins)</label>
                <textarea className="formInput formTextarea" value={form.adminPhoneNumbers} onChange={F('adminPhoneNumbers')}
                  placeholder="Liste números separados por vírgula, ponto-e-vírgula ou nova linha. Ex: 5585999999999" />
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                  Esses números receberão uma mensagem quando um novo pedido for criado.
                </p>
              </div>
              <div className="formGroup">
                <label className="formLabel">Instagram</label>
                <input className="formInput" value={form.instagramUrl} onChange={F('instagramUrl')}
                  placeholder="https://instagram.com/suaconta" />
              </div>
            </div>
          </div>
        </div>

        {/* Informações da loja */}
        <div className="tableCard settingsFull">
          <div className="tableHeader">
            <span className="tableTitle">Informações da Loja</span>
            <span className="tableSubtitle">Aparecem no app para os clientes</span>
          </div>
          <div className="settingsBody">
            <div className="formGrid">
              <div className="formGroup">
                <label className="formLabel">Nome da loja</label>
                <input className="formInput" value={form.storeName} onChange={F('storeName')} placeholder="FastFit Store" />
              </div>
              <div className="formGroup">
                <label className="formLabel">Telefone</label>
                <input className="formInput" value={form.storePhone} onChange={F('storePhone')} placeholder="+55 11 99999-9999" />
              </div>
              <div className="formGroup formGroupFull">
                <label className="formLabel">Endereço (usado no link Google Maps)</label>
                <input className="formInput" value={form.storeAddress} onChange={F('storeAddress')}
                  placeholder="Rua Exemplo, 123 - São Paulo, SP" />
              </div>
              <div className="formGroup formGroupFull">
                <label className="formLabel">Descrição</label>
                <textarea className="formInput formTextarea" value={form.storeDescription}
                  onChange={F('storeDescription')} placeholder="Fale um pouco sobre sua loja..." />
              </div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}

// ── Inline styles ──────────────────────────────────────────────────
const scheduleGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 64px 120px 120px 32px',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 0,
  transition: 'background 0.15s',
}

const scheduleColHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const timeInput: React.CSSProperties = {
  border: '2px solid #E2E8F0',
  borderRadius: 10,
  padding: '7px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#1E293B',
  outline: 'none',
  width: '100%',
  background: 'white',
}
