import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components/AdminLayout/AdminLayout'
import { promotionsApi, packagesApi, adminApi, ApiPromotion, ApiPackage, ApiProduct, ApiPromotionGalleryImage, assetUrl } from '../../../services/api'
import { useToastContext } from '../../../context/ToastContext'
import { IconPlus, IconEdit, IconTrash, IconX, IconFlame, IconEye, IconEyeOff } from '../../../components/Icon/Icon'
import '../../components/AdminLayout/admin.css'


// 0 = Dom, 1 = Seg ... 6 = Sáb  (mesmo que LocalDate.getDayOfWeek().getValue() % 7)
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PRESET_COLORS = [
  { label: 'Verde FastFit',    value: 'linear-gradient(135deg, #2E7D5B 0%, #1a5c3e 100%)' },
  { label: 'Laranja Vibrante', value: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' },
  { label: 'Roxo Premium',     value: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' },
  { label: 'Azul Fresco',      value: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' },
  { label: 'Rosa Quente',      value: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' },
  { label: 'Escuro Elegante',  value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
]

/** Reduz fotos grandes antes do upload, preservando boa qualidade no banner. */
async function compressLargeImage(file: File): Promise<File> {
  const threshold = 4.5 * 1024 * 1024
  if (file.size <= threshold || !file.type.startsWith('image/')) return file

  return new Promise(resolve => {
    const source = new Image()
    const url = URL.createObjectURL(file)
    source.onload = () => {
      const maxSide = 1920
      const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(source.width * scale))
      canvas.height = Math.max(1, Math.round(source.height * scale))
      const context = canvas.getContext('2d')
      context?.drawImage(source, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        resolve(blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.82)
    }
    source.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    source.src = url
  })
}

type LinkType = 'PRODUCT' | 'PACKAGE' | 'URL' | 'NONE'

interface PromoForm {
  title: string
  subtitle: string
  imageUrl: string
  backgroundColor: string
  ctaLabel: string
  linkType: LinkType
  linkTargetId: number | null
  linkUrl: string
  activeDays: boolean[]   // length 7, index = day number (0=Dom…6=Sáb)
  active: boolean
  displayOrder: number
}

const emptyForm = (): PromoForm => ({
  title: '',
  subtitle: '',
  imageUrl: '',
  backgroundColor: PRESET_COLORS[0].value,
  ctaLabel: 'Ver oferta',
  linkType: 'NONE',
  linkTargetId: null,
  linkUrl: '',
  activeDays: Array(7).fill(true),
  active: true,
  displayOrder: 0,
})

function daysToString(days: boolean[]): string | null {
  const active = days.map((on, i) => on ? String(i) : null).filter((s): s is string => s !== null)
  if (active.length === 7) return null     // todos os dias = null
  if (active.length === 0) return '6'     // fallback: sábado
  return active.join(',')
}

function daysFromString(str: string | null): boolean[] {
  if (!str || str.trim() === '') return Array(7).fill(true)
  const set = new Set(str.split(',').map(s => s.trim()))
  return Array.from({ length: 7 }, (_, i) => set.has(String(i)))
}

// ── Live banner preview ───────────────────────────────────────────────────────
function BannerPreview({ form, imagePreview, linkedName }: {
  form: PromoForm; imagePreview: string | null; linkedName: string | null
}) {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: form.backgroundColor,
      padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 110,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: -28, right: -28, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ flex: 1, zIndex: 1 }}>
        <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, marginBottom: 7 }}>
          🔥 PROMOÇÃO
        </span>
        <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 17, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>
          {form.title || <span style={{ opacity: 0.5 }}>Título da promoção</span>}
        </p>
        {form.subtitle && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', margin: '3px 0 0' }}>{form.subtitle}</p>}
        {linkedName && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '3px 0 0', fontStyle: 'italic' }}>→ {linkedName}</p>}
        {form.ctaLabel && (
          <div style={{ marginTop: 10, background: 'white', color: '#1e293b', fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 9, display: 'inline-block' }}>
            {form.ctaLabel}
          </div>
        )}
      </div>
      {imagePreview && (
        <img src={imagePreview} alt="" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.28)', flexShrink: 0, zIndex: 1 }} />
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AdminPromotions() {
  const { toast } = useToastContext()
  const [promotions, setPromotions] = useState<ApiPromotion[]>([])
  const [galleryImages, setGalleryImages] = useState<ApiPromotionGalleryImage[]>([])
  const [products, setProducts]     = useState<ApiProduct[]>([])
  const [packages, setPackages]     = useState<ApiPackage[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId]   = useState<number | null>(null)
  const [form, setForm]             = useState<PromoForm>(emptyForm())
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const galleryFileRef = useRef<HTMLInputElement>(null)
  const bannerFileRef = useRef<HTMLInputElement>(null)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [promos, prods, pkgs, gallery] = await Promise.all([
        promotionsApi.getAll(),
        adminApi.getProducts(),
        packagesApi.getAll(),
        promotionsApi.getGallery(),
      ])
      setPromotions(promos)
      setProducts(prods.filter((p: ApiProduct) => p.active))
      setPackages(pkgs.filter((p: ApiPackage) => p.active))
      setGalleryImages(gallery)
    } catch { toast.error('Erro ao carregar') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setForm(emptyForm()); setEditingId(null)
    setImageFile(null); setImagePreview(null); setModal('create')
  }

  const openEdit = (p: ApiPromotion) => {
    setForm({
      title: p.title,
      subtitle: p.subtitle ?? '',
      imageUrl: p.imageUrl ?? '',
      backgroundColor: p.backgroundColor ?? PRESET_COLORS[0].value,
      ctaLabel: p.ctaLabel ?? 'Ver oferta',
      linkType: (p.linkType ?? 'NONE') as LinkType,
      linkTargetId: p.linkTargetId ?? null,
      linkUrl: p.linkUrl ?? '',
      activeDays: daysFromString(p.activeDays),
      active: p.active,
      displayOrder: p.displayOrder,
    })
    setEditingId(p.id); setImageFile(null)
    setImagePreview(p.imageUrl ? assetUrl(p.imageUrl) : null)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl,
        backgroundColor: form.backgroundColor,
        ctaLabel: form.ctaLabel.trim() || undefined,
        linkType: form.linkType,
        linkTargetId: (form.linkType === 'PRODUCT' || form.linkType === 'PACKAGE')
          ? form.linkTargetId : null,
        linkUrl: form.linkType === 'URL' ? form.linkUrl : undefined,
        activeDays: daysToString(form.activeDays),
        active: form.active,
        displayOrder: form.displayOrder,
      }
      let saved: ApiPromotion
      if (modal === 'create') {
        saved = await promotionsApi.create(payload)
      } else {
        saved = await promotionsApi.update(editingId!, payload)
      }
      if (imageFile) await promotionsApi.uploadImage(saved.id, imageFile)
      toast.success(modal === 'create' ? 'Promoção criada!' : 'Promoção atualizada!')
      setModal(null); void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Excluir promoção "${title}"?`)) return
    try { await promotionsApi.delete(id); toast.success('Excluída'); void load() }
    catch { toast.error('Erro ao excluir') }
  }

  const toggleActive = async (p: ApiPromotion) => {
    try { await promotionsApi.update(p.id, { active: !p.active }); void load() }
    catch { toast.error('Erro') }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingGallery(true)
    try {
      const uploadFile = await compressLargeImage(file)
      const image = await promotionsApi.uploadGalleryImage(uploadFile, file.name.replace(/\.[^.]+$/, ''))
      setGalleryImages(images => [image, ...images])
      toast.success('Imagem adicionada à galeria')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem')
    } finally {
      setUploadingGallery(false)
      e.target.value = ''
    }
  }

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = event => setImagePreview(event.target?.result as string)
    reader.readAsDataURL(file)
  }

  const deleteGalleryImage = async (image: ApiPromotionGalleryImage) => {
    if (!confirm(`Remover "${image.label}" da galeria?`)) return
    try {
      await promotionsApi.deleteGalleryImage(image.id)
      setGalleryImages(images => images.filter(item => item.id !== image.id))
      toast.success('Imagem removida da galeria')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a imagem')
    }
  }

  const updateGalleryImage = async (image: ApiPromotionGalleryImage, data: Partial<{ active: boolean; displayOrder: number }>) => {
    try {
      const updated = await promotionsApi.updateGalleryImage(image.id, data)
      setGalleryImages(images => images.map(item => item.id === updated.id ? updated : item))
    } catch { toast.error('Não foi possível atualizar a foto') }
  }

  const set = <K extends keyof PromoForm>(key: K, val: PromoForm[K]) => setForm(f => ({ ...f, [key]: val }))
  const toggleDay = (i: number) => setForm(f => ({ ...f, activeDays: f.activeDays.map((d, idx) => idx === i ? !d : d) }))

  const linkedName = form.linkType === 'PRODUCT' && form.linkTargetId
    ? products.find(p => p.id === form.linkTargetId)?.name ?? null
    : form.linkType === 'PACKAGE' && form.linkTargetId
      ? packages.find(p => p.id === form.linkTargetId)?.name ?? null
      : null

  const dayChips = (activeDays: string | null) => {
    const arr = daysFromString(activeDays)
    return (
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {DAYS.map((day, i) => (
          <span key={i} style={{
            padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700,
            background: arr[i] ? '#D1FAE5' : '#F1F5F9',
            color: arr[i] ? '#059669' : '#CBD5E1',
          }}>{day}</span>
        ))}
      </div>
    )
  }

  return (
    <AdminLayout title="Promoções">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
            Gerencie os banners do carrossel na home do app
          </p>
        </div>
        <button className="btn btnPrimary" onClick={openCreate}>
          <IconPlus size={15} /> Nova Promoção
        </button>
      </div>

      <section className="tableCard" style={{ padding: 18, marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 800, color: '#1E293B', margin: 0 }}>Galeria de imagens</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>Ative as fotos que devem passar como slides no carrossel.</p>
          </div>
          <input ref={galleryFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleGalleryUpload} />
          <button className="btn btnSecondary btnSm" onClick={() => galleryFileRef.current?.click()} disabled={uploadingGallery}>
            <IconPlus size={14} /> {uploadingGallery ? 'Enviando...' : 'Adicionar foto'}
          </button>
        </div>
        {galleryImages.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>Nenhuma foto na galeria.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
            {galleryImages.map(image => (
              <div key={image.id} style={{ position: 'relative' }}>
                <img src={assetUrl(image.imageUrl)} alt={image.label} title={image.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 9, display: 'block' }} />
                <button type="button" onClick={() => deleteGalleryImage(image)} title="Remover da galeria"
                  style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, border: 0, borderRadius: '50%', background: 'rgba(185,28,28,.9)', color: 'white', cursor: 'pointer', fontWeight: 800 }}>×</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', marginTop: 4 }}>
                  <input type="checkbox" checked={image.active} onChange={e => void updateGalleryImage(image, { active: e.target.checked })} /> Passar
                </label>
                <input type="number" min={0} value={image.displayOrder} title="Ordem de exibição" className="formInput"
                  onChange={e => void updateGalleryImage(image, { displayOrder: Number(e.target.value) })} style={{ fontSize: 11, padding: '3px 5px', marginTop: 3 }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="tableCard"><div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando...</div></div>
      ) : promotions.length === 0 ? (
        <div className="tableCard">
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🔥</div>
            <p style={{ fontWeight: 700, color: '#1E293B', fontSize: 16, marginBottom: 6 }}>Nenhuma promoção criada</p>
            <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>Crie promoções para exibir no banner do app</p>
            <button className="btn btnPrimary" onClick={openCreate}>Criar primeira promoção</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {promotions.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              border: `2px solid ${p.active ? '#E2E8F0' : '#F1F5F9'}`,
              opacity: p.active ? 1 : 0.6, transition: 'opacity 0.2s',
            }}>
              {/* Mini preview */}
              <div style={{
                background: p.backgroundColor ?? 'linear-gradient(135deg, #2E7D5B, #1a5c3e)',
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 72,
              }}>
                {p.imageUrl && (
                  <img src={assetUrl(p.imageUrl)} alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: 'white', fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.title}
                  </p>
                  {p.subtitle && (
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.subtitle}
                    </p>
                  )}
                </div>
                <span className={`badge ${p.active ? 'badgeActive' : 'badgeInactive'}`} style={{ flexShrink: 0 }}>
                  {p.active ? 'Ativo' : 'Pausado'}
                </span>
              </div>

              {/* Details */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ marginBottom: 10 }}>{dayChips(p.activeDays)}</div>

                {/* Link info */}
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12, minHeight: 18 }}>
                  {p.linkType === 'PRODUCT' && p.linkTargetId &&
                    `🛍 ${products.find(x => x.id === p.linkTargetId)?.name ?? `Produto #${p.linkTargetId}`}`}
                  {p.linkType === 'PACKAGE' && p.linkTargetId &&
                    `📦 ${packages.find(x => x.id === p.linkTargetId)?.name ?? `Pacote #${p.linkTargetId}`}`}
                  {p.linkType === 'URL' && '🔗 Link externo'}
                  {(p.linkType === 'NONE' || !p.linkType) &&
                    <span style={{ color: '#CBD5E1' }}>Sem link</span>}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 7 }}>
                  <button className="btn btnIcon" title="Editar" onClick={() => openEdit(p)}>
                    <IconEdit size={14} />
                  </button>
                  <button className="btn btnIcon" title={p.active ? 'Pausar' : 'Ativar'}
                    style={{ color: p.active ? '#D97706' : '#059669' }}
                    onClick={() => toggleActive(p)}>
                    {p.active ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </button>
                  <button className="btn btnIcon btnDanger" title="Excluir" onClick={() => handleDelete(p.id, p.title)}>
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="modalOverlay" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <p className="modalTitle" style={{ margin: 0, marginBottom: 2 }}>
                  {modal === 'create' ? '🔥 Nova Promoção' : '✏️ Editar Promoção'}
                </p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Aparece no carrossel da home</p>
              </div>
              <button className="btn btnIcon" onClick={() => setModal(null)}><IconX size={15} /></button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px' }}>

              {/* Live preview */}
              <div style={{ marginBottom: 18 }}>
                <p className="formLabel" style={{ display: 'block', marginBottom: 7 }}>Pré-visualização</p>
                <BannerPreview form={form} imagePreview={imagePreview} linkedName={linkedName} />
              </div>

              <div className="formGrid" style={{ marginBottom: 12 }}>
                <div className="formGroup formGroupFull">
                  <label className="formLabel">Título *</label>
                  <input className="formInput" value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Ex: Terça Saudável — 20% off em tudo!" />
                </div>
                <div className="formGroup formGroupFull">
                  <label className="formLabel">Subtítulo</label>
                  <input className="formInput" value={form.subtitle}
                    onChange={e => set('subtitle', e.target.value)}
                    placeholder="Ex: Só hoje até às 20h" />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Texto do botão</label>
                  <input className="formInput" value={form.ctaLabel}
                    onChange={e => set('ctaLabel', e.target.value)}
                    placeholder="Ver oferta" />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Ordem de exibição</label>
                  <input type="number" className="formInput" value={form.displayOrder} min={0}
                    onChange={e => set('displayOrder', Number(e.target.value))} />
                </div>
              </div>

              {/* Cor de fundo */}
              <div style={{ marginBottom: 16 }}>
                <p className="formLabel" style={{ display: 'block', marginBottom: 8 }}>Cor de fundo</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => set('backgroundColor', c.value)}
                      style={{
                        width: 34, height: 34, borderRadius: 8, border: '3px solid',
                        borderColor: form.backgroundColor === c.value ? '#1E293B' : 'transparent',
                        background: c.value, cursor: 'pointer', flexShrink: 0, outline: 'none',
                      }} />
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input type="color" title="Cor personalizada"
                      style={{ width: 34, height: 34, borderRadius: 8, border: '2px solid #E2E8F0', cursor: 'pointer', padding: 2 }}
                      onChange={e => set('backgroundColor', e.target.value)} />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Cor própria</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p className="formLabel" style={{ display: 'block', marginBottom: 8 }}>Imagem no banner (opcional)</p>
                <input ref={bannerFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleBannerImageChange} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {imagePreview && <img src={imagePreview} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />}
                  <button type="button" className="btn btnSecondary btnSm" onClick={() => bannerFileRef.current?.click()}>{imagePreview ? 'Trocar imagem' : 'Escolher imagem'}</button>
                  {imagePreview && <button type="button" className="btn btnSecondary btnSm" onClick={() => { setImageFile(null); setImagePreview(null); set('imageUrl', '') }}>Remover</button>}
                </div>
              </div>

              {/* Link */}
              <div style={{ marginBottom: 16 }}>
                <p className="formLabel" style={{ display: 'block', marginBottom: 8 }}>Ao clicar, vai para</p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(['NONE', 'PRODUCT', 'PACKAGE', 'URL'] as LinkType[]).map(type => (
                    <button key={type} type="button"
                      onClick={() => { set('linkType', type); set('linkTargetId', null); set('linkUrl', '') }}
                      style={{
                        padding: '6px 13px', borderRadius: 8, border: '2px solid',
                        borderColor: form.linkType === type ? '#2E7D5B' : '#E2E8F0',
                        background: form.linkType === type ? '#E8F5EE' : 'white',
                        color: form.linkType === type ? '#2E7D5B' : '#64748B',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>
                      {type === 'NONE' ? 'Nenhum' : type === 'PRODUCT' ? '🛍 Produto' : type === 'PACKAGE' ? '📦 Pacote' : '🔗 URL'}
                    </button>
                  ))}
                </div>
                {form.linkType === 'PRODUCT' && (
                  <select className="formInput formSelect" value={form.linkTargetId ?? ''}
                    onChange={e => set('linkTargetId', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Selecione um produto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {form.linkType === 'PACKAGE' && (
                  <select className="formInput formSelect" value={form.linkTargetId ?? ''}
                    onChange={e => set('linkTargetId', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Selecione um pacote...</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {form.linkType === 'URL' && (
                  <input className="formInput" value={form.linkUrl}
                    onChange={e => set('linkUrl', e.target.value)}
                    placeholder="https://..." />
                )}
              </div>

              {/* Dias */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p className="formLabel" style={{ display: 'block' }}>Dias de exibição</p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[
                      { label: 'Todos',        days: Array(7).fill(true) },
                      { label: 'Seg–Sex',      days: [false, true, true, true, true, true, false] },
                      { label: 'Fim de semana', days: [true, false, false, false, false, false, true] },
                    ].map(preset => (
                      <button key={preset.label} type="button" className="btn btnSm btnSecondary"
                        onClick={() => setForm(f => ({ ...f, activeDays: preset.days }))}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {DAYS.map((day, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      style={{
                        flex: 1, padding: '9px 4px', borderRadius: 8, border: '2px solid',
                        borderColor: form.activeDays[i] ? '#2E7D5B' : '#E2E8F0',
                        background: form.activeDays[i] ? '#E8F5EE' : 'white',
                        color: form.activeDays[i] ? '#2E7D5B' : '#94A3B8',
                        fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.12s',
                      }}>
                      {day}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
                  {form.activeDays.every(Boolean) ? 'Aparece todos os dias'
                    : `Aparece: ${form.activeDays.map((on, i) => on ? DAYS[i] : null).filter(Boolean).join(', ') || '—'}`}
                </p>
              </div>

              {/* Status */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active}
                  onChange={e => set('active', e.target.checked)}
                  style={{ width: 16, height: 16 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>
                  Promoção ativa (visível no app)
                </span>
              </label>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn btnSecondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btnPrimary" onClick={handleSave} disabled={saving}>
                <IconFlame size={14} />
                {saving ? 'Salvando...' : 'Salvar Promoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
