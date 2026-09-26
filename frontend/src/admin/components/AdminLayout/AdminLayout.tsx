import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import logo from '../../../assets/logo.png'
import { IconDashboard, IconPackage, IconShoppingBag, IconTag, IconUsers, IconBarChart, IconSettings, IconLogOut, IconGift, IconStar, IconCheckCircle, IconMotorcycle } from '../../../components/Icon/Icon'
import './admin.css'

interface Props { children: ReactNode; title: string; actions?: ReactNode }

const navItems = [
  { path: '/admin',            Icon: IconDashboard,   label: 'Dashboard'      },
  { path: '/admin/orders',     Icon: IconPackage,     label: 'Pedidos'        },
  { path: '/admin/deliveries', Icon: IconMotorcycle,  label: 'Entregas'       },
  { path: '/admin/products',   Icon: IconShoppingBag, label: 'Produtos'       },
  { path: '/admin/categories', Icon: IconTag,         label: 'Categorias'     },
  { path: '/admin/users',      Icon: IconUsers,       label: 'Usuários'       },
  { path: '/admin/reports',    Icon: IconBarChart,    label: 'Relatórios'     },
  { path: '/admin/packages',   Icon: IconGift,        label: 'Pacotes'        },
  { path: '/admin/promotions', Icon: IconStar,        label: 'Promoções'      },
  { path: '/admin/settings',   Icon: IconSettings,    label: 'Configurações'  },
  { path: '/admin/cash',       Icon: IconCheckCircle, label: 'Caixa'         },
]

export function AdminLayout({ children, title, actions }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="adminLayout">
      <aside className="sidebar">
        <div className="sidebarLogo">
          <img src={logo} alt="FastFit" className="sidebarLogoImg" />
        </div>
        <nav className="sidebarNav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`navItem ${location.pathname === item.path ? 'navItemActive' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="navIcon"><item.Icon size={17} /></span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebarFooter">
          <div className="sidebarUser">
            Logado como<br />
            <span className="sidebarUserName">{user?.name}</span>
          </div>
          <button className="logoutBtn" onClick={handleLogout}>
            <IconLogOut size={15} style={{marginRight:6}} /> Sair
          </button>
        </div>
      </aside>
      <main className="adminMain">
        <div className="adminTopbar">
          <h1 className="adminPageTitle">{title}</h1>
          <div>{actions}</div>
        </div>
        <div className="adminContent">{children}</div>
      </main>
    </div>
  )
}
