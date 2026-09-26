export interface ApiPackageSlotProduct {
  id: number
  name: string
  imageUrl: string | null
  price: number
  promotionalPrice: number | null
  promotionActive: boolean
}

export interface ApiPackageSlot {
  id: number
  name: string
  quantity: number
  displayOrder: number
  categoryId: number | null
  categoryName: string | null
  allowedProducts: ApiPackageSlotProduct[]
}

export interface ApiPackage {
  id: number
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  active: boolean
  displayOrder: number
  slots: ApiPackageSlot[]
}

export interface ApiPromotion {
  id: number
  title: string
  subtitle: string | null
  imageUrl: string | null
  backgroundColor: string | null
  ctaLabel: string | null
  linkType: 'PRODUCT' | 'PACKAGE' | 'URL' | 'NONE'
  linkTargetId: number | null
  linkUrl: string | null
  active: boolean
  activeDays: string | null
  displayOrder: number
  slideType?: 'PROMOTION' | 'IMAGE'
}

export interface PackageSelection {
  slotId: number
  slotName?: string
  productIds: number[]
  productNames?: string[]
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
export const assetUrl = (url: string): string => url.startsWith('http://') || url.startsWith('https://') ? url : `${BASE_URL}${url}`
const TIMEOUT_MS = 15000
const MAX_RETRIES = 2

export function getToken(): string | null { return localStorage.getItem('fastfit_token') }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<never>((_, r) =>
    setTimeout(() => r(new Error('Tempo limite excedido. Verifique sua conexão.')), ms))])
}

async function request<T>(path: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    const res = await withTimeout(fetch(`${BASE_URL}${path}`, { ...options, headers }), TIMEOUT_MS)
    const json = await res.json() as ApiResponse<T>
    if (!json.success) throw new Error(json.error ?? 'Erro no servidor')
    return json.data as T
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('fetch') && retries > 0) {
      await new Promise(r => setTimeout(r, 800))
      return request<T>(path, options, retries - 1)
    }
    throw e
  }
}

async function requestForm<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, { method, body: formData, headers }), 30000)
  const json = await res.json() as ApiResponse<T>
  if (!json.success) throw new Error(json.error ?? 'Erro no servidor')
  return json.data as T
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; data: T | null; error: string | null }
export interface ApiUser { id: number; name: string; email: string; phone: string; role: 'USER' | 'ADMIN'; emailVerified: boolean; active: boolean; createdAt: string }
export interface ApiCategory { id: number; name: string; description: string; imageUrl: string | null; active: boolean; displayOrder: number; productCount: number }
export interface ApiProduct {
  id: number; name: string; description: string
  ingredients: string | null; differentials: string | null
  weightVolume: string | null; conservation: string | null
  price: number; promotionalPrice: number | null; promotionActive: boolean; effectivePrice: number
  cost: number | null
  imageUrl: string | null; active: boolean; displayOrder: number; stockQuantity: number | null
  category: ApiCategory | null; createdAt: string
  additionalsJson?: string | null
}
export interface ApiCartItem {
  id: number
  productId: number | null
  productName: string
  productImage: string | null
  quantity: number
  priceSnapshot: number
  subtotal: number
  isPackage: boolean
  packageId: number | null
  packageSelectionsJson: string | null
}
export interface ApiCart { id: number; items: ApiCartItem[]; totalAmount: number; createdAt: string }
export interface ApiOrderItem { id: number; productId: number | null; productName: string; productImage: string | null; quantity: number; price: number; subtotal: number; packageName: string | null; packageSelectionsJson: string | null }
export interface ApiOrder {
  id: number; userId: number; userName: string; userEmail: string; userPhone: string | null
  status: string; totalAmount: number; type: string
  deliveryAddress: string | null; notes: string | null
  paymentMethod: string | null; changeAmount: number | null
  scheduledDateTime: string | null
  pixCode?: string
  createdAt: string; updatedAt: string | null; items: ApiOrderItem[]
  deliveryDriverId?: number | null; deliveryDriverName?: string | null; deliveryPayment?: number | null
}

export interface ApiPromotionGalleryImage {
  id: number
  imageUrl: string
  label: string
  active: boolean
  displayOrder: number
}
export interface ApiDeliveryDriver { id: number; name: string; defaultPayment: number | null; active: boolean }
export interface ApiDeliveryExpense { id: number; createdAt: string; amount: number; category: string; notes: string | null }
export interface ApiDeliveryPayment { id: number; driverId: number; driverName: string; amount: number; notes: string | null; createdAt: string }
export interface ApiDeliveryDriverBalance { driverId: number; driverName: string; deliveryCount: number; earned: number; paid: number; balance: number }
export interface ApiDeliveryControl { deliveries: ApiOrder[]; drivers: ApiDeliveryDriver[]; expenses: ApiDeliveryExpense[]; payments: ApiDeliveryPayment[]; driverBalances: ApiDeliveryDriverBalance[]; totalDueToDrivers: number; totalFuelExpense: number }
export interface ApiStoreSettings {
  id: number; open: boolean; openingTime: string | null; closingTime: string | null
  closedMessage: string | null; scheduleJson: string | null
  storeName: string | null; storePhone: string | null
  whatsappNumber: string | null
  adminPhoneNumbers?: string | null
  deliveryNeighborhoods: string | null
  acceptScheduled: boolean
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  scheduledMinDaysAhead?: number
  scheduledMinHoursAhead?: number
  scheduledMinMinutesAhead?: number
  instagramUrl: string | null
  storeAddress: string | null; storeDescription: string | null; logoUrl: string | null
  estimatedDeliveryMinutes: number; acceptDelivery: boolean; acceptPickup: boolean; deliveryFee: number
  isOpenNow: boolean; currentStatus: 'OPEN' | 'CLOSED' | 'NO_SCHEDULE'
  pixKey: string | null
}
export interface ApiDashboard { totalOrders: number; todayOrders: number; todayRevenue: number; activeOrders: number; totalUsers: number; activeProducts: number }
export interface ApiMonthlyReport {
  year: number; month: number; monthName: string
  totalOrders: number; canceledOrders: number
  deliveryCount: number; deliveryRevenue: number; pickupCount: number
  totalRevenue: number; totalCost: number; totalProfit: number
  topProducts: ApiProductSales[]
}
export interface ApiCashRegister {
  id: number;
  openedAt: string;
  closedAt?: string | null;
  openedBy: string;
  closedBy?: string | null;
  initialBalance: number;
  currentBalance: number;
  open: boolean;
}
export interface ApiCashTransaction {
  id: number;
  registerId: number;
  createdAt: string;
  createdBy: string;
  type: 'IN' | 'OUT';
  amount: number;
  category?: string | null;
  notes?: string | null;
  orderId?: number | null;
}
export interface ApiProductSales { productName: string; quantitySold: number; revenue: number; cost: number; profit: number }
export interface AuthResponse { token: string; tokenType: string; user: ApiUser }
export interface ApiAddress { id: number; label: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string; zipCode: string; isDefault: boolean }

// ── Endpoints ──────────────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string, phone?: string) =>
    request<ApiUser>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verifyEmail: (token: string) => request<string>(`/api/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => request<string>(`/api/auth/resend-verification?email=${encodeURIComponent(email)}`),
  forgotPassword: (email: string) => request<string>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) => request<string>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  firebaseLogin: (idToken: string) => request<AuthResponse>('/api/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken }) }),
}

export const userApi = {
  getMe: () => request<ApiUser>('/api/users/me'),
  updateMe: (name: string, phone: string) => request<ApiUser>('/api/users/me', { method: 'PUT', body: JSON.stringify({ name, phone }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<string>('/api/users/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  getAddresses: () => request<ApiAddress[]>('/api/users/me/addresses'),
  createAddress: (data: Omit<ApiAddress, 'id' | 'isDefault'>) =>
    request<ApiAddress>('/api/users/me/addresses', { method: 'POST', body: JSON.stringify(data) }),
  updateAddress: (id: number, data: Omit<ApiAddress, 'id' | 'isDefault'>) =>
    request<ApiAddress>(`/api/users/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAddress: (id: number) => request<string>(`/api/users/me/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id: number) => request<ApiAddress>(`/api/users/me/addresses/${id}/default`, { method: 'PATCH' }),
}

export const productsApi = {
  getActive: () => request<ApiProduct[]>('/api/products/active'),
  getAll: () => request<ApiProduct[]>('/api/products'),
  getPopular: () => request<ApiProduct[]>('/api/products/popular'),
}
export const categoriesApi = { getActive: () => request<ApiCategory[]>('/api/categories/active') }

export const cartApi = {
  get: () => request<ApiCart>('/api/cart'),
  addItem: (productId: number, quantity: number) =>
    request<ApiCart>('/api/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateItem: (itemId: number, quantity: number) => request<ApiCart>(`/api/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeItem: (itemId: number) => request<ApiCart>(`/api/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => request<string>('/api/cart', { method: 'DELETE' }),
}

export interface GuestCartItem {
  productId: number | null
  packageId: number | null
  productName: string
  productImage: string | null
  quantity: number
  priceSnapshot: number
  packageSelectionsJson: string | null
}

export const ordersApi = {
  create: (
    type: string,
    deliveryAddress?: string,
    notes?: string,
    paymentMethod?: string,
    changeAmount?: number,
    scheduledDateTime?: string,
    guestName?: string,
    guestPhone?: string,
    cartItems?: GuestCartItem[],
  ) =>
    request<ApiOrder>('/api/orders', { method: 'POST', body: JSON.stringify({
      type, deliveryAddress, notes, paymentMethod, changeAmount, scheduledDateTime,
      guestName, guestPhone, cartItems,
    }) }),
  getAll: (phone?: string) =>
    request<ApiOrder[]>(phone ? `/api/orders?phone=${encodeURIComponent(phone)}` : '/api/orders'),
  cancel: (id: number, phone?: string) =>
    request<ApiOrder>(`/api/orders/${id}/cancel${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`, { method: 'PATCH' }),
}

export const storeApi = { getPublic: () => request<ApiStoreSettings>('/api/store-settings/public') }

export const adminApi = {
  getDashboard: () => request<ApiDashboard>('/api/admin/dashboard'),
  getMonthlyReport: (year?: number, month?: number) =>
    request<ApiMonthlyReport>(`/api/admin/dashboard/report?year=${year ?? 0}&month=${month ?? 0}`),
  getProducts: () => request<ApiProduct[]>('/api/admin/products'),
  createProduct: (data: object, image?: File) => {
    const form = new FormData()
    form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (image) form.append('image', image)
    return requestForm<ApiProduct>('/api/admin/products', form)
  },
  updateProduct: (id: number, data: object, image?: File) => {
    const form = new FormData()
    form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (image) form.append('image', image)
    return requestForm<ApiProduct>(`/api/admin/products/${id}`, form, 'PUT')
  },
  reorderProducts: (orderedIds: number[]) =>
    request<string>('/api/admin/products/reorder', { method: 'PATCH', body: JSON.stringify({ orderedIds }) }),
  reorderCategories: (orderedIds: number[]) =>
    request<string>('/api/admin/categories/reorder', { method: 'PATCH', body: JSON.stringify({ orderedIds }) }),
  reorderPackages: (orderedIds: number[]) =>
    request<string>('/api/admin/packages/reorder', { method: 'PATCH', body: JSON.stringify({ orderedIds }) }),
  toggleProduct: (id: number) => request<ApiProduct>(`/api/admin/products/${id}/toggle`, { method: 'PATCH' }),
  deleteProduct: (id: number) => request<string>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  getCategories: () => request<ApiCategory[]>('/api/admin/categories'),
  createCategory: (data: object) => request<ApiCategory>('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: object) => request<ApiCategory>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) => request<string>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  getOrders: () => request<ApiOrder[]>('/api/admin/orders'),
  getActiveOrders: () => request<ApiOrder[]>('/api/admin/orders/active'),
  updateOrderStatus: (id: number, status: string) => request<ApiOrder>(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getDeliveryControl: () => request<ApiDeliveryControl>('/api/admin/deliveries'),
  getDrivers: () => request<ApiDeliveryDriver[]>('/api/admin/deliveries/drivers'),
  createDriver: (data: { name: string; defaultPayment?: number; active?: boolean }) => request<ApiDeliveryDriver>('/api/admin/deliveries/drivers', { method: 'POST', body: JSON.stringify(data) }),
  updateDriver: (id: number, data: { name: string; defaultPayment?: number; active?: boolean }) => request<ApiDeliveryDriver>(`/api/admin/deliveries/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDriver: (id: number) => request<string>(`/api/admin/deliveries/drivers/${id}`, { method: 'DELETE' }),
  assignDriver: (id: number, driverId: number, payment?: number) => request<ApiOrder>(`/api/admin/deliveries/orders/${id}/driver`, { method: 'PATCH', body: JSON.stringify({ driverId, payment }) }),
  addDeliveryExpense: (data: { amount: number; category: string; notes?: string }) => request<ApiDeliveryExpense>('/api/admin/deliveries/expenses', { method: 'POST', body: JSON.stringify(data) }),
  payDeliveryDriver: (data: { driverId: number; amount: number; notes?: string }) => request<ApiDeliveryPayment>('/api/admin/deliveries/payments', { method: 'POST', body: JSON.stringify(data) }),
  deleteDeliveryExpense: (id: number) => request<string>(`/api/admin/deliveries/expenses/${id}`, { method: 'DELETE' }),
  getUsers: () => request<ApiUser[]>('/api/admin/users'),
  toggleUser: (id: number) => request<ApiUser>(`/api/admin/users/${id}/toggle`, { method: 'PATCH' }),
  getSettings: () => request<ApiStoreSettings>('/api/admin/store-settings'),
  updateSettings: (data: object) => request<ApiStoreSettings>('/api/admin/store-settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Cash register endpoints
  getOpenCash: (): Promise<ApiCashRegister | null> => request<ApiCashRegister | null>('/api/admin/cash/open'),
  openCash: (user: string, initial: number) => request<ApiCashRegister>(`/api/admin/cash/open?user=${encodeURIComponent(user)}&initial=${initial}`, { method: 'POST' }),
  closeCash: (id: number, user: string) => request<ApiCashRegister>(`/api/admin/cash/close?id=${id}&user=${encodeURIComponent(user)}`, { method: 'POST' }),
  addCashTx: (registerId: number, user: string, type: 'IN' | 'OUT', amount: number, category?: string, notes?: string, orderId?: number) =>
    request<ApiCashTransaction>(`/api/admin/cash/tx?registerId=${registerId}&user=${encodeURIComponent(user)}&type=${type}&amount=${amount}${category ? `&category=${encodeURIComponent(category)}` : ''}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}${orderId ? `&orderId=${orderId}` : ''}`, { method: 'POST' }),
  listCashTxs: (registerId: number) => request<ApiCashTransaction[]>(`/api/admin/cash/txs/${registerId}`),
}

export const packagesApi = {
  getActive: (): Promise<ApiPackage[]> =>
    request<ApiPackage[]>('/api/packages'),
  getAll: (): Promise<ApiPackage[]> =>
    request<ApiPackage[]>('/api/admin/packages'),
  create: (data: {
    name: string; description?: string; price: number; active?: boolean;
    displayOrder?: number; slots?: Array<{
      name: string; quantity: number; displayOrder?: number;
      categoryId?: number | null; allowedProductIds?: number[]
    }>
  }): Promise<ApiPackage> =>
    request<ApiPackage>('/api/admin/packages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{
    name: string; description: string; price: number; active: boolean;
    displayOrder: number; slots: Array<{
      id?: number; name: string; quantity: number; displayOrder?: number;
      categoryId?: number | null; allowedProductIds?: number[]
    }>
  }>): Promise<ApiPackage> =>
    request<ApiPackage>(`/api/admin/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadImage: (id: number, file: File): Promise<string> => {
    const form = new FormData(); form.append('file', file)
    return requestForm<string>(`/api/admin/packages/${id}/image`, form)
  },
  delete: (id: number): Promise<void> =>
    request<void>(`/api/admin/packages/${id}`, { method: 'DELETE' }),
  addToCart: (packageId: number, selections: PackageSelection[]): Promise<ApiCart> =>
    request<ApiCart>('/api/cart/packages', { method: 'POST', body: JSON.stringify({ packageId, selections }) }),
}

export const promotionsApi = {
  getToday: (): Promise<ApiPromotion[]> =>
    request<ApiPromotion[]>('/api/promotions/today'),
  getAll: (): Promise<ApiPromotion[]> =>
    request<ApiPromotion[]>('/api/admin/promotions'),
  getGallery: (): Promise<ApiPromotionGalleryImage[]> =>
    request<ApiPromotionGalleryImage[]>('/api/admin/promotions/gallery'),
  uploadGalleryImage: (file: File, label?: string): Promise<ApiPromotionGalleryImage> => {
    const form = new FormData(); form.append('file', file)
    if (label) form.append('label', label)
    return requestForm<ApiPromotionGalleryImage>('/api/admin/promotions/gallery', form)
  },
  deleteGalleryImage: (id: number): Promise<void> =>
    request<void>(`/api/admin/promotions/gallery/${id}`, { method: 'DELETE' }),
  updateGalleryImage: (id: number, data: Partial<{ active: boolean; displayOrder: number }>): Promise<ApiPromotionGalleryImage> =>
    request<ApiPromotionGalleryImage>(`/api/admin/promotions/gallery/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  create: (data: {
    title: string; subtitle?: string; imageUrl?: string; backgroundColor?: string
    ctaLabel?: string; linkType?: string; linkTargetId?: number | null
    linkUrl?: string; activeDays?: string | null; active?: boolean; displayOrder?: number
  }): Promise<ApiPromotion> =>
    request<ApiPromotion>('/api/admin/promotions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{
    title: string; subtitle: string; imageUrl: string; backgroundColor: string
    ctaLabel: string; linkType: string; linkTargetId: number | null
    linkUrl: string; activeDays: string | null; active: boolean; displayOrder: number
  }>): Promise<ApiPromotion> =>
    request<ApiPromotion>(`/api/admin/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  uploadImage: (id: number, file: File): Promise<string> => {
    const form = new FormData(); form.append('file', file)
    return requestForm<string>(`/api/admin/promotions/${id}/image`, form)
  },
  delete: (id: number): Promise<void> =>
    request<void>(`/api/admin/promotions/${id}`, { method: 'DELETE' }),
}
