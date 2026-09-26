import { useState, useEffect } from 'react'
import { IconClipboard, IconXCircle, IconMotorcycle, IconWalking, IconDollarSign, IconTrendingUp, IconBarChart, IconPackage, IconDownload } from '../../../components/Icon/Icon'
import React from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiMonthlyReport } from '../../../services/api'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

function fmt(val: number) {
  return `R$ ${val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function pct(a: number, b: number) {
  if (!b) return '—'
  return `${((a / b) * 100).toFixed(1)}%`
}

// ── Excel export via SheetJS CDN (loaded dynamically) ───────────────
async function exportExcel(report: ApiMonthlyReport) {
  // Load SheetJS if not already present
  if (!(window as any).XLSX) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Falha ao carregar SheetJS'))
      document.head.appendChild(s)
    })
  }
  const XLSX = (window as any).XLSX

  const wb = XLSX.utils.book_new()

  // ── Aba 1: Resumo ───────────────────────────────────────────
  const resumo = [
    ['FastFit — Relatório Mensal'],
    [`Período: ${report.monthName} / ${report.year}`],
    [],
    ['RESUMO GERAL', ''],
    ['Pedidos realizados', report.totalOrders],
    ['Pedidos cancelados', report.canceledOrders],
    ['Pedidos entregues (delivery)', report.deliveryCount],
    ['Retiradas no local (pickup)', report.pickupCount],
    [],
    ['FINANCEIRO', ''],
    ['Receita total', report.totalRevenue],
    ['Receita via delivery', report.deliveryRevenue],
    ['Custo total (produtos)', report.totalCost],
    ['Lucro bruto', report.totalProfit],
    ['Margem de lucro', report.totalRevenue ? `${((report.totalProfit / report.totalRevenue) * 100).toFixed(1)}%` : '—'],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(resumo)
  ws1['!cols'] = [{ wch: 32 }, { wch: 18 }]

  // Style header rows
  const headerRows = [0, 1, 3, 9]
  headerRows.forEach(r => {
    const cell = ws1[XLSX.utils.encode_cell({ r, c: 0 })]
    if (cell) cell.s = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: '2E7D5B' } } }
  })

  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo')

  // ── Aba 2: Produtos ─────────────────────────────────────────
  const prodRows = [
    ['Produto', 'Qtd Vendida', 'Receita (R$)', 'Custo (R$)', 'Lucro (R$)', 'Margem'],
    ...report.topProducts.map(p => [
      p.productName,
      p.quantitySold,
      Number(p.revenue.toFixed(2)),
      Number(p.cost.toFixed(2)),
      Number(p.profit.toFixed(2)),
      p.revenue ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '—',
    ])
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(prodRows)
  ws2['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Produtos')

  // Download
  const filename = `fastfit_${report.year}_${String(report.month).padStart(2, '0')}_${report.monthName}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ── Stat card ────────────────────────────────────────────────────────
function Stat({ label, value, sub, color = '#2E7D5B', bg = '#E8F5EE', icon }:
  { label: string; value: string; sub?: string; color?: string; bg?: string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: 600 }}>{sub}</div>}
    </div>
  )
}

export function AdminReports() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<ApiMonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = async () => {
    setLoading(true); setError('')
    try {
      const r = await adminApi.getMonthlyReport(year, month)
      setReport(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatório')
    } finally { setLoading(false) }
  }

  useEffect(() => { void fetchReport() }, [year, month])

  const handleExport = async () => {
    if (!report) return
    setExporting(true)
    try { await exportExcel(report) }
    catch (e) { alert('Erro ao exportar: ' + (e instanceof Error ? e.message : 'tente novamente')) }
    finally { setExporting(false) }
  }

  // Year options: current year and 3 previous
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)

  const margin = report && report.totalRevenue
    ? ((report.totalProfit / report.totalRevenue) * 100).toFixed(1)
    : null

  return (
    <AdminLayout
      title="Relatórios"
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Seletor de período */}
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={selectStyle}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="btn btnPrimary"
            onClick={() => void handleExport()}
            disabled={!report || exporting}
          >
            {exporting ? 'Gerando...' : 'Exportar Excel'}
          </button>
        </div>
      }
    >
      {error && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}><IconBarChart size={32} color="var(--primary)" /></div>
          <div>Carregando relatório...</div>
        </div>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Título do período */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
              {report.monthName} {report.year}
            </h2>
            {margin !== null && (
              <span style={{
                background: Number(margin) >= 30 ? '#D1FAE5' : Number(margin) >= 0 ? '#FEF3C7' : '#FEE2E2',
                color: Number(margin) >= 30 ? '#059669' : Number(margin) >= 0 ? '#D97706' : '#DC2626',
                padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800,
              }}>
                Margem {margin}%
              </span>
            )}
          </div>

          {/* Cards — Pedidos */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Pedidos</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              <Stat icon={<IconClipboard size={16} />} label="Total de pedidos" value={String(report.totalOrders)} />
              <Stat icon={<IconXCircle size={16} />} label="Cancelados" value={String(report.canceledOrders)} color="#DC2626" bg="#FEE2E2" />
              <Stat icon={<IconMotorcycle size={16} />} label="Deliveries" value={String(report.deliveryCount)}
                sub={pct(report.deliveryCount, report.totalOrders - report.canceledOrders) + ' do total'}
                color="#1D4ED8" bg="#DBEAFE" />
              <Stat icon={<IconWalking size={16} />} label="Retiradas" value={String(report.pickupCount)}
                sub={pct(report.pickupCount, report.totalOrders - report.canceledOrders) + ' do total'}
                color="#7C3AED" bg="#EDE9FE" />
            </div>
          </div>

          {/* Cards — Financeiro */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Financeiro</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              <Stat icon={<IconDollarSign size={16} />} label="Receita total" value={fmt(report.totalRevenue)} />
              <Stat icon={<IconMotorcycle size={16} />} label="Receita (deliveries)" value={fmt(report.deliveryRevenue)}
                sub={pct(report.deliveryRevenue, report.totalRevenue) + ' da receita total'}
                color="#1D4ED8" bg="#DBEAFE" />
              <Stat icon="📉" label="Custo total" value={fmt(report.totalCost)}
                color="#DC2626" bg="#FEE2E2" />
              <Stat icon={<IconTrendingUp size={16} />} label="Lucro bruto" value={fmt(report.totalProfit)}
                color={report.totalProfit >= 0 ? '#059669' : '#DC2626'}
                bg={report.totalProfit >= 0 ? '#D1FAE5' : '#FEE2E2'} />
            </div>
          </div>

          {/* Tabela de produtos */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Produtos mais vendidos</p>
            {report.topProducts.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                Nenhuma venda no período
              </div>
            ) : (
              <div className="tableCard">
                <div className="tableWrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Receita</th>
                        <th>Custo</th>
                        <th>Lucro</th>
                        <th>Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.topProducts.map((p, i) => {
                        const m = p.revenue ? (p.profit / p.revenue) * 100 : 0
                        return (
                          <tr key={p.productName}>
                            <td style={{ color: '#94A3B8', fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ fontWeight: 700 }}>{p.productName}</td>
                            <td>
                              <span style={{
                                background: '#E8F5EE', color: '#2E7D5B',
                                padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 800
                              }}>{p.quantitySold}×</span>
                            </td>
                            <td style={{ fontWeight: 700 }}>{fmt(p.revenue)}</td>
                            <td style={{ color: '#DC2626' }}>{p.cost > 0 ? fmt(p.cost) : <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                            <td style={{ color: p.profit >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                              {p.cost > 0 ? fmt(p.profit) : <span style={{ color: '#CBD5E1' }}>—</span>}
                            </td>
                            <td>
                              {p.cost > 0 ? (
                                <span style={{
                                  background: m >= 30 ? '#D1FAE5' : m >= 0 ? '#FEF3C7' : '#FEE2E2',
                                  color: m >= 30 ? '#059669' : m >= 0 ? '#D97706' : '#DC2626',
                                  padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700
                                }}>{m.toFixed(1)}%</span>
                              ) : <span style={{ color: '#CBD5E1', fontSize: 13 }}>sem custo</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={2} style={{ fontWeight: 800, color: '#0F172A', padding: '10px 12px' }}>TOTAL</td>
                        <td style={{ fontWeight: 800 }}>{report.topProducts.reduce((s, p) => s + p.quantitySold, 0)}×</td>
                        <td style={{ fontWeight: 800 }}>{fmt(report.totalRevenue)}</td>
                        <td style={{ fontWeight: 800, color: '#DC2626' }}>
                          {report.totalCost > 0 ? fmt(report.totalCost) : '—'}
                        </td>
                        <td style={{ fontWeight: 800, color: report.totalProfit >= 0 ? '#059669' : '#DC2626' }}>
                          {report.totalCost > 0 ? fmt(report.totalProfit) : '—'}
                        </td>
                        <td>
                          {margin !== null && (
                            <span style={{
                              background: Number(margin) >= 30 ? '#D1FAE5' : Number(margin) >= 0 ? '#FEF3C7' : '#FEE2E2',
                              color: Number(margin) >= 30 ? '#059669' : Number(margin) >= 0 ? '#D97706' : '#DC2626',
                              padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 800
                            }}>{margin}%</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Aviso sobre custo */}
          {report.totalCost === 0 && report.topProducts.length > 0 && (
            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A',
              borderRadius: 12, padding: '12px 16px',
              fontSize: 13, color: '#92400E', fontWeight: 600,
            }}>
              💡 Custo zerado: para calcular lucro, cadastre o campo &ldquo;Custo&rdquo; nos produtos em Admin → Produtos.
            </div>
          )}

        </div>
      ) : null}
    </AdminLayout>
  )
}

const selectStyle: React.CSSProperties = {
  border: '2px solid #E2E8F0', borderRadius: 10, padding: '7px 12px',
  fontSize: 14, fontFamily: 'inherit', color: '#1E293B',
  background: 'white', cursor: 'pointer', outline: 'none',
}
