import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'

import { Home }     from './pages/Home/Home'
import { Cart }     from './pages/Cart/Cart'
import { Orders }   from './pages/Orders/Orders'
import { About }    from './pages/About/About'
import { Packages } from './pages/Packages/Packages'
import { PixPayment } from './pages/PixPayment/PixPayment'

// Login exclusivo para admin — acessado via /admin/login
import { Login } from './pages/Login/Login'

import { AdminDashboard }  from './admin/pages/Dashboard/Dashboard'
import { AdminOrders }     from './admin/pages/Orders/Orders'
import { AdminProducts }   from './admin/pages/Products/Products'
import { AdminCategories } from './admin/pages/Categories/Categories'
import { AdminUsers }      from './admin/pages/Users/Users'
import { AdminSettings }   from './admin/pages/Settings/Settings'
import { AdminReports }    from './admin/pages/Reports/Reports'
import { AdminPackages }   from './admin/pages/Packages/Packages'
import { AdminPromotions } from './admin/pages/Promotions/Promotions'
import { AdminCash } from './admin/pages/Cash/Cash'
import { AdminDeliveries } from './admin/pages/Deliveries/Deliveries'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (!isAdmin)         return <Navigate to="/"            replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Cliente (sem login) ─────────────────────────────────────── */}
      <Route path="/"         element={<Home />}       />
      <Route path="/about"    element={<About />}      />
      <Route path="/packages" element={<Packages />}   />
      <Route path="/cart"     element={<Cart />}       />
      <Route path="/orders"   element={<Orders />}     />
      <Route path="/pix"      element={<PixPayment />} />

      {/* ── Admin ───────────────────────────────────────────────────── */}
      <Route path="/admin/login"       element={<Login />} />
      <Route path="/admin"             element={<AdminRoute><AdminDashboard  /></AdminRoute>} />
      <Route path="/admin/orders"      element={<AdminRoute><AdminOrders     /></AdminRoute>} />
      <Route path="/admin/deliveries"  element={<AdminRoute><AdminDeliveries /></AdminRoute>} />
      <Route path="/admin/products"    element={<AdminRoute><AdminProducts   /></AdminRoute>} />
      <Route path="/admin/categories"  element={<AdminRoute><AdminCategories /></AdminRoute>} />
      <Route path="/admin/users"       element={<AdminRoute><AdminUsers      /></AdminRoute>} />
      <Route path="/admin/settings"    element={<AdminRoute><AdminSettings   /></AdminRoute>} />
      <Route path="/admin/reports"     element={<AdminRoute><AdminReports    /></AdminRoute>} />
      <Route path="/admin/packages"    element={<AdminRoute><AdminPackages   /></AdminRoute>} />
      <Route path="/admin/promotions"  element={<AdminRoute><AdminPromotions /></AdminRoute>} />
      <Route path="/admin/cash"        element={<AdminRoute><AdminCash /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
