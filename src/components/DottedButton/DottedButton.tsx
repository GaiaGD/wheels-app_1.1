import type { ButtonHTMLAttributes } from 'react'
import { DotField } from '../DotField/DotField'
import styles from './DottedButton.module.css'

/** Class for anything that should look like a dotted button, e.g. a <Link>. It gets the styling but not the dots. */
export const dottedButtonClass = styles.button

export function DottedButton({ className, type = 'button', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={className ? `${styles.button} ${className}` : styles.button} {...props}>
      <DotField />
      <span className={styles.label}>{children}</span>
    </button>
  )
}
