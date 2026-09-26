import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiCategory } from '../../../services/api'
import { IconEdit, IconTrash } from '../../../components/Icon/Icon'

export function AdminCategories() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing]       = useState<ApiCategory | null>(null)
  const [form, setForm]             = useState({ name: '', description: '' })
  const [saving, setSaving]         = useState(false)
  const [reordering, setReordering] = useState(false)
  const dragIdxRef                  = useRef<number | null>(null)

  useEffect(() => {
    adminApi.getCategories().then(setCategories).finally(() => setLoading(false))
  }, [])

  const handleDragStart = (idx: number) => { dragIdxRef.current = idx }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    const from = dragIdxRef.current
    if (from === null || from === idx) return
    setCategories(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(idx, 0, item)
      dragIdxRef.current = idx
      return next
    })
  }

  const handleDragEnd = async () => {
    dragIdxRef.current = null
    setReordering(true)
    try { await adminApi.reorderCategories(categories.map(c => c.id)) }
    catch { /* silent */ }
    finally { setReordering(false) }
  }

  const openCreate = () => {
    setEditing(null); setForm({ name: '', description: '' }); setModal('create')
  }
  const openEdit = (c: ApiCategory) => {
    setEditing(c); setForm({ name: c.name, description: c.description ?? '' }); setModal('edit')
  }
  const handleSave = async () => {
    if (!form.name) return; setSaving(true)
    try {
      const data = { name: form.name, description: form.description, displayOrder: 0 }
      if (modal === 'create') {
        const c = await adminApi.createCategory(data)
        setCategories(prev => [...prev, c])
      } else if (editing) {
        const c = await adminApi.updateCategory(editing.id, data)
        setCategories(prev => prev.map(x => x.id === c.id ? c : x))
      }
      setModal(null)
    } finally { setSaving(false) }
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Remover categoria? (Só funciona se não houver produtos)')) return
    try { await adminApi.deleteCategory(id); setCategories(prev => prev.filter(x => x.id !== id)) }
    catch (e) { alert(e instanceof Error ? e.message : 'Erro ao remover') }
  }

  return (
    <AdminLayout title="Categorias" actions={<button className="btn btnPrimary" onClick={openCreate}>+ Nova Categoria</button>}>
      <div className="tableCard">
        <div className="tableHeader">
          <span className="tableTitle">Categorias ({categories.length})</span>
          {reordering && <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>Salvando ordem...</span>}
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>⠿ Arraste para reordenar</span>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Carregando...</div> : (
          <div className="tableWrapper"><table className="table">
            <thead><tr><th></th><th>Nome</th><th>Descrição</th><th>Produtos</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {categories.map((c, idx) => (
                <tr
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={() => void handleDragEnd()}
                  style={{ cursor: 'grab', opacity: reordering ? 0.7 : 1 }}
                >
                  <td style={{ color: '#CBD5E1', width: 28, textAlign: 'center', userSelect: 'none' }}>⠿</td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: '#64748B', fontSize: 13 }}>{c.description || '—'}</td>
                  <td><span className={`badge ${c.productCount > 0 ? 'badgeActive' : 'badgeInactive'}`}>{c.productCount} produtos</span></td>
                  <td><span className={`badge ${c.active ? 'badgeActive' : 'badgeInactive'}`}>{c.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btnIcon" onClick={() => openEdit(c)}><IconEdit size={15} /></button>
                      <button className="btn btnIcon btnDanger" onClick={() => void handleDelete(c.id)}><IconTrash size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {modal && (
        <div className="modalOverlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modalTitle">{modal === 'create' ? '+ Nova Categoria' : 'Editar Categoria'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="formGroup"><label className="formLabel">Nome *</label><input className="formInput" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="formGroup"><label className="formLabel">Descrição</label><input className="formInput" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
            <div className="modalFooter">
              <button className="btn btnSecondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btnPrimary" onClick={() => void handleSave()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
