import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiCashRegister, ApiCashTransaction } from '../../../services/api'

export function AdminCash() {
  const [register, setRegister] = useState<ApiCashRegister | null>(null)
  const [txs, setTxs] = useState<ApiCashTransaction[]>([])
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'IN' | 'OUT'>('IN')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    // GET /open now auto-creates the register if none exists
    const r = await adminApi.getOpenCash()
    setRegister(r as ApiCashRegister | null)
    if (r) {
      const t = await adminApi.listCashTxs(r.id)
      setTxs(t)
    } else {
      setTxs([])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleAddTx = async () => {
    if (!register || !amount || Number(amount) <= 0) return
    await adminApi.addCashTx(
      register.id,
      'sistema',
      type,
      Number(amount),
      category || undefined,
      notes || undefined
    )
    setAmount('')
    setCategory('')
    setNotes('')
    void load()
  }

  const totalIn  = txs.filter(t => t.type === 'IN').reduce((a, t) => a + t.amount, 0)
  const totalOut = txs.filter(t => t.type === 'OUT').reduce((a, t) => a + t.amount, 0)
  const fmt = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

  if (loading) {
    return (
      <AdminLayout title="Caixa">
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Carregando caixa…</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Caixa">

      {/* ── Stat cards ────────────────────────────────── */}
      <div className="statGrid" style={{ marginBottom: 24 }}>
        <div className="statCard">
          <div className="statCardIcon">💰</div>
          <div className="statCardValue">{register ? fmt(register.currentBalance) : 'R$ 0,00'}</div>
          <div className="statCardLabel">Saldo atual</div>
        </div>
        <div className="statCard statCardGreen">
          <div className="statCardIcon">📈</div>
          <div className="statCardValue">{fmt(totalIn)}</div>
          <div className="statCardLabel">Total entradas</div>
        </div>
        <div className="statCard">
          <div className="statCardIcon">📉</div>
          <div className="statCardValue" style={{ color: '#DC2626' }}>{fmt(totalOut)}</div>
          <div className="statCardLabel">Total saídas</div>
        </div>
        <div className="statCard">
          <div className="statCardIcon">🧾</div>
          <div className="statCardValue">{txs.length}</div>
          <div className="statCardLabel">Lançamentos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Novo lançamento ───────────────────────── */}
        <div className="tableCard">
          <div className="tableHeader">
            <span className="tableTitle">Novo lançamento</span>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>

            {/* Type toggle */}
            <div className="formGroup" style={{ marginBottom: 14 }}>
              <label className="formLabel">Tipo</label>
              <div style={{ display: 'flex', border: '2px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setType('IN')}
                  style={{
                    flex: 1, height: 38, border: 'none', fontFamily: 'Nunito, sans-serif',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                    background: type === 'IN' ? '#D1FAE5' : 'transparent',
                    color: type === 'IN' ? '#059669' : '#64748B',
                  }}
                >
                  + Entrada
                </button>
                <button
                  onClick={() => setType('OUT')}
                  style={{
                    flex: 1, height: 38, border: 'none', fontFamily: 'Nunito, sans-serif',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                    background: type === 'OUT' ? '#FEE2E2' : 'transparent',
                    color: type === 'OUT' ? '#DC2626' : '#64748B',
                  }}
                >
                  − Saída
                </button>
              </div>
            </div>

            <div className="formGroup">
              <label className="formLabel">Valor (R$)</label>
              <input
                className="formInput"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label className="formLabel">Categoria</label>
              <input
                className="formInput"
                placeholder="Ex: Sangria, Suprimento…"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label className="formLabel">Observação</label>
              <input
                className="formInput"
                placeholder="Opcional"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              className="btn btnPrimary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={handleAddTx}
              disabled={!amount || Number(amount) <= 0}
            >
              Adicionar lançamento
            </button>
          </div>
        </div>

        {/* ── Tabela de transações ──────────────────── */}
        <div className="tableCard">
          <div className="tableHeader">
            <span className="tableTitle">Transações</span>
            <span className="tableSubtitle">{txs.length} lançamento{txs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="tableWrapper">
            {txs.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                Nenhuma transação ainda
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Data / hora</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Categoria</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(t => (
                    <tr key={t.id}>
                      <td style={{ color: '#94A3B8', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(t.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={
                            t.type === 'IN'
                              ? { background: '#D1FAE5', color: '#059669' }
                              : { background: '#FEE2E2', color: '#DC2626' }
                          }
                        >
                          {t.type === 'IN' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: t.type === 'IN' ? '#059669' : '#DC2626' }}>
                        {fmt(t.amount)}
                      </td>
                      <td style={{ color: '#64748B' }}>{t.category || '—'}</td>
                      <td style={{ color: '#94A3B8', fontSize: 13 }}>{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
