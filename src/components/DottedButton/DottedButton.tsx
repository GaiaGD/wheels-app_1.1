import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import Link from 'next/link'
import { DotField } from '../DotField/DotField'
import ArrowIcon from './arrow.svg'
import styles from './DottedButton.module.css'

/** Raw button styling, without the dots. Prefer DottedButton or DottedLink. */
export const dottedButtonClass = styles.button

type ArrowProp = { arrow?: 'left' | 'right' }

export function DottedButton({ className, type = 'button', arrow, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ArrowProp) {
  return (
    <button type={type} className={className ? `${styles.button} ${className}` : styles.button} {...props}>
      <DotField />
      {arrow === 'left' && <ArrowIcon className={`${styles.arrow} ${styles.left}`} aria-hidden="true" />}
      <span className={styles.label}>{children}</span>
      {arrow === 'right' && <ArrowIcon className={`${styles.arrow} ${styles.right}`} aria-hidden="true" />}
    </button>
  )
}

export function DottedLink({ className, arrow, children, ...props }: ComponentProps<typeof Link> & ArrowProp) {
  return (
    <Link className={className ? `${styles.button} ${className}` : styles.button} {...props}>
      <DotField />
      {arrow === 'left' && <ArrowIcon className={`${styles.arrow} ${styles.left}`} aria-hidden="true" />}
      <span className={styles.label}>{children}</span>
      {arrow === 'right' && <ArrowIcon className={`${styles.arrow} ${styles.right}`} aria-hidden="true" />}
    </Link>
  )
}
