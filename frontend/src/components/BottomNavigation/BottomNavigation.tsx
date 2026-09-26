import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { IconHome, IconOrders, IconCart, IconGift, IconInfoCircle } from '../Icon/Icon'
import styles from './BottomNavigation.module.css'

const navItems = [
  { path: '/',         Icon: IconHome,       label: 'Início'   },
  { path: '/packages', Icon: IconGift,       label: 'Pacotes'  },
  { path: '/cart',     Icon: IconCart,       label: 'Carrinho' },
  { path: '/orders',   Icon: IconOrders,     label: 'Pedidos'  },
  { path: '/about',    Icon: IconInfoCircle, label: 'Sobre'    },
]

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getTotalItems } = useCart()
  const cartTotal = getTotalItems()

  return (
    <nav className={styles.nav}>
      {navItems.map(({ path, Icon, label }) => {
        const isActive = location.pathname === path
        return (
          <button
            key={path}
            className={[styles.navItem, isActive ? styles.active : ''].join(' ')}
            onClick={() => navigate(path)}
          >
            <span className={styles.icon}>
              <Icon size={20} />
              {path === '/cart' && cartTotal > 0 && (
                <span className={styles.badge}>{cartTotal}</span>
              )}
            </span>
            <span className={styles.label}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}