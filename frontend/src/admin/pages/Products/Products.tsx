import { useState, useEffect, useRef } from 'react'
import { IconSearch, IconEdit, IconTrash, IconFlame, IconShoppingBag } from '../../../components/Icon/Icon'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { adminApi, ApiProduct, ApiCategory, assetUrl } from '../../../services/api'


async function compressImage(file: File, maxPx = 800, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
        else { width = Math.round(width * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (blob) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        else resolve(file)
      }, 'image/jpeg', quality)
    }
    img.src = url
  })
}

const INITIAL_FORM = {
  name: '', description: '',
  ingredients: '', differentials: '', weightVolume: '', conservation: '',
  price: '', promotionalPrice: '', promotionActive: false, cost: '',
  categoryId: '', active: true, stockQuantity: ''
}

export function AdminProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<ApiProduct | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const fileRef = useRef<HTMLInputElement>(null)
  const dragIdxRef = useRef<number | null>(null)
  const [reordering, setReordering] = useState(false)

  useEffect(() => {
    Promise.all([adminApi.getProducts(), adminApi.getCategories()])
      .then(([p, c]) => { setProducts(p); setCategories(c) })
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditing(null); setForm({ ...INITIAL_FORM })
    setImageFile(null); setImagePreview(null); setSaveError('')
    setModal('create')
  }

  const openEdit = (p: ApiProduct) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '',
      ingredients: p.ingredients ?? '', differentials: p.differentials ?? '',
      weightVolume: p.weightVolume ?? '', conservation: p.conservation ?? '',
      price: String(p.price),
      promotionalPrice: p.promotionalPrice ? String(p.promotionalPrice) : '',
      promotionActive: p.promotionActive,
      cost: p.cost ? String(p.cost) : '',
      categoryId: p.category ? String(p.category.id) : '',
      active: p.active,
      stockQuantity: p.stockQuantity == null ? '' : String(p.stockQuantity),
    })
    setImagePreview(p.imageUrl ? assetUrl(p.imageUrl) : null)
    setImageFile(null); setSaveError('')
    setModal('edit')
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setImagePreview(URL.createObjectURL(f))
    const compressed = await compressImage(f)
    setImageFile(compressed)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError('Nome é obrigatório'); return }
    if (!form.price || isNaN(parseFloat(form.price))) { setSaveError('Informe um preço válido'); return }
    setSaving(true); setSaveError('')
    try {
      const data = {
        name: form.name.trim(), description: form.description.trim(),
        ingredients: form.ingredients.trim() || null,
        differentials: form.differentials.trim() || null,
        weightVolume: form.weightVolume.trim() || null,
        conservation: form.conservation.trim() || null,
        price: parseFloat(form.price),
        promotionalPrice: form.promotionalPrice ? parseFloat(form.promotionalPrice) : null,
        promotionActive: form.promotionActive,
        cost: form.cost ? parseFloat(form.cost) : null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        active: form.active,
        stockQuantity: form.stockQuantity === '' ? null : Number(form.stockQuantity),
      }
      if (modal === 'create') {
        const p = await adminApi.createProduct(data, imageFile ?? undefined)
        setProducts(prev => [p, ...prev])
      } else if (editing) {
        const p = await adminApi.updateProduct(editing.id, data, imageFile ?? undefined)
        setProducts(prev => prev.map(x => x.id === p.id ? p : x))
      }
      setModal(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar produto')
    } finally { setSaving(false) }
  }

  const handleToggle = async (id: number) => {
    try {
      const p = await adminApi.toggleProduct(id)
      setProducts(prev => prev.map(x => x.id === p.id ? p : x))
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover produto permanentemente?')) return
    try {
      await adminApi.deleteProduct(id)
      setProducts(prev => prev.filter(x => x.id !== id))
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro ao remover') }
  }

  const handleDragStart = (idx: number) => { dragIdxRef.current = idx }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    const from = dragIdxRef.current
    if (from === null || from === idx) return
    setProducts(prev => {
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
    try { await adminApi.reorderProducts(filtered.map(p => p.id)) }
    catch { /* silent */ }
    finally { setReordering(false) }
  }

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
  const F = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <AdminLayout title="Produtos" actions={
      <button className="btn btnPrimary" onClick={openCreate}>+ Novo Produto</button>
    }>
      <div className="tableCard">
        <div className="tableHeader">
          <span className="tableTitle">
            Todos os Produtos ({filtered.length})
            {reordering && <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>Salvando ordem...</span>}
          </span>
          <div className="searchBar">
            <IconSearch size={15} color="#94A3B8" />
            <input className="searchInput" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            {search ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
          </div>
        ) : (
          <div style={{ padding: '6px 0' }}>
            {!search && (
              <div style={{ padding: '0 16px 8px', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⠿</span> Arraste as linhas para reordenar
              </div>
            )}
            <div className="tableWrapper"><table className="table">
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th>Imagem</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  return (
                    <tr key={p.id}
                      draggable={!search}
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDragEnd={() => void handleDragEnd()}
                      style={{ cursor: search ? 'default' : 'grab', opacity: reordering ? 0.7 : 1 }}
                    >
                      <td style={{ color: '#CBD5E1', fontSize: 16, userSelect: 'none' }}>{!search && '⠿'}</td>
                      <td>
                        {p.imageUrl
                          ? <img src={assetUrl(p.imageUrl)} alt={p.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                          : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconShoppingBag size={20} color="#CBD5E1" /></div>
                        }
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 12, color: '#94A3B8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                      </td>
                      <td>
                        {p.category
                          ? <span className="badge badgeReceived">{p.category.name}</span>
                          : <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
                        }
                      </td>
                      <td>
                        {p.promotionActive && p.promotionalPrice ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ textDecoration: 'line-through', color: '#94A3B8', fontSize: 12 }}>R$ {p.price.toFixed(2).replace('.', ',')}</span>
                            <strong style={{ color: '#DC2626' }}>R$ {p.promotionalPrice.toFixed(2).replace('.', ',')}</strong>
                          </div>
                        ) : (
                          <strong style={{ color: '#2E7D5B' }}>R$ {p.price.toFixed(2).replace('.', ',')}</strong>
                        )}
                      </td>
                      <td>{p.stockQuantity == null ? <span style={{ color: '#94A3B8' }}>Ilimitado</span> : <strong style={{ color: p.stockQuantity <= 3 ? '#DC2626' : '#2E7D5B' }}>{p.stockQuantity} un.</strong>}</td>
                      <td>
                        <label className="toggle">
                          <input type="checkbox" checked={p.active} onChange={() => void handleToggle(p.id)} />
                          <span className="toggleSlider" />
                        </label>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btnIcon" onClick={() => openEdit(p)}><IconEdit size={15} /></button>
                          <button className="btn btnIcon btnDanger" onClick={() => void handleDelete(p.id)}><IconTrash size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modalOverlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modalTitle">{modal === 'create' ? 'Novo Produto' : 'Editar Produto'}</div>

            {saveError && <div className="alertError">⚠️ {saveError}</div>}

            <div className="formGrid">
              {/* Image */}
              <div className="formGroup formGroupFull">
                <label className="formLabel">Imagem do produto</label>
                <div className="imageUpload" onClick={() => fileRef.current?.click()}>
                  {imagePreview
                    ? <img src={imagePreview} className="imagePreview" alt="preview" />
                    : <>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                        <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Clique para fazer upload</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>JPG, PNG ou WebP</div>
                      </>
                  }
                </div>
                {imagePreview && (
                  <button className="btn btnSecondary btnSm" style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    onClick={() => { setImageFile(null); setImagePreview(null) }}>
                    Remover imagem
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => void handleImage(e)} />
              </div>

              <div className="formGroup formGroupFull">
                <label className="formLabel">Nome *</label>
                <input className="formInput" value={form.name} onChange={F('name')} placeholder="Ex: Bowl Proteico" />
              </div>

              <div className="formGroup formGroupFull">
                <label className="formLabel">Descrição</label>
                <textarea className="formInput formTextarea" value={form.description} onChange={F('description')} placeholder="Descreva o produto brevemente..." />
              </div>

              <div className="formGroup formGroupFull">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Ficha completa</span>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                </div>
              </div>

              <div className="formGroup formGroupFull">
                <label className="formLabel">Ingredientes</label>
                <textarea className="formInput formTextarea" value={form.ingredients} onChange={F('ingredients')} placeholder="Ex: Alface, tomate, frango grelhado..." />
              </div>

              <div className="formGroup formGroupFull">
                <label className="formLabel">Diferenciais</label>
                <textarea className="formInput formTextarea" value={form.differentials} onChange={F('differentials')} placeholder="Ex: Sem glúten, rico em proteínas..." />
              </div>

              <div className="formGroup">
                <label className="formLabel">⚖️ Peso / Volume</label>
                <input className="formInput" value={form.weightVolume} onChange={F('weightVolume')} placeholder="Ex: 350g" />
              </div>

              <div className="formGroup">
                <label className="formLabel">Conservação</label>
                <input className="formInput" value={form.conservation} onChange={F('conservation')} placeholder="Ex: Refrigerado 0-4°C" />
              </div>

              <div className="formGroup formGroupFull">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Preços</span>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                </div>
              </div>

              <div className="formGroup">
                <label className="formLabel">Preço (R$) *</label>
                <input className="formInput" type="number" step="0.01" min="0" value={form.price} onChange={F('price')} placeholder="0,00" />
              </div>

              <div className="formGroup">
                <label className="formLabel">Custo (R$)</label>
                <input className="formInput" type="number" step="0.01" min="0" value={form.cost} onChange={F('cost')} placeholder="0,00 (opcional)" />
              </div>

              <div className="formGroup">
                <label className="formLabel">Quantidade em estoque</label>
                <input className="formInput" type="number" min="0" step="1" value={form.stockQuantity} onChange={F('stockQuantity')} placeholder="Em branco = ilimitado" />
                <span style={{ fontSize: 11, color: '#94A3B8' }}>Ao chegar em zero, o produto fica indisponível.</span>
              </div>

              <div className="formGroup">
                <label className="formLabel">Preço promocional (R$)</label>
                <input className="formInput" type="number" step="0.01" min="0" value={form.promotionalPrice} onChange={F('promotionalPrice')} placeholder="0,00 (opcional)" />
              </div>

              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={form.promotionActive} onChange={e => setForm(p => ({ ...p, promotionActive: e.target.checked }))} />
                  <span className="toggleSlider" />
                </label>
                <span className="formLabel" style={{ marginBottom: 0, color: form.promotionActive ? '#DC2626' : undefined }}>
                  {form.promotionActive ? 'Promoção ATIVA' : 'Ativar promoção'}
                </span>
              </div>

              <div className="formGroup">
                <label className="formLabel">Categoria</label>
                <select className="formInput formSelect" value={form.categoryId} onChange={F('categoryId')}>
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                  <span className="toggleSlider" />
                </label>
                <span className="formLabel" style={{ marginBottom: 0 }}>Produto ativo</span>
              </div>

            </div>

            <div className="modalFooter">
              <button className="btn btnSecondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btnPrimary" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Salvando...' : modal === 'create' ? 'Criar produto' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
