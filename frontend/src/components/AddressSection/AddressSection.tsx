/**
 * AddressSection — componente externo com estado próprio.
 * Precisa ser externo ao Cart para o React não recriar os inputs
 * a cada keystroke (que causava perda de foco).
 */
import { useState } from 'react'
import { IconMapPin, IconAlertCircle, IconTrash } from '../Icon/Icon'
import cartStyles from '../../pages/Cart/Cart.module.css'

export interface SavedAddress {
  id:           number
  label:        string
  street:       string
  number:       string
  neighborhood: string
  reference:    string
  isDefault:    boolean
}

const EMPTY_FORM = { label: '', street: '', number: '', neighborhood: '', reference: '' }

const ADDRESSES_KEY = 'fastfit_guest_addresses'

export function loadAddresses(): SavedAddress[] {
  try { return JSON.parse(localStorage.getItem(ADDRESSES_KEY) ?? '[]') } catch { return [] }
}
function persist(addrs: SavedAddress[]) {
  localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addrs))
}

interface Props {
  neighborhoodList: string[] | null
  selectedId:       number | null
  onSelect:         (id: number, addressString: string) => void
}

export function AddressSection({ neighborhoodList, selectedId, onSelect }: Props) {
  const [addresses,  setAddresses] = useState<SavedAddress[]>(() => loadAddresses())
  const [showPanel,  setShowPanel] = useState(false)
  const [form,       setForm]      = useState(EMPTY_FORM)
  const [formError,  setFormError] = useState('')

  const s = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const addrStr = (a: SavedAddress) =>
    `${a.street}, ${a.number}, ${a.neighborhood}${a.reference ? ` (Ref: ${a.reference})` : ''}`

  const handleSave = () => {
    setFormError('')
    if (!form.label || !form.street || !form.number || !form.neighborhood) {
      setFormError('Preencha rótulo, rua, número e bairro'); return
    }
    const newAddr: SavedAddress = { id: Date.now(), isDefault: addresses.length === 0, ...form }
    const updated = [...addresses, newAddr]
    setAddresses(updated)
    persist(updated)
    onSelect(newAddr.id, addrStr(newAddr))
    setForm(EMPTY_FORM)
    setShowPanel(false)
  }

  const handleSelect = (a: SavedAddress) => {
    const updated = addresses.map(x => ({ ...x, isDefault: x.id === a.id }))
    setAddresses(updated)
    persist(updated)
    onSelect(a.id, addrStr(a))
  }

  const handleDelete = (id: number) => {
    const updated = addresses.filter(a => a.id !== id).map((a, i) => ({ ...a, isDefault: i === 0 }))
    setAddresses(updated)
    persist(updated)
    if (selectedId === id) {
      const next = updated[0]
      if (next) onSelect(next.id, addrStr(next))
      else onSelect(-1, '')
    }
  }

  return (
    <>
      <div className={cartStyles.sectionHeader}>
        <p className={cartStyles.sectionLabel} style={{ margin: 0 }}>Endereço de entrega</p>
        {addresses.length < 3 && (
          <button className={cartStyles.linkBtn} onClick={() => { setShowPanel(v => !v); setFormError('') }}>
            {showPanel ? 'Cancelar' : '+ Novo'}
          </button>
        )}
      </div>

      {showPanel && (
        <div className={cartStyles.addrForm}>
          {formError && (
            <div className={cartStyles.addrError}>
              <IconAlertCircle size={15} style={{ flexShrink: 0 }} /> {formError}
            </div>
          )}

          <div className={cartStyles.addrField}>
            <label className={cartStyles.addrLabel}>Rótulo *</label>
            <input className={cartStyles.addrInput} value={form.label} onChange={s('label')}
              placeholder="Casa, Trabalho, Vó..." />
          </div>

          <div className={cartStyles.addrRow}>
            <div className={cartStyles.addrField} style={{ flex: 3 }}>
              <label className={cartStyles.addrLabel}>Rua *</label>
              <input className={cartStyles.addrInput} value={form.street} onChange={s('street')}
                placeholder="Ex: Rua das Flores" />
            </div>
            <div className={cartStyles.addrField} style={{ flex: 1 }}>
              <label className={cartStyles.addrLabel}>Nº *</label>
              <input className={cartStyles.addrInput} value={form.number} onChange={s('number')}
                placeholder="123" />
            </div>
          </div>

          <div className={cartStyles.addrField}>
            <label className={cartStyles.addrLabel}>Bairro *</label>
            {neighborhoodList && neighborhoodList.length > 0 ? (
              <select className={cartStyles.addrInput} value={form.neighborhood} onChange={s('neighborhood')}>
                <option value="">Selecione o bairro</option>
                {neighborhoodList.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input className={cartStyles.addrInput} value={form.neighborhood} onChange={s('neighborhood')}
                placeholder="Centro" />
            )}
          </div>

          <div className={cartStyles.addrField}>
            <label className={cartStyles.addrLabel}>Ponto de referência</label>
            <input className={cartStyles.addrInput} value={form.reference} onChange={s('reference')}
              placeholder="Ex: Próximo ao mercado São João" />
          </div>

          <button className={cartStyles.addrSaveBtn} onClick={handleSave}>
            Salvar endereço
          </button>
        </div>
      )}

      {!showPanel && (
        addresses.length === 0 ? (
          <div className={cartStyles.noAddress}>
            <IconMapPin size={15} color="var(--text-secondary)" />
            <span>Clique em "+ Novo" para cadastrar seu endereço.</span>
          </div>
        ) : (
          <div className={cartStyles.addressList}>
            {addresses.map(addr => (
              <div key={addr.id}
                className={[cartStyles.addressOption, selectedId === addr.id ? cartStyles.addressActive : ''].join(' ')}>
                <button className={cartStyles.addressRadioBtn} onClick={() => handleSelect(addr)}>
                  <div className={cartStyles.addressRadio}>
                    <div className={[cartStyles.radio, selectedId === addr.id ? cartStyles.radioActive : ''].join(' ')} />
                  </div>
                  <div className={cartStyles.addressInfo}>
                    <span className={cartStyles.addressLabel}>
                      {addr.label}
                      {addr.isDefault && <span className={cartStyles.defaultBadge}>padrão</span>}
                    </span>
                    <span className={cartStyles.addressText}>
                      {addr.street}, {addr.number} — {addr.neighborhood}
                    </span>
                    {addr.reference && (
                      <span className={cartStyles.addressText}>📍 {addr.reference}</span>
                    )}
                  </div>
                </button>
                <button className={cartStyles.addressDeleteBtn} onClick={() => handleDelete(addr.id)} aria-label="Remover">
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </>
  )
}
