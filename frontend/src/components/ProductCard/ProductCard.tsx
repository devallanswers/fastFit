import { useState } from 'react'
import { Product } from '../../types'
import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import { useToastContext } from '../../context/ToastContext'
import { IconFlame, IconLeaf, IconStar, IconSnowflake, IconTrash, IconMinus } from '../Icon/Icon'
import styles from './ProductCard.module.css'

// ── Info Modal ────────────────────────────────────────────────────────────────
function InfoModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart, items } = useCart()
  const { toast } = useToastContext()
  const cartItem = items.find(i => i.id === product.id)
  const [adding, setAdding] = useState(false)

  const basePrice = product.promotionActive && product.promotionalPrice
    ? product.promotionalPrice
    : product.price

  const handleAdd = async () => {
    setAdding(true)
    try {
      await addToCart(product)
      toast.success(`${product.name} adicionado!`)
      onClose()
    }
    catch { toast.error('Erro ao adicionar ao carrinho') }
    finally { setAdding(false) }
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      {/* X fixo no overlay */}
      <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">✕</button>

      <div className={styles.modal}>
        <div className={styles.modalImageWrap}>
          <img src={product.image} alt={product.name} className={styles.modalImage} />
          <span className={styles.modalCategory}>{product.category}</span>
          {product.promotionActive && (
            <span className={styles.modalPromoTag}>
              <IconFlame size={13} color='white' /> PROMOÇÃO
            </span>
          )}
        </div>

        <div className={styles.modalBody}>
          <h2 className={styles.modalName}>{product.name}</h2>

          <div className={styles.modalPriceRow}>
            {product.promotionActive && product.promotionalPrice ? (
              <>
                <span className={styles.modalPriceOld}>R$ {product.price.toFixed(2).replace('.', ',')}</span>
                <span className={styles.modalPricePromo}>R$ {product.promotionalPrice.toFixed(2).replace('.', ',')}</span>
              </>
            ) : (
              <span className={styles.modalPrice}>R$ {product.price.toFixed(2).replace('.', ',')}</span>
            )}
            {product.weightVolume && (
              <span className={styles.modalWeight}>· {product.weightVolume}</span>
            )}
          </div>

          {product.description && (
            <p className={styles.modalDescription}>{product.description}</p>
          )}

          {product.ingredients && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHeader}>
                <IconLeaf size={15} color='var(--primary)' />
                <span className={styles.modalSectionTitle}>Ingredientes</span>
              </div>
              <p className={styles.modalSectionText}>{product.ingredients}</p>
            </div>
          )}

          {product.differentials && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHeader}>
                <IconStar size={15} color='#F59E0B' />
                <span className={styles.modalSectionTitle}>Diferenciais</span>
              </div>
              <p className={styles.modalSectionText}>{product.differentials}</p>
            </div>
          )}

          {product.conservation && (
            <div className={styles.modalSection}>
              <div className={styles.modalSectionHeader}>
                <IconSnowflake size={15} color='#0EA5E9' />
                <span className={styles.modalSectionTitle}>Conservação</span>
              </div>
              <p className={styles.modalSectionText}>{product.conservation}</p>
            </div>
          )}

          <button
            className={[styles.modalAddBtn, !product.active ? styles.addBtnUnavailable : ''].join(' ')}
            onClick={() => void handleAdd()}
            disabled={adding || !product.active}
          >
            {adding ? 'Adicionando...' : (!product.active ? 'Produto indisponível' : (
              cartItem
                ? `✓ ${cartItem.quantity} no carrinho · Adicionar mais · R$ ${basePrice.toFixed(2).replace('.', ',')}`
                : `Adicionar ao carrinho · R$ ${basePrice.toFixed(2).replace('.', ',')}`
            ))}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────
export function ProductCard({ product }: { product: Product }) {
  const { addToCart, updateQuantity, removeFromCart, items, isLoading } = useCart()
  const { toast } = useToastContext()
  const [localLoading, setLocalLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const navigate = useNavigate()

  const cartItem = items.find(i => i.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const busy = localLoading || isLoading
  const hasPromo = product.promotionActive && product.promotionalPrice
  const hasLowStock = product.stockQuantity != null && product.stockQuantity > 0 && product.stockQuantity <= 3
  const stockLimitReached = product.stockQuantity != null && qty >= product.stockQuantity

  const handleAdd = async () => {
    setLocalLoading(true)
    try { await addToCart(product); toast.success(`${product.name} adicionado!`) }
    catch { toast.error('Não foi possível adicionar ao carrinho') }
    finally { setLocalLoading(false) }
  }

  const handleIncrement = async () => {
    if (!cartItem) return
    setLocalLoading(true)
    try { await updateQuantity(cartItem.cartItemId, qty + 1) }
    catch { toast.error('Erro ao atualizar quantidade') }
    finally { setLocalLoading(false) }
  }

  const handleDecrement = async () => {
    if (!cartItem) return
    setLocalLoading(true)
    try {
      if (qty === 1) await removeFromCart(cartItem.cartItemId)
      else await updateQuantity(cartItem.cartItemId, qty - 1)
    } catch { toast.error('Erro ao atualizar quantidade') }
    finally { setLocalLoading(false) }
  }

  return (
    <>
      <div className={[styles.card, qty > 0 ? styles.cardInCart : ''].join(' ')}>
        <div className={styles.imageWrap}>
            <img src={product.image} alt={product.name} className={[styles.image, !product.active ? styles.imageUnavailable : ''].join(' ')} loading="lazy" />
            {!product.active && <span className={styles.unavailableBadge}>Indisponível</span>}
          {hasLowStock && <span className={styles.lowStockBadge}>Restam {product.stockQuantity}</span>}
          <span className={styles.categoryBadge}>{product.category}</span>
          <button
            className={styles.infoBtn}
            onClick={e => { e.stopPropagation(); setShowInfo(true) }}
            aria-label={`Ver detalhes de ${product.name}`}
          >
            <span className={styles.infoBtnIcon}>i</span>
          </button>
          {qty > 0 && <span className={styles.cartBadge}>{qty} no carrinho</span>}
          {hasPromo && <span className={styles.promoBadge}><IconFlame size={12} color='white' /> PROMO</span>}
        </div>

        <div className={styles.content}>
          <div className={styles.textBlock}>
            <h3 className={styles.name}>{product.name}</h3>
            <p className={styles.description}>{product.description}</p>
          </div>
          <div className={styles.footer}>
            <div className={styles.priceBlock}>
              {hasPromo ? (
                <>
                  <span className={styles.priceOld}>R$ {product.price.toFixed(2).replace('.', ',')}</span>
                  <span className={styles.pricePromo}>R$ {product.promotionalPrice!.toFixed(2).replace('.', ',')}</span>
                </>
              ) : (
                <span className={styles.price}>R$ {product.price.toFixed(2).replace('.', ',')}</span>
              )}
            </div>

            {qty === 0 ? (
                <button
                  className={[styles.addBtn, !product.active ? styles.addBtnUnavailable : ''].join(' ')}
                  onClick={() => void handleAdd()}
                  disabled={busy || !product.active}
                  aria-label={`Adicionar ${product.name}`}>
                  {busy ? <span className={styles.spinner} /> : (
                    !product.active ? 'Indisponível' : <span className={styles.addIcon}>+</span>
                  )}
                </button>
              ) : (
              <div className={styles.qtyControls}>
                <button className={styles.qtyBtn} onClick={() => void handleDecrement()} disabled={busy}>
                  {qty === 1 ? <IconTrash size={14} /> : <IconMinus size={14} />}
                </button>
                <span className={styles.qtyValue}>{busy ? '…' : qty}</span>
                <button className={[styles.qtyBtn, styles.qtyBtnAdd].join(' ')} onClick={() => void handleIncrement()} disabled={busy || stockLimitReached}>+</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showInfo && <InfoModal product={product} onClose={() => setShowInfo(false)} />}
    </>
  )
}
