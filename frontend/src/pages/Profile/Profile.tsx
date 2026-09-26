import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ordersApi, userApi, storeApi, ApiOrder, ApiAddress } from '../../services/api'
import { useToastContext } from '../../context/ToastContext'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { IconProfile, IconOrders, IconCart, IconMapPin, IconLock, IconLogOut, IconCrown, IconEdit, IconPhone, IconAlertCircle, IconCheck, IconEye, IconEyeOff } from '../../components/Icon/Icon'
import styles from './Profile.module.css'
import avatarMorango   from '../../assets/avatars/morango.png'
import avatarCenoura   from '../../assets/avatars/cenoura.png'
import avatarBanana    from '../../assets/avatars/banana.png'
import avatarSanduba   from '../../assets/avatars/sanduba.png'
import avatarBeterraba from '../../assets/avatars/beterraba.png'

type Panel = null | 'password' | 'addresses' | 'addressForm'

export function Profile() {
  const { user, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  // Avatar: stored in localStorage per user ID
  const AVATAR_KEY = `fastfit_avatar_${user?.id ?? 'guest'}`
  const AVATAR_OPTIONS = [
    { id: 'initials',   label: 'Padrão',    img: null },
    { id: 'morango',    label: 'Morango',   img: avatarMorango },
    { id: 'cenoura',    label: 'Cenoura',   img: avatarCenoura },
    { id: 'banana',     label: 'Banana',    img: avatarBanana },
    { id: 'sanduba',    label: 'Sanduba',   img: avatarSanduba },
    { id: 'beterraba',  label: 'Beterraba', img: avatarBeterraba },
  ]
  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    localStorage.getItem(AVATAR_KEY) ?? 'initials'
  )
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const handleSelectAvatar = (id: string) => {
    setSelectedAvatar(id)
    localStorage.setItem(AVATAR_KEY, id)
    setShowAvatarPicker(false)
  }

  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab')
  const [panel, setPanel] = useState<Panel>(
    initialTab === 'addresses' ? 'addresses' : null
  )
  const [editingAddress, setEditingAddress] = useState<ApiAddress | null>(null)

  // password form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // address form
  const [addrForm, setAddrForm] = useState({ label: 'Casa', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' })
  const [addrError, setAddrError] = useState('')
  const [addrLoading, setAddrLoading] = useState(false)

  const [neighborhoodList, setNeighborhoodList] = useState<string[] | null>(null)
  const { toast } = useToastContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) return
    ordersApi.getAll().then(setOrders).catch(() => {})
    loadAddresses()
    storeApi.getPublic().then(s => {
      if (s.deliveryNeighborhoods) {
        setNeighborhoodList(s.deliveryNeighborhoods.split(',').map(n => n.trim()).filter(Boolean))
      }
    }).catch(() => {})
  }, [isAuthenticated])

  const loadAddresses = () => {
    userApi.getAddresses().then(setAddresses).catch(() => {})
  }

  const handleLogout = () => { logout(); navigate('/') }

  const handleChangePassword = async () => {
    setPwdError('')
    if (!currentPwd || !newPwd) { setPwdError('Preencha todos os campos'); return }
    if (newPwd.length < 8) { setPwdError('Nova senha deve ter pelo menos 8 caracteres'); return }
    if (newPwd !== confirmPwd) { setPwdError('As senhas não coincidem'); return }
    setPwdLoading(true)
    try {
      await userApi.changePassword(currentPwd, newPwd)
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => { setPwdSuccess(false); setPanel(null) }, 2000)
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Erro ao alterar senha')
    } finally { setPwdLoading(false) }
  }

  const openAddressForm = (addr?: ApiAddress) => {
    if (addr) {
      setEditingAddress(addr)
      setAddrForm({ label: addr.label, street: addr.street, number: addr.number, complement: addr.complement ?? '', neighborhood: addr.neighborhood, city: addr.city, state: addr.state, zipCode: addr.zipCode })
    } else {
      setEditingAddress(null)
      setAddrForm({ label: 'Casa', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' })
    }
    setAddrError('')
    setPanel('addressForm')
  }

  const handleSaveAddress = async () => {
    setAddrError('')
    const { label, street, number, neighborhood, city, state, zipCode } = addrForm
    if (!label || !street || !number || !neighborhood || !city || !state || !zipCode) {
      setAddrError('Preencha todos os campos obrigatórios'); return
    }
    setAddrLoading(true)
    try {
      if (editingAddress) {
        await userApi.updateAddress(editingAddress.id, addrForm)
      } else {
        await userApi.createAddress(addrForm)
      }
      loadAddresses()
      setPanel('addresses')
    } catch (e) {
      setAddrError(e instanceof Error ? e.message : 'Erro ao salvar endereço')
    } finally { setAddrLoading(false) }
  }

  const handleDeleteAddress = async (id: number) => {
    try { await userApi.deleteAddress(id); loadAddresses(); toast.success('Endereço removido') } catch { toast.error('Erro ao remover endereço') }
  }

  const handleSetDefault = async (id: number) => {
    try { await userApi.setDefaultAddress(id); loadAddresses(); toast.success('Endereço padrão atualizado') } catch { toast.error('Erro ao atualizar endereço') }
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h1 className={styles.title}>Perfil</h1></div>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><IconProfile size={40} color="var(--gray-mid)" /></span>
          <p className={styles.emptyTitle}>Você não está logado</p>
          <button className={styles.primaryBtn} onClick={() => navigate('/login')}>Fazer Login</button>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  const initials = user!.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {panel ? (
          <button className={styles.backBtn} onClick={() => setPanel(panel === 'addressForm' ? 'addresses' : null)}>← Voltar</button>
        ) : null}
        <h1 className={styles.title}>
          {panel === 'password' ? 'Alterar Senha' : panel === 'addresses' ? 'Endereços' : panel === 'addressForm' ? (editingAddress ? 'Editar Endereço' : 'Novo Endereço') : 'Perfil'}
        </h1>
      </div>

      <div className={styles.content}>

        {/* ── Main profile ─────────────────────────────────── */}
        {!panel && (
          <>
            <div className={styles.avatarSection}>
              <button className={styles.avatarBtn} onClick={() => setShowAvatarPicker(v => !v)}>
                {(() => {
                  const av = AVATAR_OPTIONS.find(a => a.id === selectedAvatar)
                  return av?.img
                    ? <img src={av.img} alt={av.label} className={styles.avatarImg} />
                    : <div className={styles.avatar}>{initials}</div>
                })()}
                <span className={styles.avatarEditBadge}><IconEdit size={12} color="white" /></span>
              </button>

              {showAvatarPicker && (
                <div className={styles.avatarPicker}>
                  <p className={styles.avatarPickerTitle}>Escolha seu avatar</p>
                  <div className={styles.avatarGrid}>
                    {AVATAR_OPTIONS.map(av => (
                      <button
                        key={av.id}
                        className={[styles.avatarOption, selectedAvatar === av.id ? styles.avatarOptionActive : ''].join(' ')}
                        onClick={() => handleSelectAvatar(av.id)}
                      >
                        {av.img
                          ? <img src={av.img} alt={av.label} className={styles.avatarOptionImg} />
                          : <span className={styles.avatarOptionInitials}>{initials}</span>
                        }
                        <span className={styles.avatarOptionLabel}>{av.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <h2 className={styles.name}>{user!.name}</h2>
              <span className={styles.email}>{user!.email}</span>
              {user!.phone && <span className={styles.phone}><IconPhone size={14} style={{marginRight:4}} />{user!.phone}</span>}
              {user!.role === 'ADMIN' && <span className={styles.adminBadge}><IconCrown size={14} style={{marginRight:4}} />Administrador</span>}
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{orders.length}</span>
                <span className={styles.statLbl}>Pedidos</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{orders.filter(o => o.status === 'FINISHED').length}</span>
                <span className={styles.statLbl}>Entregues</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>R$ {orders.filter(o => o.status !== 'CANCELED').reduce((s, o) => s + o.totalAmount, 0).toFixed(0)}</span>
                <span className={styles.statLbl}>Total gasto</span>
              </div>
            </div>

            <div className={styles.menu}>
              {[
                { Icon: IconOrders, label: 'Meus Pedidos', sub: 'Acompanhe suas entregas', action: () => navigate('/orders') },
                { Icon: IconCart, label: 'Meu Carrinho', sub: 'Itens salvos', action: () => navigate('/cart') },
                { Icon: IconMapPin, label: 'Meus Endereços', sub: `${addresses.length} de 3 cadastrados`, action: () => setPanel('addresses') },
                { Icon: IconLock, label: 'Alterar Senha', sub: 'Segurança da conta', action: () => setPanel('password') },
              ].map(item => (
                <button key={item.label} className={styles.menuItem} onClick={item.action}>
                  <span className={styles.menuIcon}><item.Icon size={18} color='var(--primary)' /></span>
                  <div className={styles.menuInfo}>
                    <span className={styles.menuLabel}>{item.label}</span>
                    <span className={styles.menuSub}>{item.sub}</span>
                  </div>
                  <span className={styles.menuArrow}>›</span>
                </button>
              ))}
            </div>

            <button className={styles.logoutBtn} onClick={handleLogout}><IconLogOut size={16} style={{marginRight:6}} />Sair da conta</button>
          </>
        )}

        {/* ── Change password ───────────────────────────── */}
        {panel === 'password' && (
          <div className={styles.formCard}>
            {pwdSuccess && <div className={styles.successBox}><IconCheck size={15} style={{marginRight:6}} />Senha alterada com sucesso!</div>}
            {pwdError && <div className={styles.errorBox}><IconAlertCircle size={15} style={{marginRight:6}} />{pwdError}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Senha atual</label>
              <div className={styles.pwdWrap}>
                <input className={styles.input} type={showPwd ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
                <button className={styles.eyeBtn} onClick={() => setShowPwd(v => !v)} tabIndex={-1}>{showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}</button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nova senha</label>
              <div className={styles.pwdWrap}>
                <input className={styles.input} type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Confirmar nova senha</label>
              <div className={styles.pwdWrap}>
                <input className={styles.input} type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a nova senha" />
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={() => void handleChangePassword()} disabled={pwdLoading}>
              {pwdLoading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        )}

        {/* ── Addresses list ────────────────────────────── */}
        {panel === 'addresses' && (
          <>
            {addresses.length < 3 && (
              <button className={styles.addBtn} onClick={() => openAddressForm()}>+ Novo Endereço</button>
            )}
            {addresses.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><IconMapPin size={36} color="var(--gray-mid)" /></span>
                <p className={styles.emptyTitle}>Nenhum endereço cadastrado</p>
                <p className={styles.emptyText}>Adicione até 3 endereços de entrega</p>
              </div>
            ) : (
              <div className={styles.addrList}>
                {addresses.map(addr => (
                  <div key={addr.id} className={styles.addrCard}>
                    <div className={styles.addrTop}>
                      <span className={styles.addrLabel}>{addr.label}</span>
                      {addr.isDefault && <span className={styles.defaultBadge}>padrão</span>}
                    </div>
                    <p className={styles.addrText}>{addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}</p>
                    <p className={styles.addrText}>{addr.neighborhood}, {addr.city} - {addr.state} · {addr.zipCode}</p>
                    <div className={styles.addrActions}>
                      {!addr.isDefault && (
                        <button className={styles.addrActionBtn} onClick={() => void handleSetDefault(addr.id)}>Tornar padrão</button>
                      )}
                      <button className={styles.addrActionBtn} onClick={() => openAddressForm(addr)}>Editar</button>
                      <button className={[styles.addrActionBtn, styles.addrDanger].join(' ')} onClick={() => void handleDeleteAddress(addr.id)}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {addresses.length >= 3 && (
              <p className={styles.limitNote}>Limite de 3 endereços atingido.</p>
            )}
          </>
        )}

        {/* ── Address form ──────────────────────────────── */}
        {panel === 'addressForm' && (
          <div className={styles.formCard}>
            {addrError && <div className={styles.errorBox}><IconAlertCircle size={15} style={{marginRight:6}} />{addrError}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label}>Identificação *</label>
              <select className={styles.input} value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}>
                {['Casa', 'Trabalho', 'Outro'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 3 }}>
                <label className={styles.label}>Rua / Avenida *</label>
                <input className={styles.input} value={addrForm.street} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} placeholder="Ex: Rua das Flores" />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Número *</label>
                <input className={styles.input} value={addrForm.number} onChange={e => setAddrForm(f => ({ ...f, number: e.target.value }))} placeholder="123" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Complemento</label>
              <input className={styles.input} value={addrForm.complement} onChange={e => setAddrForm(f => ({ ...f, complement: e.target.value }))} placeholder="Apto, bloco... (opcional)" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Bairro *</label>
              {neighborhoodList ? (
                <select className={styles.input} value={addrForm.neighborhood} onChange={e => setAddrForm(f => ({ ...f, neighborhood: e.target.value }))}>
                  <option value="">Selecione o bairro</option>
                  {neighborhoodList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input className={styles.input} value={addrForm.neighborhood} onChange={e => setAddrForm(f => ({ ...f, neighborhood: e.target.value }))} placeholder="Ex: Centro" />
              )}
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label className={styles.label}>Cidade *</label>
                <input className={styles.input} value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: São Paulo" />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Estado *</label>
                <input className={styles.input} value={addrForm.state} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))} placeholder="SP" maxLength={2} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>CEP *</label>
              <input className={styles.input} value={addrForm.zipCode} onChange={e => setAddrForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="00000-000" />
            </div>

            <button className={styles.primaryBtn} onClick={() => void handleSaveAddress()} disabled={addrLoading}>
              {addrLoading ? 'Salvando...' : editingAddress ? 'Salvar Alterações' : 'Adicionar Endereço'}
            </button>
          </div>
        )}

      </div>
      <BottomNavigation />
    </div>
  )
}
