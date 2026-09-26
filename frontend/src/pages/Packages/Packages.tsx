import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header/Header'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { packagesApi, ApiPackage, ApiPackageSlot, ApiPackageSlotProduct, assetUrl } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { useToastContext } from '../../context/ToastContext'
import { IconX, IconCheck, IconShoppingBag, IconLeaf } from '../../components/Icon/Icon'
import styles from './Packages.module.css'


// ── Package Builder Modal ────────────────────────────────────────────────────
interface BuilderProps {
  pkg: ApiPackage
  onClose: () => void
  onAdded: () => void
}

function PackageBuilder({ pkg, onClose, onAdded }: BuilderProps) {
  const { addPackageToCartLocal } = useCart()
  const { toast } = useToastContext()
  const navigate = useNavigate()

  // selections: slotId -> productId[]
  const [selections, setSelections] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(pkg.slots.map(s => [s.id, []]))
  )
  const [adding, setAdding] = useState(false)

  const totalRequired = pkg.slots.reduce((s, sl) => s + sl.quantity, 0)
  const totalSelected = Object.values(selections).reduce((s, arr) => s + arr.length, 0)
  const allDone = pkg.slots.every(sl => selections[sl.id]?.length === sl.quantity)

  const addProduct = (slot: ApiPackageSlot, product: ApiPackageSlotProduct) => {
    setSelections(prev => {
      const current = prev[slot.id] ?? []
      if (current.length >= slot.quantity) return prev // slot full
      return { ...prev, [slot.id]: [...current, product.id] }
    })
  }

  const removeProduct = (slot: ApiPackageSlot, product: ApiPackageSlotProduct) => {
    setSelections(prev => {
      const current = prev[slot.id] ?? []
      const idx = current.lastIndexOf(product.id)
      if (idx === -1) return prev
      const next = [...current]
      next.splice(idx, 1)
      return { ...prev, [slot.id]: next }
    })
  }

  const handleAdd = async () => {
    if (!allDone) return

    // Monta JSON enriquecido com nomes de slot e produto
    const enriched = pkg.slots.map(sl => {
      const productIds = selections[sl.id] ?? []
      const productNames = productIds.map(pid =>
        sl.allowedProducts.find(ap => ap.id === pid)?.name ?? ''
      )
      return { slotId: sl.id, slotName: sl.name, productIds, productNames }
    })

    setAdding(true)
    try {
      // Adiciona direto no carrinho local — sem API (guest sem auth)
      addPackageToCartLocal(
        { id: pkg.id, name: pkg.name, price: pkg.price, imageUrl: pkg.imageUrl },
        JSON.stringify(enriched)
      )
      toast.success(`${pkg.name} adicionado ao carrinho!`)
      onAdded()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar pacote')
    } finally { setAdding(false) }
  }

  const progressPct = totalRequired > 0 ? Math.round((totalSelected / totalRequired) * 100) : 0

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleWrap}>
            <div className={styles.modalTitle}>{pkg.name}</div>
            <div className={styles.modalSubtitle}>Monte seu pacote</div>
            <div className={styles.modalPrice}>R$ {pkg.price.toFixed(2).replace('.', ',')}</div>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Fechar">
            <IconX size={16} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {pkg.slots.map(slot => {
            const sel = selections[slot.id] ?? []
            const done = sel.length === slot.quantity
            return (
              <div key={slot.id} className={styles.slotSection}>
                <div className={styles.slotHeader}>
                  <span className={styles.slotName}>{slot.name}</span>
                  <span className={[styles.slotProgress, done ? styles.slotProgressDone : ''].join(' ')}>
                    {done ? <><IconCheck size={11} style={{marginRight:3}}/> Completo</> : `${sel.length} / ${slot.quantity}`}
                  </span>
                </div>

                {slot.allowedProducts.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Nenhum produto configurado para este slot.
                  </p>
                ) : (
                  <div className={styles.productGrid}>
                    {slot.allowedProducts.map(product => {
                      const count = sel.filter(id => id === product.id).length
                      const slotFull = sel.length >= slot.quantity
                      const canAdd = !slotFull
                      const canRemove = count > 0
                      const imgSrc = product.imageUrl ? assetUrl(product.imageUrl) : null

                      return (
                        <div
                          key={product.id}
                          className={[
                            styles.productOption,
                            count > 0 ? styles.productOptionActive : '',
                          ].join(' ')}
                        >
                          <div className={styles.productOptionInner}>
                            {imgSrc
                              ? <img src={imgSrc} alt={product.name} className={styles.productOptionImg} />
                              : <div className={styles.productOptionImgPlaceholder}><IconLeaf size={24} color="#CBD5E1" /></div>
                            }
                            <span className={styles.productOptionName}>{product.name}</span>
                          </div>
                          <div className={styles.productStepper}>
                            <button
                              className={styles.stepperBtn}
                              onClick={() => removeProduct(slot, product)}
                              disabled={!canRemove}
                              aria-label="Remover"
                            >−</button>
                            <span className={styles.stepperCount}>{count}</span>
                            <button
                              className={styles.stepperBtn}
                              onClick={() => addProduct(slot, product)}
                              disabled={!canAdd}
                              aria-label="Adicionar"
                            >+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressText}>
            {allDone ? 'Pacote completo! Pronto para adicionar.' : `${totalSelected} de ${totalRequired} itens selecionados`}
          </div>
          <button
            className={styles.addToCartBtn}
            onClick={() => void handleAdd()}
            disabled={!allDone || adding}
          >
            {adding ? 'Adicionando...' : `Adicionar ao Carrinho · R$ ${pkg.price.toFixed(2).replace('.', ',')}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Packages Page ────────────────────────────────────────────────────────────
export function Packages() {
  const [packages, setPackages] = useState<ApiPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState<ApiPackage | null>(null)
  const [cartBump, setCartBump] = useState(0)

  useEffect(() => {
    packagesApi.getActive()
      .then(setPackages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <Header key={cartBump} />
      <div className={styles.header}>
        <h1 className={styles.title}>Pacotes Semanais</h1>
        <p className={styles.subtitle}>Monte o seu pacote e economize toda semana</p>
      </div>

      <div className={styles.content}>
        {loading ? (
          [1, 2].map(i => <div key={i} className={styles.skeleton} />)
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon"><IconShoppingBag size={44} color="var(--gray-mid)" /></span>
            <p className="empty-state-title">Nenhum pacote disponível</p>
            <p className="empty-state-text">Em breve novos pacotes por aqui!</p>
          </div>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className={styles.pkgCard}>
              <div className={styles.pkgImageWrap}>
                {pkg.imageUrl
                  ? <img src={assetUrl(pkg.imageUrl)} alt={pkg.name} className={styles.pkgImage} />
                  : <div className={styles.pkgImagePlaceholder}><IconLeaf size={48} color="white" /></div>
                }
              </div>
              <div className={styles.pkgBody}>
                <div className={styles.pkgName}>{pkg.name}</div>
                {pkg.description && <div className={styles.pkgDesc}>{pkg.description}</div>}
                <div className={styles.pkgSlots}>
                  {pkg.slots.map(sl => (
                    <span key={sl.id} className={styles.pkgSlotChip}>
                      {sl.quantity}× {sl.name}
                    </span>
                  ))}
                </div>
                <div className={styles.pkgFooter}>
                  <span className={styles.pkgPrice}>R$ {pkg.price.toFixed(2).replace('.', ',')}</span>
                  <button className={styles.pkgBtn} onClick={() => setSelectedPkg(pkg)}>
                    Montar Pacote
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNavigation />

      {selectedPkg && (
        <PackageBuilder
          pkg={selectedPkg}
          onClose={() => setSelectedPkg(null)}
          onAdded={() => setCartBump(b => b + 1)}
        />
      )}
    </div>
  )
}
