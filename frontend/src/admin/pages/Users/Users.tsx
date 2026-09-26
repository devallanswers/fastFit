import { useState, useEffect } from 'react'
import { IconSearch, IconCrown, IconProfile, IconCheck, IconClock } from '../../../components/Icon/Icon'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiUser } from '../../../services/api'

export function AdminUsers() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { adminApi.getUsers().then(setUsers).finally(() => setLoading(false)) }, [])

  const handleToggle = async (id: number) => {
    const u = await adminApi.toggleUser(id)
    setUsers(prev => prev.map(x => x.id === u.id ? u : x))
  }

  const filtered = users.filter(u => !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <AdminLayout title="Usuários">
      <div className="tableCard">
        <div className="tableHeader">
          <span className="tableTitle">Todos os Usuários ({filtered.length})</span>
          <div className="searchBar">
            <IconSearch size={15} color="#94A3B8" />
            <input className="searchInput" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Carregando...</div> : (
          <div className="tableWrapper"><table className="table">
            <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Função</th><th>Email verificado</th><th>Cadastro</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontSize: 13 }}>{u.email}</td>
                  <td style={{ fontSize: 13, color: '#64748B' }}>{u.phone ?? '—'}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badgePrep' : 'badgeReceived'}`}>{u.role === 'ADMIN' ? 'Admin' : 'Usuário'}</span></td>
                  <td><span className={`badge ${u.emailVerified ? 'badgeActive' : 'badgeCanceled'}`}>{u.emailVerified ? 'Verificado' : 'Pendente'}</span></td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <label className="toggle">
                        <input type="checkbox" checked={u.active} onChange={() => void handleToggle(u.id)} />
                        <span className="toggleSlider" />
                      </label>
                    )}
                    {u.role === 'ADMIN' && <span style={{ fontSize: 12, color: '#64748B' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </AdminLayout>
  )
}
