export interface User { id: string; name: string; email: string; phone: string; role: 'USER' | 'ADMIN'; emailVerified: boolean }
export interface Product {
  id: string; name: string; description: string
  ingredients?: string; differentials?: string; weightVolume?: string; conservation?: string
  price: number; promotionalPrice?: number; promotionActive?: boolean; effectivePrice?: number
  image: string; category: string; categoryId?: number; active: boolean; displayOrder: number; stockQuantity?: number | null
}
export interface CartItem { id: string; cartItemId: number; name: string; description: string; price: number; image: string; category: string; quantity: number; priceSnapshot: number; isPackage?: boolean; packageId?: number | null; packageSelectionsJson?: string | null }
export type OrderStatus = 'RECEIVED' | 'IN_PREPARATION' | 'READY' | 'FINISHED' | 'DELIVERED_PAYMENT_DUE' | 'CANCELED'
export type PaymentMethod = 'PIX' | 'CASH' | 'DEBIT' | 'CREDIT'
export interface OrderLineItem { id: number; productName: string; productImage: string | null; quantity: number; price: number; subtotal: number; packageName: string | null; packageSelectionsJson: string | null }
export interface Order {
  id: string; userId: number; userName: string; userEmail: string
  status: OrderStatus; total: number; type: 'DELIVERY' | 'PICKUP' | 'SCHEDULED'
  scheduledDateTime: string | null
  deliveryAddress: string | null; notes: string | null
  paymentMethod: PaymentMethod | null; changeAmount: number | null
  createdAt: Date; items: OrderLineItem[]
}
export interface Category { id: number; name: string; description: string; active: boolean; displayOrder: number; productCount: number }
export interface StoreSettings {
  open: boolean; openingTime: string | null; closingTime: string | null
  storeName: string | null; storeDescription: string | null
  storePhone: string | null; whatsappNumber: string | null; instagramUrl: string | null
  storeAddress: string | null; estimatedDeliveryMinutes: number
  acceptDelivery: boolean; acceptPickup: boolean
}

export interface AuthContextType {
  user: User | null; token: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithSocial: (provider: 'google' | 'apple') => Promise<void>
  registerWithFirebase: (name: string, email: string, password: string, phone?: string) => Promise<void>
  forgotPasswordFirebase: (email: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean; isAdmin: boolean; isLoading: boolean
}

export interface CartContextType {
  items: CartItem[]; isLoading: boolean
  addToCart: (product: Product) => Promise<void>
  removeFromCart: (cartItemId: number) => Promise<void>
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  getTotal: () => number; getTotalItems: () => number
  refreshCart: () => Promise<void>
  patchItemSelectionsJson: (packageId: number, enrichedJson: string) => void
  addPackageToCartLocal: (pkg: { id: number; name: string; price: number; imageUrl?: string | null }, selectionsJson: string) => void
}
