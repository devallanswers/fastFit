import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { IconPackage, IconTrendingUp, IconUsers, IconShoppingBag, IconBarChart, IconClipboard, IconCheckCircle } from '../../../components/Icon/Icon'
import { adminApi, ApiDashboard, ApiOrder, ApiCashRegister } from '../../../services/api'

export function AdminDashboard() {
  const [stats, setStats] = useState<ApiDashboard | null>(null)
  const [activeOrders, setActiveOrders] = useState<ApiOrder[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const statusLabel: Record<string, string> = {
    RECEIVED: 'Recebido', IN_PREPARATION: 'Em preparo',
    READY: 'Pronto', FINISHED: 'Entregue', CANCELED: 'Cancelado'
  }
  const statusClass: Record<string, string> = {
    RECEIVED: 'badgeReceived', IN_PREPARATION: 'badgePrep',
    READY: 'badgeReady', FINISHED: 'badgeFinished', CANCELED: 'badgeCanceled'
  }

  const load = async () => {
    try {
      const [s, o, cash] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getActiveOrders(),
        adminApi.getOpenCash(),
      ])
      setStats(s)
      setActiveOrders(o)
      setCashBalance((cash as ApiCashRegister | null)?.currentBalance ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const interval = setInterval(() => void load(), 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AdminLayout title="Dashboard" actions={
      <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="liveDot" /> Atualizando a cada 15s
      </span>
    }>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>Carregando...</div>
      ) : (
        <>
          <div className="statGrid">
            {[
              { Icon: IconPackage,     value: stats?.todayOrders ?? 0,                                              label: 'Pedidos hoje',    green: false },
              { Icon: IconCheckCircle, value: `R$ ${cashBalance.toFixed(2).replace('.', ',')}`,                     label: 'Saldo em caixa',  green: true  },
              { Icon: IconTrendingUp,  value: `R$ ${(stats?.todayRevenue ?? 0).toFixed(2).replace('.', ',')}`,      label: 'Receita hoje',    green: true  },
              { Icon: IconClipboard,   value: stats?.activeOrders ?? 0,                                             label: 'Pedidos ativos',  green: false },
              { Icon: IconUsers,       value: stats?.totalUsers ?? 0,                                               label: 'Usuários ativos', green: false },
              { Icon: IconShoppingBag, value: stats?.activeProducts ?? 0,                                           label: 'Produtos ativos', green: false },
              { Icon: IconBarChart,    value: stats?.totalOrders ?? 0,                                              label: 'Total de pedidos',green: false },
            ].map(s => (
              <div key={s.label} className={`statCard ${s.green ? 'statCardGreen' : ''}`}>
                <div className="statCardIcon"><s.Icon size={22} /></div>
                <div className="statCardValue">{s.value}</div>
                <div className="statCardLabel">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="tableCard">
            <div className="tableHeader">
              <span className="tableTitle">
                <span className="liveDot" style={{ marginRight: 8 }} />
                Pedidos Ativos
              </span>
              <span style={{ fontSize: 13, color: '#64748B' }}>{activeOrders.length} pedidos</span>
            </div>
            {activeOrders.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                Nenhum pedido ativo no momento
              </div>
            ) : (
              <div className="tableWrapper"><table className="table">
                <thead>
                  <tr>
                    <th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map(o => (
                    <tr key={o.id}>
                      <td><strong>#{o.id}</strong></td>
                      <td>{o.userName}</td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>
                        {o.items.slice(0,2).map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                        {o.items.length > 2 && ` +${o.items.length - 2}`}
                      </td>
                      <td><strong>R$ {o.totalAmount.toFixed(2).replace('.', ',')}</strong></td>
                      <td><span className={`badge ${statusClass[o.status] ?? 'badgeReceived'}`}>{statusLabel[o.status] ?? o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}