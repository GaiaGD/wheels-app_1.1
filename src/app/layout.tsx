import type { Metadata } from 'next'
import { Work_Sans } from 'next/font/google'
import Script from 'next/script'
import { DemoBanner } from '@/components/DemoBanner/DemoBanner'
import { Footer } from '@/components/Footer/Footer'
import { isMockMode } from '@/lib/env'
import './globals.css'

const GA_ID = 'G-FTS8PG5QNG'

const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export const metadata: Metadata = {
  title: 'Wheels App',
  description: 'Look up any flight: live, upcoming or landed.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={workSans.variable}>
      <body data-demo={isMockMode() ? 'true' : undefined}>
        <DemoBanner show={isMockMode()} />
        {children}
        <Footer />
      </body>
      {process.env.NODE_ENV === 'production' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
    </html>
  )
}
