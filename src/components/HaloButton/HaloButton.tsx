import type { ButtonHTMLAttributes } from 'react'
import styles from './HaloButton.module.css'

/** Class for anything that should look like a Halo button, e.g. a <Link>. */
export const haloButtonClass = styles.button

export function HaloButton({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={className ? `${styles.button} ${className}` : styles.button} {...props} />
}
