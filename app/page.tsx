"use client"
import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh', padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#10b981', fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>BLITZ BOARD</h1>
      <p style={{ color: '#71717a', letterSpacing: '2px', marginBottom: '40px' }}>LIVE TOURNAMENT ENGINE</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '300px', margin: '0 auto' }}>
        <Link href="/scorer" style={{ border: '2px solid #10b981', color: '#10b981', padding: '15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
          LIVE SCORER / LEADERBOARD
        </Link>
      </div>
      
      <p style={{ marginTop: '60px', color: '#3f3f46', fontSize: '12px' }}>MCC SPECIAL EDITION • 2026</p>
    </div>
  )
}
