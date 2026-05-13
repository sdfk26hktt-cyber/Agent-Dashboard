import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import AuthProvider from '@/app/components/AuthProvider'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import LogoutButton from "@/app/components/LogoutButton"

export const metadata: Metadata = {
  title: 'BURDS Tracker',
  description: 'Track Showing Partners and Team Agents advancement points and costs.',
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
              <div className="logo">BURDS Tracker</div>
              <nav className="nav-links no-print">
                {session ? (
                  <>
                    <Link href="/" className="nav-link">Dashboard</Link>
                    {session.user.role === 'ADMIN' && (
                      <>
                        <Link href="/agents" className="nav-link">Agents Directory</Link>
                        <Link href="/costs" className="nav-link">Cost Ledger</Link>
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
