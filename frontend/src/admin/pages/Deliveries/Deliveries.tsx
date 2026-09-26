import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiDeliveryControl } from '../../../services/api'

const brl = (v = 0) => `R$ ${v.toFixed(2).replace('.', ',')}`

export function AdminDeliveries() {
  const [data, setData] = useState<ApiDeliveryControl | null>(null)
  const [paying, setPaying] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const load = () => adminApi.getDeliveryControl().then(setData)
  useEffect(() => { void load() }, [])
  const pay = async (driverId: number) => {
    if (!amount || Number(amount) <= 0) return
    await adminApi.payDeliveryDriver({ driverId, amount: Number(amount), notes })
    setPaying(null); setAmount(''); setNotes(''); await load()
  }

  return <AdminLayout title="Controle de entregas">
    {!data ? <p>Carregando...</p> : <>
      <div className="tableCard" style={{ padding: 18, marginBottom: 20 }}>
        <span style={{ color: '#64748B' }}>Total pendente para entregadores</span>
        <strong style={{ display: 'block', fontSize: 26, marginTop: 8 }}>{brl(data.totalDueToDrivers)}</strong>
      </div>

      <div className="tableCard" style={{ marginBottom: 20 }}>
        <div className="tableHeader"><span className="tableTitle">Fechamento por entregador</span></div>
        <div className="tableWrapper"><table className="table"><thead><tr><th>Entregador</th><th>Entregas</th><th>Ganho</th><th>Já pago</th><th>Saldo a pagar</th><th></th></tr></thead><tbody>
          {data.driverBalances.map(driver => <>
            <tr key={driver.driverId}><td><strong>{driver.driverName}</strong></td><td>{driver.deliveryCount}</td><td>{brl(driver.earned)}</td><td>{brl(driver.paid)}</td><td><strong style={{ color: driver.balance > 0 ? '#DC2626' : '#2E7D5B' }}>{brl(driver.balance)}</strong></td><td>{driver.balance > 0 && <button className="btn btnPrimary btnSm" onClick={() => { setPaying(driver.driverId); setAmount(String(driver.balance)); setNotes('') }}>Pagar</button>}</td></tr>
            {paying === driver.driverId && <tr key={`${driver.driverId}-pay`}><td colSpan={6} style={{ background: '#F8FAFC' }}><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 4 }}><input className="formInput" style={{ width: 145 }} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /><input className="formInput" style={{ flex: 1, minWidth: 180 }} placeholder="Observação do pagamento (opcional)" value={notes} onChange={e => setNotes(e.target.value)} /><button className="btn btnPrimary" onClick={() => void pay(driver.driverId)}>Confirmar pagamento</button><button className="btn btnSecondary" onClick={() => setPaying(null)}>Cancelar</button></div></td></tr>}
          </>)}
        </tbody></table></div>
      </div>

      <div className="tableCard"><div className="tableHeader"><span className="tableTitle">Histórico de pagamentos</span></div><div className="tableWrapper"><table className="table"><thead><tr><th>Data</th><th>Entregador</th><th>Observação</th><th>Valor pago</th></tr></thead><tbody>{data.payments.length ? data.payments.map(p => <tr key={p.id}><td>{new Date(p.createdAt).toLocaleString('pt-BR')}</td><td>{p.driverName}</td><td>{p.notes || '—'}</td><td><strong>{brl(p.amount)}</strong></td></tr>) : <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: 28 }}>Nenhum pagamento registrado.</td></tr>}</tbody></table></div></div>
    </>}
  </AdminLayout>
}
