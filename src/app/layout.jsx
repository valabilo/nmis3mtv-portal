/**
 * app/layout.jsx
 *
 * Root layout – wraps every page with the Header, Footer,
 * Google Font links, and global CSS.
 */

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MaintenanceScreen from '@/components/maintenance/MaintenanceScreen'
import { APP_NAME, AGENCY_NAME, REGION } from '@/lib/constants'
import { Public_Sans } from 'next/font/google'
import '@/styles/globals.css'

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
})

export const metadata = {
  title:       `${APP_NAME} – ${REGION}`,
  description: `${AGENCY_NAME} – One-Stop Platform for MTV Registration and Compliance`,
}

export default function RootLayout({ children }) {
  const maintenanceEnabled = process.env.MAINTENANCE_MODE === 'true'

  return (
    <html lang="en" className={publicSans.variable}>
      <body>
        {maintenanceEnabled ? (
          <MaintenanceScreen />
        ) : (
          <>
            <Header />
            <main style={{ flex: 1 }}>
              {children}
            </main>
            <Footer />
          </>
        )}
      </body>
    </html>
  )
}
