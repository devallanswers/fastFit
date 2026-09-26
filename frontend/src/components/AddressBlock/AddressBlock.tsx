/**
 * AddressBlock — componente EXTERNO ao Cart para evitar remount a cada keystroke.
 * O bug anterior: definir o componente DENTRO da função Cart fazia o React
 * recriar (desmontar + montar) o input a cada letra digitada, perdendo o foco.
 */
import { useNavigate } from 'react-router-dom'
import { ApiAddress } from '../../services/api'
import { IconMapPin, IconAlertCircle } from '../Icon/Icon'
import styles from '../../pages/Cart/Cart.module.css'

interface AddrForm {
  label: string; street: string; number: string; complement: string
  neighborhood: string; city: string; state: string; zipCode: string
}

interface Props {
  addresses: ApiAddress[]
  selectedAddressId: number | null
  onSelectAddress: (id: number) => void
  showAddressPanel: boolean
  onTogglePanel: () => void
  addrForm: AddrForm
  onAddrFormChange: (field: keyof AddrForm, value: string) => void
  addrError: string
  addrSaving: boolean
  onSaveAddress: () => void
  neighborhoodList: string[] | null
}

export function AddressBlock({
  addresses, selectedAddressId, onSelectAddress,
  showAddressPanel, onTogglePanel,
  addrForm, onAddrFormChange,
  addrError, addrSaving, onSaveAddress,
  neighborhoodList,
}: Props) {
  const navigate = useNavigate()
  const F = (field: keyof AddrForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onAddrFormChange(field, field === 'state' ? e.target.value.toUpperCase() : e.target.value)

  return (
    <>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionLabel} style={{ margin: 0 }}>Endereço de entrega</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {addresses.length < 3 && (
            <button className={styles.linkBtn} onClick={onTogglePanel}>
              {showAddressPanel ? 'Cancelar' : '+ Novo'}
            </button>
          )}
          {addresses.length > 0 && !showAddressPanel && (
            <button className={styles.linkBtn} onClick={() => navigate('/profile?tab=addresses')}>
              Gerenciar
            </button>
          )}
        </div>
      </div>

      {showAddressPanel && (
        <div className={styles.addrForm}>
          {addrError && (
            <div className={styles.addrError}>
              <IconAlertCircle size={15} style={{ flexShrink: 0 }} /> {addrError}
            </div>
          )}
          <div className={styles.addrRow}>
            <div className={styles.addrField} style={{ flex: 3 }}>
              <label className={styles.addrLabel}>Rua *</label>
              <input className={styles.addrInput} value={addrForm.street}
                onChange={F('street')} placeholder="Ex: Rua das Flores" />
            </div>
            <div className={styles.addrField} style={{ flex: 1 }}>
              <label className={styles.addrLabel}>Nº *</label>
              <input className={styles.addrInput} value={addrForm.number}
                onChange={F('number')} placeholder="123" />
            </div>
          </div>
          <div className={styles.addrField}>
            <label className={styles.addrLabel}>Complemento</label>
            <input className={styles.addrInput} value={addrForm.complement}
              onChange={F('complement')} placeholder="Apto, bloco... (opcional)" />
          </div>
          <div className={styles.addrRow}>
            <div className={styles.addrField} style={{ flex: 1 }}>
              <label className={styles.addrLabel}>Bairro *</label>
              {neighborhoodList ? (
                <select className={styles.addrInput} value={addrForm.neighborhood} onChange={F('neighborhood')}>
                  <option value="">Selecione o bairro</option>
                  {neighborhoodList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input className={styles.addrInput} value={addrForm.neighborhood}
                  onChange={F('neighborhood')} placeholder="Centro" />
              )}
            </div>
            <div className={styles.addrField} style={{ flex: 1 }}>
              <label className={styles.addrLabel}>Cidade *</label>
              <input className={styles.addrInput} value={addrForm.city}
                onChange={F('city')} placeholder="São Paulo" />
            </div>
          </div>
          <div className={styles.addrRow}>
            <div className={styles.addrField} style={{ flex: 1 }}>
              <label className={styles.addrLabel}>Estado *</label>
              <input className={styles.addrInput} value={addrForm.state} maxLength={2}
                onChange={F('state')} placeholder="SP" />
            </div>
            <div className={styles.addrField} style={{ flex: 2 }}>
              <label className={styles.addrLabel}>CEP *</label>
              <input className={styles.addrInput} value={addrForm.zipCode}
                onChange={F('zipCode')} placeholder="00000-000" />
            </div>
          </div>
          <button className={styles.addrSaveBtn} onClick={onSaveAddress} disabled={addrSaving}>
            {addrSaving ? 'Salvando...' : 'Salvar endereço'}
          </button>
        </div>
      )}

      {!showAddressPanel && (
        addresses.length === 0 ? (
          <div className={styles.noAddress}>
            <IconMapPin size={15} color="var(--text-secondary)" />
            <span>Clique em "+ Novo" para cadastrar seu endereço.</span>
          </div>
        ) : (
          <div className={styles.addressList}>
            {addresses.map(addr => (
              <button key={addr.id}
                className={[styles.addressOption, selectedAddressId === addr.id ? styles.addressActive : ''].join(' ')}
                onClick={() => onSelectAddress(addr.id)}>
                <div className={styles.addressRadio}>
                  <div className={[styles.radio, selectedAddressId === addr.id ? styles.radioActive : ''].join(' ')} />
                </div>
                <div className={styles.addressInfo}>
                  <span className={styles.addressLabel}>{addr.label}
                    {addr.isDefault && <span className={styles.defaultBadge}>padrão</span>}
                  </span>
                  <span className={styles.addressText}>{addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}</span>
                  <span className={styles.addressText}>{addr.neighborhood}, {addr.city} - {addr.state}</span>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </>
  )
}
