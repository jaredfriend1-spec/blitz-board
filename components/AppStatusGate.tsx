'use client'

import { useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────
// APP STATUS GATE
//
// Checks a publicly-readable flag before rendering the app. The flag is
// controlled from the owner's dashboard, so access can be changed without
// a deploy.
//
// It deliberately fails OPEN: if the request errors, times out, or the
// node is missing, the app renders normally. A network blip should never
// take the app down.
// ─────────────────────────────────────────────────────────────────────

const STATUS_URL =
  'https://jf-tournament-default-rtdb.firebaseio.com/publicStatus/legacyApp.json'

const DEFAULT_MESSAGE = 'This app is no longer available.'

export default function AppStatusGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'open' | 'closed'>('checking')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    // Don't let a slow response hold the app hostage.
    const timer = setTimeout(() => controller.abort(), 4000)

    fetch(`${STATUS_URL}?cb=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : null))
      .then(v => {
        if (cancelled) return
        if (v && v.enabled === false) {
          setMessage(v.message || DEFAULT_MESSAGE)
          setState('closed')
        } else {
          setState('open')
        }
      })
      .catch(() => { if (!cancelled) setState('open') })
      .finally(() => clearTimeout(timer))

    return () => { cancelled = true; controller.abort(); clearTimeout(timer) }
  }, [])

  if (state === 'checking') {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#3f3f46', fontSize: '13px', fontWeight: 500 }}>Loading...</div>
      </div>
    )
  }

  if (state === 'closed') {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{ maxWidth: '360px', textAlign: 'center' }}>
          <div style={{
            fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em',
            color: '#fff', marginBottom: '14px',
          }}>
            BLITZ <span style={{ color: '#10b981' }}>BOARD</span>
          </div>
          <p style={{
            fontSize: '14px', lineHeight: 1.6, color: '#a1a1aa', margin: 0,
          }}>
            {message}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}