'use client'

import { useState, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'

// ─────────────────────────────────────────────────────────────────────
// APP STATUS GATE
//
// Holds a live connection to a publicly-readable flag in the owner's
// database. Because it is a realtime listener rather than a one-off
// fetch, switching the flag takes effect on every open session within
// about a second — a phone left open all day does not need reloading.
//
// The flag lives in a different Firebase project, so this opens a second
// named app pointed at it. The node is world-readable, so no sign-in is
// involved and this app's own auth is untouched.
//
// It fails OPEN. If the connection drops, the project is unreachable, or
// the node is missing, the app renders normally. Only an explicit
// `enabled: false` closes it — an outage must never take the app down.
// ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  apiKey: 'AIzaSyCEuZqtsiX8M2QvNCNdvFFZpIbHQ22W8aE',
  projectId: 'jf-tournament',
  databaseURL: 'https://jf-tournament-default-rtdb.firebaseio.com',
}

const DEFAULT_MESSAGE = 'This app is no longer available.'

// Don't hold the app on a blank screen if the connection is slow.
const DECIDE_AFTER_MS = 3500

export default function AppStatusGate({ children }: { children: React.ReactNode }) {
  const [closed, setClosed] = useState(false)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), DECIDE_AFTER_MS)
    let unsub: (() => void) | undefined

    try {
      const app = getApps().find(a => a.name === 'status')
        || initializeApp(STATUS_CONFIG, 'status')
      const statusDb = getDatabase(app)

      unsub = onValue(
        ref(statusDb, 'publicStatus/legacyApp'),
        snap => {
          const v = snap.val()
          if (v && v.enabled === false) {
            setMessage(v.message || DEFAULT_MESSAGE)
            setClosed(true)
          } else {
            setClosed(false)
          }
          setReady(true)
          clearTimeout(timer)
        },
        () => { setReady(true); clearTimeout(timer) },
      )
    } catch {
      setReady(true)
      clearTimeout(timer)
    }

    return () => { if (unsub) unsub(); clearTimeout(timer) }
  }, [])

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#3f3f46', fontSize: '13px', fontWeight: 500 }}>Loading...</div>
      </div>
    )
  }

  if (closed) {
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
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#a1a1aa', margin: 0 }}>
            {message}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}