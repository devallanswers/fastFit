import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { CartItem, CartContextType, Product } from '../types'
import { cartApi, ApiCart } from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext<CartContextType | null>(null)
const FALLBACK = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
const LOCAL_CART_KEY = 'fastfit_local_cart'

function mapCart(c: ApiCart): CartItem[] {
  return c.items.map(i => ({
    id: i.isPackage ? `pkg-${i.packageId}-${i.id}` : String(i.productId),
    cartItemId: i.id,
    name: i.productName,
    description: '',
    price: i.priceSnapshot,
    image: i.productImage ?? FALLBACK,
    category: '',
    quantity: i.quantity,
    priceSnapshot: i.priceSnapshot,
    isPackage: i.isPackage ?? false,
    packageId: i.packageId ?? null,
    packageSelectionsJson: i.packageSelectionsJson ?? null,
  }))
}

function loadLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function saveLocalCart(items: CartItem[]) {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items))
}

let localIdSeq = Date.now()
function nextLocalId() { return ++localIdSeq }

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pendingRef = useRef<number>(0)

  useEffect(() => {
    if (isAuthenticated) {
      void refreshCart()
    } else {
      setItems(loadLocalCart())
    }
  }, [isAuthenticated])

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems(loadLocalCart())
      return
    }
    try {
      const cart = await cartApi.get()
      setItems(mapCart(cart))
    } catch {
      setItems([])
    }
  }, [isAuthenticated])

  const withLoading = async (fn: () => Promise<ApiCart>): Promise<void> => {
    pendingRef.current++
    setIsLoading(true)
    try {
      const cart = await fn()
      setItems(mapCart(cart))
    } finally {
      pendingRef.current--
      if (pendingRef.current === 0) setIsLoading(false)
    }
  }

  // ── Guest (localStorage) ──────────────────────────────────────────────────
  const addToCartLocal = (p: Product) => {
    setItems(prev => {
      const existing = prev.find(i => !i.isPackage && i.id === String(p.id))

      let updated: CartItem[]
      if (existing) {
        updated = prev.map(i =>
          i.id === String(p.id)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      } else {
        const newItem: CartItem = {
          id: String(p.id),
          cartItemId: nextLocalId(),
          name: p.name,
          description: p.description ?? '',
          price: p.effectivePrice ?? p.price,
          image: p.image ?? FALLBACK,
          category: '',
          quantity: 1,
          priceSnapshot: p.effectivePrice ?? p.price,
          isPackage: false,
          packageId: null,
          packageSelectionsJson: null,
        }
        updated = [...prev, newItem]
      }
      saveLocalCart(updated)
      return updated
    })
  }

  const addPackageToCartLocal = (
    pkg: { id: number; name: string; price: number; imageUrl?: string | null },
    selectionsJson: string
  ) => {
    setItems(prev => {
      const newItem: CartItem = {
        id: `pkg-${pkg.id}-${nextLocalId()}`,
        cartItemId: nextLocalId(),
        name: pkg.name,
        description: '',
        price: pkg.price,
        image: pkg.imageUrl ?? FALLBACK,
        category: '',
        quantity: 1,
        priceSnapshot: pkg.price,
        isPackage: true,
        packageId: pkg.id,
        packageSelectionsJson: selectionsJson,
      }
      const updated = [...prev, newItem]
      saveLocalCart(updated)
      return updated
    })
  }

  const removeFromCartLocal = (cartItemId: number) => {
    setItems(prev => {
      const updated = prev.filter(i => i.cartItemId !== cartItemId)
      saveLocalCart(updated)
      return updated
    })
  }

  const updateQuantityLocal = (cartItemId: number, quantity: number) => {
    if (quantity <= 0) { removeFromCartLocal(cartItemId); return }
    setItems(prev => {
      const updated = prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity } : i)
      saveLocalCart(updated)
      return updated
    })
  }

  const clearCartLocal = () => {
    localStorage.removeItem(LOCAL_CART_KEY)
    setItems([])
  }

  // ── API pública ───────────────────────────────────────────────────────────
  const addToCart = async (p: Product) => {
    if (!p.active) throw new Error('Produto indisponível')
    if (!isAuthenticated) { addToCartLocal(p); return }

    await withLoading(() => cartApi.addItem(Number(p.id), 1))
  }

  const removeFromCart = async (cartItemId: number) => {
    if (!isAuthenticated) { removeFromCartLocal(cartItemId); return }
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId))
    pendingRef.current++
    setIsLoading(true)
    try {
      const cart = await cartApi.removeItem(cartItemId)
      setItems(mapCart(cart))
    } catch {
      await refreshCart()
      throw new Error('Erro ao remover item')
    } finally {
      pendingRef.current--
      if (pendingRef.current === 0) setIsLoading(false)
    }
  }

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (!isAuthenticated) { updateQuantityLocal(cartItemId, quantity); return }
    if (quantity <= 0) { await removeFromCart(cartItemId); return }
    setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity } : i))
    pendingRef.current++
    setIsLoading(true)
    try {
      const cart = await cartApi.updateItem(cartItemId, quantity)
      setItems(mapCart(cart))
    } catch {
      await refreshCart()
      throw new Error('Erro ao atualizar quantidade')
    } finally {
      pendingRef.current--
      if (pendingRef.current === 0) setIsLoading(false)
    }
  }

  const clearCart = async () => {
    if (!isAuthenticated) { clearCartLocal(); return }
    pendingRef.current++
    setIsLoading(true)
    try {
      await cartApi.clear()
      setItems([])
    } finally {
      pendingRef.current--
      if (pendingRef.current === 0) setIsLoading(false)
    }
  }

  const patchItemSelectionsJson = (packageId: number, enrichedJson: string) => {
    setItems(prev => {
      const updated = prev.map(i =>
        i.isPackage && i.packageId === packageId
          ? { ...i, packageSelectionsJson: enrichedJson }
          : i
      )
      if (!document.querySelector('[data-auth]')) saveLocalCart(updated)
      return updated
    })
  }

  const getTotal = () =>
    items.reduce((sum, i) => sum + i.priceSnapshot * i.quantity, 0)

  const getTotalItems = () =>
    items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, isLoading,
      addToCart, removeFromCart, updateQuantity, clearCart,
      getTotal, getTotalItems, refreshCart, patchItemSelectionsJson, addPackageToCartLocal,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart outside CartProvider')
  return ctx
}
