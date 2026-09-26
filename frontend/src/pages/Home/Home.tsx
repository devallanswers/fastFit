import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header/Header'
import { ProductCard } from '../../components/ProductCard/ProductCard'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { productsApi, categoriesApi, storeApi, promotionsApi, ordersApi, ApiProduct, ApiCategory, ApiStoreSettings, ApiPromotion, ApiOrder, assetUrl } from '../../services/api'
import { Product } from '../../types'
import { ActiveOrderBar } from '../../components/ActiveOrderBar/ActiveOrderBar'
import { IconClock, IconMotorcycle, IconWalking, IconPhone, IconZap, IconLock, IconChevronRight } from '../../components/Icon/Icon'
import styles from './Home.module.css'
import { useCart } from '../../context/CartContext'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'

function mapApiProduct(p: ApiProduct): Product {
  return {
    id: String(p.id), name: p.name, description: p.description ?? '',
    ingredients: p.ingredients ?? undefined, differentials: p.differentials ?? undefined,
    weightVolume: p.weightVolume ?? undefined, conservation: p.conservation ?? undefined,
    price: p.price, promotionalPrice: p.promotionalPrice ?? undefined,
    promotionActive: p.promotionActive, effectivePrice: p.effectivePrice,
    image: p.imageUrl ? assetUrl(p.imageUrl) : FALLBACK_IMAGE,
    category: p.category?.name ?? 'Outros', active: p.active, displayOrder: p.displayOrder, stockQuantity: p.stockQuantity,
  }
}

export function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [storeSettings, setStoreSettings] = useState<ApiStoreSettings | null>(null)
  const [promotions, setPromotions] = useState<ApiPromotion[]>([])
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [isLoading, setIsLoading] = useState(true)
  const [bannerIdx, setBannerIdx] = useState(0)
  const [previousOrders, setPreviousOrders] = useState<ApiOrder[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const navigate = useNavigate()
  const { addToCart, clearCart } = useCart()

  useEffect(() => {
    Promise.all([
      // usar getAll pra também mostrar produtos marcados como inativos (disponibilidade)
      productsApi.getAll().catch(() => null),
      categoriesApi.getActive().catch(() => null),
      storeApi.getPublic().catch(() => null),
      promotionsApi.getToday().catch(() => []),
      ordersApi.getAll().catch(() => []),
      productsApi.getPopular().catch(() => []),
    ]).then(([prods, cats, settings, promos, orders, popular]) => {
      if (prods) setProducts(prods.map(mapApiProduct))
      if (cats) setCategories(cats)
      if (settings) setStoreSettings(settings)
      if (promos) setPromotions(promos as ApiPromotion[])
      if (orders) setPreviousOrders(orders as ApiOrder[])
      if (popular) setPopularProducts((popular as ApiProduct[]).map(mapApiProduct))
    }).finally(() => setIsLoading(false))
  }, [])

  // Auto-rotate banner (slides = apenas promoções)
  const totalSlides = promotions.length
  useEffect(() => {
    if (promotions.length === 0) return
    const id = setInterval(() => setBannerIdx(i => (i + 1) % totalSlides), 5000)
    return () => clearInterval(id)
  }, [promotions.length, totalSlides])

  const handleBannerCta = useCallback((promo: ApiPromotion) => {
    if (promo.linkType === 'PRODUCT' && promo.linkTargetId) {
      // scroll to product section
      document.getElementById(`product-${promo.linkTargetId}`)?.scrollIntoView({ behavior: 'smooth' })
    } else if (promo.linkType === 'PACKAGE') {
      navigate('/packages')
    } else if (promo.linkType === 'URL' && promo.linkUrl) {
      window.open(promo.linkUrl, '_blank')
    } else {
      navigate('/cart')
    }
  }, [navigate])

  const allCategories = ['Todos', ...categories.map(c => c.name)]
  const filtered = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory)
  const storeDescription = storeSettings?.storeDescription ?? 'Pratos frescos feitos com ingredientes naturais'
  // Fix: usar isOpenNow (calculado pelo backend com horários reais)
  // storeSettings.open é só a flag manual do admin — não considera o schedule
  const isOpen = storeSettings?.isOpenNow ?? true
  const closedMessage = storeSettings?.closedMessage ?? 'Estamos fechados no momento.'
  const estimatedTime = storeSettings?.estimatedDeliveryMinutes ?? 45

  // Current slide corresponds directly to promotions index
  const currentPromo = promotions[bannerIdx] ?? null
  const lastOrder = previousOrders.find(o => o.status !== 'CANCELED' && o.items.length > 0)
  const repeatOrder = async () => {
    if (!lastOrder) return
    await clearCart()
    for (const item of lastOrder.items) {
      const product = products.find(p => Number(p.id) === item.productId || p.name === item.productName)
      if (!product) continue
      for (let i = 0; i < item.quantity; i++) await addToCart(product)
    }
    navigate('/cart')
  }

  // Garantir índice válido quando lista de promos muda
  useEffect(() => {
    if (promotions.length === 0) { setBannerIdx(0); return }
    if (bannerIdx >= promotions.length) setBannerIdx(0)
  }, [promotions.length, bannerIdx])

  const bannerBg = currentPromo?.backgroundColor
    ? currentPromo.backgroundColor
    : 'linear-gradient(135deg, #2E7D5B 0%, #1a5c3e 100%)'

  return (
    <div className={styles.page}>
      <ActiveOrderBar />
      <Header />

      {!isOpen && (
        <div className={styles.closedBanner}>
          <IconLock size={16} color='#92400E' />
          <span>{closedMessage}</span>
        </div>
      )}

      {/* ── Banner carrossel (renderiza só se houver promoções) ──────────────────────────────────── */}
      {promotions.length > 0 && (
        <div
          className={styles.banner}
          style={currentPromo?.backgroundColor ? { background: currentPromo.backgroundColor } : undefined}
        >

          {currentPromo?.slideType === 'IMAGE' ? (
            <>
              <img src={assetUrl(currentPromo.imageUrl!)} alt="" className={styles.photoSlide} />
              <div className={styles.photoDots}>{[...Array(totalSlides)].map((_, i) => <span key={i} className={[styles.slideDot, bannerIdx === i ? styles.slideDotActive : ''].join(' ')} onClick={() => setBannerIdx(i)} />)}</div>
            </>
          ) : <>
          <div className={styles.bannerContent}>
            {currentPromo ? (
              <div className={styles.promoSlide} key={`promo-${currentPromo.id}`}>
                <span className={styles.bannerBadge}>
                  <IconZap size={12} color='white' style={{ marginRight: 4 }} /> PROMOÇÃO
                </span>
                <h1 className={styles.bannerTitle}>
                  <span className={styles.bannerHighlight}>{currentPromo.title}</span>
                </h1>
                {currentPromo.subtitle && (
                  <p className={styles.bannerSub}>{currentPromo.subtitle}</p>
                )}
                <button
                  className={styles.bannerBtn}
                  onClick={() => handleBannerCta(currentPromo)}
                >
                  {currentPromo.ctaLabel || 'Ver oferta'}
                  <IconChevronRight size={14} style={{ marginLeft: 4 }} />
                </button>
              </div>
            ) : (
              <div className={styles.promoSlide} key="default">
                <span className={styles.bannerBadge}>
                  <IconZap size={12} color='white' style={{ marginRight: 4 }} /> FastFit
                </span>
                <h1 className={styles.bannerTitle}>
                  Coma de forma<br />
                  <span className={styles.bannerHighlight}>saudável e gostosa</span>
                </h1>
                <p className={styles.bannerSub}>{storeDescription}</p>
                {isOpen ? (
                  <button className={styles.bannerBtn} onClick={() => navigate('/cart')}>
                    Peça Agora <IconChevronRight size={14} style={{ marginLeft: 4 }} />
                  </button>
                ) : (
                  <span className={styles.bannerClosed}>Fechado no momento</span>
                )}
              </div>
            )}

            {/* Dots */}
            {promotions.length > 0 && (
              <div className={styles.slideDots}>
                {[...Array(totalSlides)].map((_, i) => (
                  <span
                    key={i}
                    className={[styles.slideDot, bannerIdx === i ? styles.slideDotActive : ''].join(' ')}
                    onClick={() => setBannerIdx(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Deco circular */}
          <div className={styles.bannerDeco}>
            {currentPromo?.imageUrl
              ? <img src={assetUrl(currentPromo.imageUrl)} alt="" className={styles.bannerDecoImg} />
              : <span>🥗</span>
            }
          </div>
          </>}
        </div>
      )}

      {lastOrder ? (
        <section className={styles.recommendations}>
          <div className={styles.repeatCard}>
            <div><span className={styles.recommendationKicker}>PEDIR NOVAMENTE</span><strong>Seu último pedido em poucos toques</strong><small>{lastOrder.items.slice(0, 2).map(i => i.productName).join(', ')}</small></div>
            <button onClick={() => void repeatOrder()}>Repetir pedido</button>
          </div>
        </section>
      ) : popularProducts.length > 0 ? (
        <section className={styles.recommendations}><div className={styles.popularCard}><span>★ Mais pedidos</span><strong>{popularProducts.map(p => p.name).join(' · ')}</strong></div></section>
      ) : null}

      {isOpen && (
        <div className={styles.infoStrip}>
          <div className={styles.infoItem}><IconClock size={13} color='var(--primary)' /><span>~{estimatedTime} min</span></div>
          {storeSettings?.acceptDelivery && <div className={styles.infoItem}><IconMotorcycle size={13} color='var(--primary)' /><span>Delivery</span></div>}
          {storeSettings?.acceptPickup && <div className={styles.infoItem}><IconWalking size={13} color='var(--primary)' /><span>Retirada</span></div>}
          {storeSettings?.storePhone && <div className={styles.infoItem}><IconPhone size={13} color='var(--primary)' /><span>{storeSettings.storePhone}</span></div>}
        </div>
      )}

      {allCategories.length > 1 && (
        <div className={styles.categoriesWrap}>
          <div className={styles.categories}>
            {allCategories.map(cat => (
              <button
                key={cat}
                className={[styles.catBtn, activeCategory === cat ? styles.catActive : ''].join(' ')}
                onClick={() => setActiveCategory(cat)}
              >{cat}</button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        {isLoading ? (
          <div className={styles.loadingGrid}>
            {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(p => (
              <div key={p.id} id={`product-${p.id}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
