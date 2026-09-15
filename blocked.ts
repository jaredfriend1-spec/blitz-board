import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'

// ─────────────────────────────────────────────────────────────────────
// BLOCKED PLAYERS
//
// Names that must never be added to a roster or a match. Managed from the
// Master Dashboard and stored at `blockedPlayers` so the list can be changed
// without a deploy.
//
// Matching is substring, case-insensitive: an entry of "SAM SILVERMAN" also
// blocks "sam silverman jr". Add each spelling you want caught — "SAM
// SILVERMAN" alone will not catch "SAMUEL SILVERMAN".
// ─────────────────────────────────────────────────────────────────────

export type BlockedEntry = { id: string; name: string; note?: string; addedAt?: number }

export const normalizeBlocked = (val: any): BlockedEntry[] => {
  if (!val) return []
  return Object.entries(val).map(([id, v]: [string, any]) =>
    typeof v === 'string'
      ? { id, name: v }
      : { id, name: v?.name || '', note: v?.note, addedAt: v?.addedAt }
  ).filter(e => e.name)
}

export const matchesBlocked = (name: string, list: BlockedEntry[]) => {
  const n = (name || '').trim().toUpperCase()
  if (!n) return false
  return list.some(b => n.includes((b.name || '').trim().toUpperCase()))
}

// Live-updating blocked list plus a checker. Fails open: if the read is
// rejected or the node is missing, nothing is blocked rather than everything.
export function useBlockedPlayers() {
  const [blocked, setBlocked] = useState<BlockedEntry[]>([])

  useEffect(() => {
    const unsub = onValue(
      ref(db, 'blockedPlayers'),
      snap => setBlocked(normalizeBlocked(snap.val())),
      () => setBlocked([])
    )
    return () => unsub()
  }, [])

  const isBlocked = (name: string) => matchesBlocked(name, blocked)

  // "⛔ Sam Silverman cannot be added" — names the entry that matched.
  const blockedMessage = (name: string) => {
    const n = (name || '').trim().toUpperCase()
    const hit = blocked.find(b => n.includes((b.name || '').trim().toUpperCase()))
    const label = hit
      ? hit.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
      : name
    return `⛔ ${label} cannot be added`
  }

  return { blocked, isBlocked, blockedMessage }
}