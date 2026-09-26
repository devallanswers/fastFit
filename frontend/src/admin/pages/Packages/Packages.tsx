import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { packagesApi, ApiPackage, adminApi, ApiCategory, ApiProduct, assetUrl } from '../../../services/api'
import { useToastContext } from '../../../context/ToastContext'
import { IconPlus, IconEdit, IconTrash, IconX, IconCheck, IconArrowLeft } from '../../../components/Icon/Icon'
import '../../components/AdminLayout/admin.css'


type SlotForm = {
  id?: number
  name: string
  quantity: number
  displayOrder: number
  categoryId: number | null
  allowedProductIds: number[]
}

type PackageForm = {
  name: string
  description: string
  price: string
  active: boolean
  displayOrder: number
  slots: SlotForm[]
}

const emptySlot = (): SlotForm => ({
  name: '', quantity: 1, displayOrder: 0, categoryId: null, allowedProductIds: []
})

const emptyForm = (): PackageForm => ({
  name: '', description: '', price: '', active: true, displayOrder: 0, slots: []
})

export function AdminPackages() {
  const { toast } = useToastContext()
  const [packages, setPackages] = useState<ApiPackage[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PackageForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [reordering, setReordering] = useState(false)
  const dragIdxRef = useRef<number | null>(null)

  const handleDragStart = (idx: number) => { dragIdxRef.current = idx }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    const from = dragIdxRef.current
    if (from === null || from === idx) return
    setPackages(prev => {
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
    try { await adminApi.reorderPackages(packages.map(p => p.id)) }
    catch { /* silent */ }
    finally { setReordering(false) }
  }

    const load = () => {
    setLoading(true)
    Promise.all([
      packagesApi.getAll(),
      adminApi.getCategories(),
      adminApi.getProducts(),
    ]).then(([pkgs, cats, prods]) => {
      setPackages(pkgs)
      setCategories(cats.filter((c: ApiCategory) => c.active))
      setProducts(prods.filter((p: ApiProduct) => p.active))
    }).catch(() => toast.error('Erro ao carregar dados'))
    .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(emptyForm()); setEditingId(null); setImageFile(null); setImagePreview(null); setModal('create')
  }

  const openEdit = (pkg: ApiPackage) => {
    setForm({
      name: pkg.name,
      description: pkg.description ?? '',
      price: String(pkg.price),
      active: pkg.active,
      displayOrder: pkg.displayOrder,
      slots: pkg.slots.map(s => ({
        id: s.id,
        name: s.name,
        quantity: s.quantity,
        displayOrder: s.displayOrder,
        categoryId: s.categoryId ?? null,
        allowedProductIds: s.allowedProducts.map(p => p.id),
      }))
    })
    setEditingId(pkg.id)
    setImageFile(null)
    setImagePreview(pkg.imageUrl ? assetUrl(pkg.imageUrl) : null)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { toast.error('Nome e preço são obrigatórios'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        active: form.active,
        displayOrder: form.displayOrder,
        slots: form.slots.map((s, i) => ({
          ...s.id ? { id: s.id } : {},
          name: s.name,
          quantity: s.quantity,
          displayOrder: s.displayOrder || i,
          categoryId: s.categoryId ?? null,
          allowedProductIds: s.allowedProductIds,
        }))
      }

      let saved: ApiPackage
      if (modal === 'create') {
        saved = await packagesApi.create(payload)
      } else {
        saved = await packagesApi.update(editingId!, payload)
      }

      // Upload image if changed
      if (imageFile) {
        await packagesApi.uploadImage(saved.id, imageFile)
      }

      toast.success(modal === 'create' ? 'Pacote criado!' : 'Pacote atualizado!')
      setModal(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir pacote "${name}"?`)) return
    try {
      await packagesApi.delete(id)
      toast.success('Pacote excluído')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  const addSlot = () => setForm(f => ({ ...f, slots: [...f.slots, emptySlot()] }))
  const removeSlot = (i: number) => setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }))
  const updateSlot = (i: number, patch: Partial<SlotForm>) =>
    setForm(f => ({ ...f, slots: f.slots.map((s, idx) => idx === i ? { ...s, ...patch } : s) }))

  const toggleProduct = (slotIdx: number, productId: number) => {
    const slot = form.slots[slotIdx]
    const ids = slot.allowedProductIds
    const next = ids.includes(productId) ? ids.filter(x => x !== productId) : [...ids, productId]
    updateSlot(slotIdx, { allowedProductIds: next })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Products filtered by slot category selection
  const getSlotProducts = (slot: SlotForm): ApiProduct[] => {
    if (slot.categoryId !== null) {
      return products.filter(p => p.category?.id === slot.categoryId)
    }
    return products
  }

  return (
    <AdminLayout title="Pacotes">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btnPrimary" onClick={openCreate}>
          <IconPlus size={16} style={{ marginRight: 6 }} /> Novo Pacote
        </button>
      </div>

      {loading ? (
        <div className="tableCard"><div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Carregando...</div></div>
      ) : packages.length === 0 ? (
        <div className="tableCard">
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ fontWeight: 700 }}>Nenhum pacote criado ainda</p>
            <button className="btn btnPrimary" style={{ marginTop: 16 }} onClick={openCreate}>Criar primeiro pacote</button>
          </div>
        </div>
      ) : (
        <div className="tableCard">
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9' }}>
            {reordering && <span style={{ fontSize: 12, color: '#64748B' }}>Salvando ordem...</span>}
            <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>⠿ Arraste para reordenar</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Pacote</th>
                <th>Slots</th>
                <th>Preço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, idx) => (
                <tr
                  key={pkg.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={() => void handleDragEnd()}
                  style={{ cursor: 'grab', opacity: reordering ? 0.7 : 1 }}
                >
                  <td style={{ color: '#CBD5E1', width: 28, textAlign: 'center', userSelect: 'none' }}>⠿</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {pkg.imageUrl
                        ? <img src={assetUrl(pkg.imageUrl)} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
                      }
                      <div>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{pkg.name}</div>
                        {pkg.description && <div style={{ fontSize: 12, color: '#94A3B8' }}>{pkg.description.slice(0, 40)}...</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {pkg.slots.map(s => (
                        <span key={s.id} style={{ background: '#E8F5EE', color: '#2E7D5B', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                          {s.quantity}× {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td><strong>R$ {Number(pkg.price).toFixed(2).replace('.', ',')}</strong></td>
                  <td>
                    <span className={`badge ${pkg.active ? 'badgeActive' : 'badgeCanceled'}`}>
                      {pkg.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btnIcon" onClick={() => openEdit(pkg)}><IconEdit size={15} /></button>
                      <button className="btn btnIcon btnDanger" onClick={() => handleDelete(pkg.id, pkg.name)}><IconTrash size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="modalOverlay" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="modalHeader" style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', flexShrink: 0, marginBottom: 0 }}>
              <div className="modalTitle">{modal === 'create' ? 'Novo Pacote' : 'Editar Pacote'}</div>
              <button className="modalClose" onClick={() => setModal(null)}><IconX size={18} /></button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>
              {/* Basic info */}
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Informações do pacote</p>
                <div className="formGrid">
                  <div className="formGroup">
                    <label className="formLabel">Nome *</label>
                    <input className="formInput" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pacote Semanal Fit" />
                  </div>
                  <div className="formGroup">
                    <label className="formLabel">Preço *</label>
                    <input type="number" className="formInput" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" min="0" step="0.01" />
                  </div>
                </div>
                <div className="formGroup" style={{ marginTop: 10 }}>
                  <label className="formLabel">Descrição</label>
                  <textarea className="formInput" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o pacote..." rows={2} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                    Ativo (visível para clientes)
                  </label>
                </div>
              </div>

              {/* Image */}
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Imagem do pacote</p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                {imagePreview
                  ? <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={imagePreview} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                      <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 10, border: 'none', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Trocar</button>
                    </div>
                  : <button className="btn" onClick={() => fileRef.current?.click()} style={{ padding: '10px 20px' }}>Selecionar imagem</button>
                }
              </div>

              {/* Slots */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slots do pacote</p>
                  <button className="btn btnPrimary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={addSlot}>
                    <IconPlus size={14} style={{ marginRight: 4 }} /> Adicionar Slot
                  </button>
                </div>

                {form.slots.length === 0 && (
                  <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: 10, textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                    Nenhum slot. Clique em "Adicionar Slot" para definir os itens do pacote.
                  </div>
                )}

                {form.slots.map((slot, i) => (
                  <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>Slot {i + 1}</span>
                      <button className="btn btnIcon btnDanger" onClick={() => removeSlot(i)}><IconX size={14} /></button>
                    </div>

                    <div className="formGrid" style={{ marginBottom: 10 }}>
                      <div className="formGroup">
                        <label className="formLabel">Nome do slot *</label>
                        <input className="formInput" value={slot.name} onChange={e => updateSlot(i, { name: e.target.value })} placeholder="Ex: Sucos, Sanduíches..." />
                      </div>
                      <div className="formGroup">
                        <label className="formLabel">Quantidade *</label>
                        <input type="number" className="formInput" value={slot.quantity} min={1} onChange={e => updateSlot(i, { quantity: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="formGroup" style={{ marginBottom: 10 }}>
                      <label className="formLabel">Filtrar por categoria (opcional)</label>
                      <select className="formInput" value={slot.categoryId ?? ''} onChange={e => updateSlot(i, { categoryId: e.target.value ? Number(e.target.value) : null, allowedProductIds: [] })}>
                        <option value="">Sem filtro de categoria</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>

                    <div className="formGroup">
                      <label className="formLabel">
                        Produtos específicos elegíveis
                        {slot.categoryId && <span style={{ color: '#94A3B8', fontWeight: 600 }}> — filtrando por categoria selecionada</span>}
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, maxHeight: 160, overflowY: 'auto', padding: 4 }}>
                        {getSlotProducts(slot).length === 0
                          ? <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Nenhum produto encontrado</p>
                          : getSlotProducts(slot).map(p => {
                              const selected = slot.allowedProductIds.includes(p.id)
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => toggleProduct(i, p.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '5px 10px', borderRadius: 8, border: '1.5px solid',
                                    borderColor: selected ? '#2E7D5B' : '#E2E8F0',
                                    background: selected ? '#E8F5EE' : '#fff',
                                    color: selected ? '#2E7D5B' : '#475569',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}>
                                  {selected && <IconCheck size={11} color="#2E7D5B" />}
                                  {p.name}
                                </button>
                              )
                            })
                        }
                      </div>
                      {slot.allowedProductIds.length > 0 && slot.categoryId === null && (
                        <p style={{ fontSize: 11, color: '#2E7D5B', fontWeight: 700, marginTop: 6 }}>
                          {slot.allowedProductIds.length} produto(s) selecionado(s) especificamente
                        </p>
                      )}
                      {slot.categoryId !== null && slot.allowedProductIds.length === 0 && (
                        <p style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginTop: 6 }}>
                          Todos os produtos da categoria estarão disponíveis. Selecione acima para restringir.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btnPrimary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Pacote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
