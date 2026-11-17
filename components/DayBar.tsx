"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, get, update, onValue } from 'firebase/database'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { DAY_LABELS, openDayUpdates } from '@/lib/plan'

// ─────────────────────────────────────────────────────────────────────
// DAY BAR
// Sits at the top of the scorer, results and payouts so it is always
// obvious which day of the tournament is on screen, and at which course.
// Every day of the trip is shown: closed days link to their results, and
// whoever runs the tournament can switch the open day from here.
// Players see the same bar but cannot switch days.
// ─────────────────────────────────────────────────────────────────────

export default function DayBar({ inset = false }: { inset?: boolean }) {
  const { role } = useAuth()
  const canSwitch = role === 'scorer' || role === 'master'
  const [meta, setMeta] = useState<any>(null)
  const [courseName, setCourseName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    const u1 = onValue(ref(db, 'tournament/meta'), snap => setMeta(snap.val()))
    const u2 = onValue(ref(db, 'tournament/course/name'), snap => setCourseName(snap.val() || ''))
    return () => { u1(); u2() }
  }, [])

  if (!meta || meta.isMock || meta.mode !== 'tournament' || !meta.tripName) return null

  const total: number = meta.totalDays || 1
  const current: string | null = meta.currentDay || null
  const closed: string[] = meta.closedDays || []
  const finished = meta.status === 'complete'
  const days = DAY_LABELS.slice(0, total)

  const open = async (day: string) => {
    if (!confirm(`Switch to ${day}?\n\n${current ? `${current} is saved exactly as it is and you can switch back.\n\n` : ''}Everyone's scorer, results and payouts will show ${day}.`)) return
    setBusy(day)
    try {
      const snap = await get(ref(db, 'tournament'))
      const u = openDayUpdates(snap.val() || {}, day)
      if (Object.keys(u).length) await update(ref(db, 'tournament'), u)
    } catch (e: any) {
      alert(`${day} was not opened. ${/permission/i.test(String(e?.message)) ? 'Sign out, sign back in, and try again.' : String(e?.message || e)}`)
    } finally { setBusy(null) }
  }

  return (
    <div className={inset ? 'max-w-4xl mx-auto mb-6 rounded-xl border border-zinc-800 bg-zinc-950' : 'border-b border-zinc-800 bg-zinc-950'}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 truncate">{meta.tripName}</div>
          <div className="font-semibold text-white leading-tight">
            {finished ? 'Tournament finished' : current ? `${current} of ${total}` : 'No day open'}
            {!finished && courseName && <span className="text-zinc-400 font-normal"> at {courseName}</span>}
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-1.5">
            {days.map((day, i) => {
              const isOpen = day === current && !finished
              const isClosed = closed.includes(day)
              const base = 'h-9 min-w-[2.75rem] px-2.5 rounded-lg border text-sm font-semibold flex items-center justify-center gap-1'
              if (isOpen) return (
                <span key={day} title={`${day} is open for scoring`} className={`${base} bg-emerald-500 border-emerald-500 text-black`}>
                  <span className="hidden sm:inline">Day </span>{i + 1}
                </span>
              )
              if (isClosed) return (
                <Link key={day} href="/history" title={`${day} is closed. See its results.`} className={`${base} border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300`}>
                  <Check size={12}/>{i + 1}
                </Link>
              )
              return canSwitch ? (
                <button key={day} onClick={() => open(day)} disabled={!!busy} title={`Switch to ${day}`}
                  className={`${base} border-zinc-700 text-zinc-400 hover:border-emerald-500 hover:text-emerald-400`}>
                  {busy === day ? '…' : i + 1}
                </button>
              ) : (
                <span key={day} title={`${day} has not started`} className={`${base} border-zinc-800 text-zinc-600`}>{i + 1}</span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
