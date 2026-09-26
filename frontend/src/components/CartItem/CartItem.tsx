import { CartItem as CartItemType } from '../../types'
import { useCart } from '../../context/CartContext'
import { useToastContext } from '../../context/ToastContext'
import { IconTrash, IconMinus, IconPlus, IconGift } from '../Icon/Icon'
import { PackageSelection } from '../../services/api'
import styles from './CartItem.module.css'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&h=120&fit=crop'

interface CartItemProps { item: CartItemType }

// Parseia o packageSelectionsJson e exibe os itens por slot
function PackageDetails({ json }: { json: string }) {
  let selections: PackageSelection[] = []
  try { selections = JSON.parse(json) } catch { return null }
  if (!selections.length) return null

  return (
    <div className={styles.pkgDetails}>
      {selections.map((sel, i) => (
        <div key={i} className={styles.pkgSlot}>
          <span className={styles.pkgSlotName}>{sel.slotName ?? `Slot ${sel.slotId}`}:</span>
          <span className={styles.pkgSlotItems}>
            {sel.productNames && sel.productNames.length > 0
              ? sel.productNames.join(', ')
              : sel.productIds.length + ' item(s)'
            }
          </span>
        </div>
      ))}
    </div>
  )
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart()
  const { toast } = useToastContext()

  const imgSrc = item.image
    ? (item.image.startsWith('http') ? item.image : `${BASE}${item.image}`)
    : FALLBACK_IMG

  const handleDecrement = () => {
    const action = item.quantity === 1
      ? removeFromCart(item.cartItemId)
      : updateQuantity(item.cartItemId, item.quantity - 1)
    void action.catch(() => toast.error('Erro ao atualizar carrinho'))
  }

  const handleIncrement = () => {
    void updateQuantity(item.cartItemId, item.quantity + 1)
      .catch(() => toast.error('Erro ao atualizar carrinho'))
  }

  return (
    <div className={styles.item}>
      {item.isPackage
        ? <div className={styles.pkgImageWrap}>
            {imgSrc !== FALLBACK_IMG
              ? <img src={imgSrc} alt={item.name} className={styles.image} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }} />
              : <div className={styles.pkgPlaceholder}><IconGift size={28} color="#2E7D5B" /></div>
            }
            <span className={styles.pkgBadge}><IconGift size={10} style={{marginRight:3}} />Pacote</span>
          </div>
        : <img src={imgSrc} alt={item.name} className={styles.image} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG }} />
      }
      <div className={styles.info}>
        <h4 className={styles.name}>{item.name}</h4>
        {/* Itens selecionados dentro do pacote */}
        {item.isPackage && item.packageSelectionsJson && (
          <PackageDetails json={item.packageSelectionsJson} />
        )}
        <span className={styles.price}>
          R$ {(item.priceSnapshot * item.quantity).toFixed(2).replace('.', ',')}
        </span>
        <span className={styles.unitPrice}>
          R$ {item.priceSnapshot.toFixed(2).replace('.', ',')} / un.
        </span>
      </div>
      <div className={styles.controls}>
        <button className={styles.btn} onClick={handleDecrement}>
          {item.quantity === 1 ? <IconTrash size={14} /> : <IconMinus size={14} />}
        </button>
        <span className={styles.qty}>{item.quantity}</span>
        {!item.isPackage && (
          <button className={[styles.btn, styles.btnAdd].join(' ')} onClick={handleIncrement}><IconPlus size={14} /></button>
        )}
      </div>
    </div>
  )
}