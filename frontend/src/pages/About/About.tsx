import { useState, useEffect } from 'react'
import { BottomNavigation } from '../../components/BottomNavigation/BottomNavigation'
import { storeApi, ApiStoreSettings } from '../../services/api'
import { IconWhatsapp, IconInstagram, IconPhone, IconMapPin, IconMotorcycle, IconWalking, IconClock } from '../../components/Icon/Icon'
import styles from './About.module.css'

export function About() {
  const [settings, setSettings] = useState<ApiStoreSettings | null>(null)

  useEffect(() => {
    storeApi.getPublic().then(setSettings).catch(() => null)
  }, [])

  const storeName = settings?.storeName ?? 'FastFit'
  const storeDescription = settings?.storeDescription ?? 'Transformar a alimentação saudável em algo acessível, gostoso e conveniente para todos.'
  const storePhone = settings?.storePhone
  const storeAddress = settings?.storeAddress
  const estimatedTime = settings?.estimatedDeliveryMinutes ?? 45
  const whatsappNumber = settings?.whatsappNumber
  const instagramUrl = settings?.instagramUrl

  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de mais informações.')}`
    : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sobre nós</h1>
      </div>

      <div className={styles.content}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroIllustration}>
            <img src="/logo192.png" alt="" className={styles.heroLogo} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
          </div>
          <h2 className={styles.heroTitle}>{storeName}</h2>
          <p className={styles.heroText}>{storeDescription}</p>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>~{estimatedTime}min</span>
            <span className={styles.statLabel}>Tempo médio</span>
          </div>
          {settings?.acceptDelivery && (
            <div className={styles.stat}>
              <span className={styles.statValue}><IconMotorcycle size={28} color="var(--primary)" /></span>
              <span className={styles.statLabel}>Delivery</span>
            </div>
          )}
          {settings?.acceptPickup && (
            <div className={styles.stat}>
              <span className={styles.statValue}><IconWalking size={28} color="var(--primary)" /></span>
              <span className={styles.statLabel}>Retirada</span>
            </div>
          )}
        </div>

        {/* Social links — WhatsApp + Instagram */}
        {(waLink || instagramUrl) && (
          <div className={styles.socialSection}>
            <p className={styles.socialTitle}>Nos acompanhe</p>
            <div className={styles.socialBtns}>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
                  <span className={styles.socialBtnIcon}><IconWhatsapp size={22} color="white" /></span>
                  <div className={styles.socialBtnText}>
                    <span className={styles.socialBtnLabel}>WhatsApp</span>
                    <span className={styles.socialBtnSub}>Fale conosco</span>
                  </div>
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.igBtn}>
                  <span className={styles.socialBtnIcon}><IconInstagram size={22} color="white" /></span>
                  <div className={styles.socialBtnText}>
                    <span className={styles.socialBtnLabel}>Instagram</span>
                    <span className={styles.socialBtnSub}>Seguir</span>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contact info */}
        {(storePhone || storeAddress) && (
          <div className={styles.contact}>
            <p className={styles.contactTitle}>Informações</p>
            <div className={styles.contactLinks}>
              {storePhone && (
                <a href={`tel:${storePhone}`} className={styles.contactLink}>
                  <span className={styles.contactIcon}><IconPhone size={16} color="var(--primary)" /></span>
                  <span>{storePhone}</span>
                </a>
              )}
              {storeAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(storeAddress)}`}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.contactLink}
                >
                  <span className={styles.contactIcon}><IconMapPin size={16} color="var(--primary)" /></span>
                  <span>{storeAddress}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
