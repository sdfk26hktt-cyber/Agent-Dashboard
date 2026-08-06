import type { Metadata, Viewport } from 'next'
import './globals.css'
import Link from 'next/link'
import AuthProvider from '@/app/components/AuthProvider'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import LogoutButton from "@/app/components/LogoutButton"

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'BBHST Tracker',
  description: 'Track Showing Partners and Team Agents advancement points and costs.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BBHST Tracker',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header className="header">
            <div className="header-content">
              <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/">
                  <img src="/bbhst-logo.png" alt="BBHST Logo" style={{ height: '40px', width: 'auto', display: 'block' }} />
                </Link>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>v4.0</span>
              </div>
              <nav className="nav-links no-print">
                {session ? (
                  <>
                    <Link href="/" className="nav-link">Dashboard</Link>
                    <Link href="/daily-tracker" className="nav-link">Daily Tracker</Link>
                    <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
                    {session.user.role === 'ADMIN' && (
                      <>
                        <Link href="/agents" className="nav-link">Agents Directory</Link>
                        <Link href="/costs" className="nav-link">Cost Ledger</Link>
                        <Link href="/gci" className="nav-link">GCI Ledger</Link>
                      </>
                    )}
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/login" className="nav-link">Login</Link>
                )}
              </nav>
            </div>
          </header>
          <main className="container">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
