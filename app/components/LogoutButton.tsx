'use client'
import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button onClick={() => signOut()} className="nav-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}>
      Logout
    </button>
  )
}
