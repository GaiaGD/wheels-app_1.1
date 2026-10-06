// Based on Cult UI Halo Input (cult-ui.com), restyled in CSS Modules.
// Glow blobs animate only while the field has focus (see the CSS).
import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './HaloInput.module.css'

export interface HaloInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
  shellClassName?: string
}

export const HaloInput = forwardRef<HTMLInputElement, HaloInputProps>(function HaloInput(
  { invalid, leadingSlot, trailingSlot, shellClassName, className, ...rest },
  ref,
) {
  const ariaInvalid = rest['aria-invalid']
  const isInvalid = Boolean(invalid) || (ariaInvalid !== undefined && ariaInvalid !== false && ariaInvalid !== 'false')
  return (
    <div className={[styles.shell, shellClassName].filter(Boolean).join(' ')} data-invalid={isInvalid ? '' : undefined}>
      <div className={styles.glow} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} data-halo-blob />
        <span className={`${styles.blob} ${styles.blobB}`} data-halo-blob />
      </div>
      <div className={styles.inner}>
        {leadingSlot ? <span className={styles.slot}>{leadingSlot}</span> : null}
        <input
          {...rest}
          ref={ref}
          aria-invalid={isInvalid ? true : undefined}
          data-invalid={isInvalid ? '' : undefined}
          className={[styles.input, className].filter(Boolean).join(' ')}
        />
        {trailingSlot ? <span className={styles.slot}>{trailingSlot}</span> : null}
      </div>
    </div>
  )
})
