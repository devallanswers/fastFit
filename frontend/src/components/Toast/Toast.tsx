import { Toast as ToastType } from '../../hooks/useToast'
import { IconCheck, IconXCircle, IconInfoCircle } from '../Icon/Icon'
import styles from './Toast.module.css'

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: number) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className={styles.container}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={[styles.toast, styles[t.type]].join(' ')}
          onClick={() => onRemove(t.id)}
        >
          <span className={styles.icon}>
            {t.type === 'success' ? <IconCheck size={16} color='#059669' /> : t.type === 'error' ? <IconXCircle size={16} color='#DC2626' /> : <IconInfoCircle size={16} color='#2563EB' />}
          </span>
          <span className={styles.message}>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
