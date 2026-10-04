import type { Metadata } from 'next'
import { Work_Sans } from 'next/font/google'
import { DemoBanner } from '@/components/DemoBanner/DemoBanner'
import { isMockMode } from '@/lib/env'
import './globals.css'

const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export const metadata: Metadata = {
  title: 'Wheels App',
  description: 'Look up any flight: live, upcoming or landed.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={workSans.variable}>
      <body>
        <DemoBanner show={isMockMode()} />
        {children}
      </body>
    </html>
  )
}
