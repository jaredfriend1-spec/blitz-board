"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, update, onValue } from 'firebase/database'
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, Play, Pencil, AlertTriangle, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { DAY_LABELS, dayData, dayPath, afterCloseUpdates, openDayUpdates, restartUpdates, sampleFillUpdates, tripDayRecords, archivedDayLabels, isTripArchive } from '@/lib/plan'

// ─────────────────────────────────────────────────────────────────────
// TOURNAMENT SETUP
//
// One screen for the whole tournament. The left column is everything that
// is decided once — the trip, the players and teams, the money, the
// format. The right column is one row per day: its course, its pairings
// and its side matches, each of which can be filled in ahead of time.
//
// A day is "opened" for scoring and "closed" when it is final. Opening a
// different day parks the one in play, scores included, so nothing has to
// be finished in order.
// ─────────────────────────────────────────────────────────────────────

const MAX_DAYS = DAY_LABELS.length
const money$ = (n: number) => `$${Number(n || 0).toLocaleString('en-US')}`

export default function TournamentSetup() {
  const [t, setT] = useState<any>(undefined)          // the whole live tournament
  const [history, setHistory] = useState<any>(null)
  const [library, setLibrary] = useState<any[]>([])

  const [editingTrip, setEditingTrip] = useState(false)
  const [tripNameInput, setTripNameInput] = useState('')
  const [totalDaysInput, setTotalDaysInput] = useState(1)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [openingDay, setOpeningDay] = useState<string | null>(null)

  // Start over / erase
  const [showReset, setShowReset] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [confirmKind, setConfirmKind] = useState<null | 'restart' | 'erase'>(null)
  const [confirmText, setConfirmText] = useState('')

  // Close-day flow
  const [showClose, setShowClose] = useState(false)
  const [closeTarget, setCloseTarget] = useState<string | null>(null)   // the day being finished
  const [closing, setClosing] = useState(false)
  const [closeStep, setCloseStep] = useState<string | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closeDone, setCloseDone] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [playDate, setPlayDate] = useState('')

  // Finish-tournament flow
  const [showFinish, setShowFinish] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [finishStep, setFinishStep] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    const u1 = onValue(ref(db, 'tournament'), snap => setT(snap.val() || {}))
    const u2 = onValue(ref(db, 'history'), snap => setHistory(snap.val()))
    const u3 = onValue(ref(db, 'courseHistory'), snap => {
      const list = snap.val() ? Object.values(snap.val()) as any[] : []
      setLibrary(list.sort((a, b) => String(a.name).localeCompare(String(b.name))))
    })
    return () => { u1(); u2(); u3() }
  }, [])

  const say = (text: string, ok = true) => { setNotice({ ok, text }); setTimeout(() => setNotice(null), 6000) }
  const explain = (e: any) => {
    const m = String(e?.message || e)
    return /permission|PERMISSION_DENIED/i.test(m)
      ? 'That was not saved — your sign-in may have expired. Sign out, sign back in, and try again.'
      : m
  }

  if (t === undefined) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading…</div>
    </div>
  )

  // ── What exists ────────────────────────────────────────────────────
  const meta = t.meta || {}
  const course = t.course || null
  const money = t.money || {}
  const players: any[] = t.roster ? Object.values(t.roster) : []
  const teams: any[] = t.teams ? Object.values(t.teams) : []
  const fieldIds = new Set<string>(teams.flatMap((tm: any) => tm.playerIds || []))
  const formatName: string = t.format?.name || "Jeff's Blitz"
  const archivedDays = Array.from(new Set([...archivedDayLabels(history, meta), ...(meta.closedDays || [])]))

  const tripReady = !!(meta.tripName && meta.totalDays > 0)
  const courseReady = !!(course?.holes?.length === 18)
  const rosterReady = players.length > 0 && teams.length > 0 && fieldIds.size > 0
  const moneyReady = Number(money.entryFee) > 0
  const allReady = tripReady && courseReady && rosterReady && moneyReady
  const tripComplete = meta.status === 'complete'
  const currentDay: string | null = meta.currentDay || null
  const currentDayIdx = DAY_LABELS.indexOf(currentDay || 'Day 1')
  const totalDays: number = meta.totalDays || 1
  const hasMoreDays = (currentDayIdx + 1) < totalDays
  const canAddDay = (currentDayIdx + 1) < MAX_DAYS
  const hasAnyData = Object.keys(t).length > 0

  const byPlace = money.teamPayoutMode === 'places'
  const prizes: number[] = (money.placePayouts || []).map(Number).filter((n: number) => n > 0)
  const teamPot = fieldIds.size * ((Number(money.entryFee) || 0) - (Number(money.skinsAllocation) || 0))

  // ── Trip ───────────────────────────────────────────────────────────
  const startEditTrip = () => { setTripNameInput(meta.tripName || ''); setTotalDaysInput(meta.totalDays || 1); setEditingTrip(true) }
  const saveTrip = async () => {
    if (!tripNameInput.trim()) return say('Give the tournament a name first.', false)
    try {
      await set(ref(db, 'tournament/meta'), {
        ...meta,
        mode: 'tournament',
        tripName: tripNameInput.trim(),
        totalDays: totalDaysInput,
        currentDay: meta.currentDay || 'Day 1',
        // Ties this trip's closed days together, even if a trip name is reused.
        tripId: meta.tripId || String(Date.now()),
        isMock: false,
      })
      setEditingTrip(false)
      say('Tournament saved.')
    } catch (e) { say(explain(e), false) }
  }

  // ── Days ───────────────────────────────────────────────────────────
  const pickCourse = async (day: string, id: string) => {
    const c = library.find(x => x.id === id)
    if (!c) return
    const live = day === currentDay
    if (live && t.scores && Object.keys(t.scores).length > 0 &&
        !confirm(`${day} already has scores entered.\n\nChanging the course changes the pars and stroke holes those scores are judged against. Change it anyway?`)) return
    try {
      await set(ref(db, dayPath(day, currentDay, 'course')), { name: c.name, holes: c.holes, pars: c.pars || (c.holes || []).map((h: any) => h.par) })
      say(`${day} will be played at ${c.name}.`)
    } catch (e) { say(explain(e), false) }
  }

  // Park the day in play (scores included) and bring another day live.
  const openDay = async (day: string) => {
    if (!confirm(`Open ${day} for scoring?\n\n${currentDay ? `${currentDay} is saved exactly as it is — scores, pairings and side matches — and you can come back to it.\n\n` : ''}The scorer, results and payouts will switch to ${day}.`)) return
    setOpeningDay(day)
    try {
      const snap = await get(ref(db, 'tournament'))
      const u = openDayUpdates(snap.val() || {}, day)
      if (Object.keys(u).length) await update(ref(db, 'tournament'), u)
      say(`${day} is open for scoring.`)
    } catch (e) { say(`${day} was not opened. ${explain(e)}`, false) }
    finally { setOpeningDay(null) }
  }

  // ── Finish a day ───────────────────────────────────────────────────
  // Finishing saves a day to History as a permanent record and locks it.
  // It is never needed to move on — any day can be opened at any time — so
  // days can be finished in any order, whenever their scores are final.

  // Count how many holes each player has entered, so a half-scored day is
  // never finished without the person finishing it knowing.
  const runAudit = (day: string) => {
    const d = dayData(t, day)
    const holes = ((d.course || t.course)?.pars || []).length || 18
    const scores = d.scores || {}
    const partial: string[] = []
    let complete = 0
    Object.entries(t.roster || {}).forEach(([pid, p]: any) => {
      if (!fieldIds.has(pid) && fieldIds.size > 0) return
      const filled = (scores[pid] || []).filter((v: any) => v != null && v > 0).length
      if (filled >= holes) complete++
      else partial.push(`${p.name} (${filled}/${holes})`)
    })
    return { complete, partial, total: complete + partial.length, holes }
  }

  const openClose = (day: string) => {
    setCloseError(null); setCloseDone(null); setCloseStep(null)
    setCloseTarget(day)
    const now = new Date()
    setPlayDate(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10))
    setAudit(runAudit(day))
    setShowClose(true)
  }

  // Write one day to History and read it back. Throws — before anything
  // live is touched — if the saved copy does not match.
  const archiveDay = async (live: any, day: string, archiveId: number, tripId: string, isFinal: boolean, played: string) => {
    const liveMeta = live.meta || {}
    const d = dayData(live, day)
    // The tournament-wide setup plus this one day. Other days stay out of it.
    const { plan: _plan, course: _c, matchups: _m, pairings: _p, scores: _s, draws: _d, ...base } = live
    const payload = { ...base, ...d, course: d.course || live.course || null }
    const liveCards = Object.keys(payload.scores || {}).length
    if (liveCards === 0) throw new Error(`${day} has no scores, so there is nothing to save.`)
    const record = {
      ...payload,
      _meta: {
        tripName: liveMeta.tripName || 'Unnamed Trip',
        tripId,
        dayLabel: day,
        dayNumber: DAY_LABELS.indexOf(day) + 1,
        totalDays: liveMeta.totalDays || 1,
        archivedAt: archiveId,
        playedAt: played ? new Date(played + 'T12:00:00').getTime() : archiveId,
        isFinal,
        formatName: payload.format?.name || null,
        courseName: payload.course?.name || null,
      },
    }
    await set(ref(db, `history/${archiveId}`), record)
    const verify = (await get(ref(db, `history/${archiveId}`))).val()
    const savedCards = Object.keys(verify?.scores || {}).length
    if (!verify || savedCards !== liveCards || verify._meta?.dayLabel !== day) {
      throw new Error(`The saved copy of ${day} did not match — ${savedCards} of ${liveCards} scorecards. Nothing was cleared and your scores are untouched. Try again.`)
    }
    return savedCards
  }

  // ── Finish the whole tournament ────────────────────────────────────
  // Saves every day that has scores and is not finished yet, then marks the
  // tournament complete. Each day is saved and checked before anything is
  // cleared; if any one fails, the live tournament is left exactly as it was.
  const finishTournament = async () => {
    setFinishing(true); setFinishError(null)
    try {
      const snap = await get(ref(db, 'tournament'))
      if (!snap.exists()) throw new Error('There is no tournament to finish.')
      const live = snap.val()
      const liveMeta = live.meta || {}
      const already: string[] = Array.from(new Set([...archivedDays, ...(liveMeta.closedDays || [])]))
      const toSave = DAY_LABELS.slice(0, liveMeta.totalDays || 1)
        .filter(day => !already.includes(day) && Object.keys(dayData(live, day).scores || {}).length > 0)
      const tripId = liveMeta.tripId || String(Date.now())
      const stamp = Date.now()
      const saved: string[] = []
      for (let k = 0; k < toSave.length; k++) {
        setFinishStep(`Saving ${toSave[k]} to History…`)
        await archiveDay(live, toSave[k], stamp + k, tripId, k === toSave.length - 1, '')
        saved.push(toSave[k])
      }
      setFinishStep('Finishing…')
      await update(ref(db, 'tournament'), { scores: null, draws: null, matchups: null, pairings: null, plan: null })
      await set(ref(db, 'tournament/meta'), {
        ...liveMeta, tripId, mode: 'tournament', isMock: false,
        closedDays: Array.from(new Set([...already, ...saved])),
        status: 'complete', completedAt: stamp, currentDay: null,
      })
      setShowFinish(false)
      say(saved.length ? `Tournament finished. ${saved.join(', ')} saved to History.` : 'Tournament finished.')
    } catch (e) { setFinishError(explain(e)) }
    finally { setFinishing(false); setFinishStep(null) }
  }

  // endHere = also end the tournament, even if later days were never played
  const closeDay = async (endHere = false) => {
    const day = closeTarget
    if (!day) return
    setClosing(true); setCloseError(null)
    try {
      const idx = DAY_LABELS.indexOf(day)

      setCloseStep('Reading the day…')
      const snap = await get(ref(db, 'tournament'))
      if (!snap.exists()) throw new Error('There is no tournament to finish.')
      const live = snap.val()
      const liveMeta = live.meta || {}
      const isOpenDay = day === liveMeta.currentDay
      const closedDays: string[] = Array.from(new Set([...archivedDays, ...(liveMeta.closedDays || []), day]))
      const remaining = DAY_LABELS.slice(0, liveMeta.totalDays || 1).filter(x => !closedDays.includes(x))
      const tournamentOver = endHere || remaining.length === 0
      const tripId = liveMeta.tripId || String(Date.now())
      const archiveId = Date.now()

      setCloseStep('Saving to History and checking the copy…')
      const savedCards = await archiveDay(live, day, archiveId, tripId, tournamentOver, playDate)

      setCloseStep('Finishing…')
      const metaBase = { ...liveMeta, tripId, mode: 'tournament', isMock: false, closedDays }
      let next: string | null = null
      if (isOpenDay) {
        // Move scoring on to the next day that is not finished yet.
        next = tournamentOver ? null : (remaining.find(x => DAY_LABELS.indexOf(x) > idx) || remaining[0] || null)
        await update(ref(db, 'tournament'), afterCloseUpdates(live, next))
        await set(ref(db, 'tournament/meta'), next
          ? { ...metaBase, status: 'active', currentDay: next }
          : { ...metaBase, status: 'complete', completedAt: archiveId, currentDay: null })
      } else {
        // A day that was not the open one: just drop its parked copy.
        await update(ref(db, 'tournament'), { [`plan/${day}`]: null })
        await set(ref(db, 'tournament/meta'), tournamentOver
          ? { ...metaBase, status: 'complete', completedAt: archiveId, currentDay: null }
          : metaBase)
      }
      setCloseDone({ day, cards: savedCards, next, over: tournamentOver })
      setCloseStep(null)
    } catch (e: any) {
      setCloseError(explain(e))
      setCloseStep(null)
    } finally {
      setClosing(false)
    }
  }

  // ── Start over ─────────────────────────────────────────────────────
  const run = async (done: string, fn: () => Promise<void>) => {
    setResetBusy(true)
    try { await fn(); say(done) } catch (e) { say(explain(e), false) }
    finally { setResetBusy(false); setConfirmKind(null); setConfirmText('') }
  }

  const clearTodayScores = () => {
    if (!confirm(`Clear every score entered for ${currentDay || 'today'}?\n\nPairings, side matches and everything else stay.`)) return
    run('Scores cleared.', async () => { await update(ref(db, 'tournament'), { scores: null, draws: null }) })
  }

  // Wipe practice rounds: every score on every day, and this trip's closed days.
  const restartFromDayOne = () => run('Back to Day 1 with a clean slate. Players, teams, courses, pairings and side matches are all still here.', async () => {
    const snap = await get(ref(db, 'tournament'))
    const live = snap.val() || {}
    const hSnap = await get(ref(db, 'history'))
    const removals: Record<string, null> = {}
    const closed: Record<string, any> = {}
    Object.entries(hSnap.val() || {}).forEach(([id, h]: any) => {
      if (isTripArchive(h, live.meta)) { removals[id] = null; closed[h._meta.dayLabel] = h }
    })
    await update(ref(db, 'tournament'), restartUpdates(live, closed))
    if (Object.keys(removals).length) await update(ref(db, 'history'), removals)
  })

  const newTournament = () => {
    if (!confirm('Start a new tournament?\n\nThis clears the trip, teams, pairings, side matches, scores and every day\'s plan.\n\nPlayers, the course in play and the money settings stay. Closed days stay in History.')) return
    run('Ready for a new tournament.', async () => {
      await update(ref(db, 'tournament'), { scores: null, draws: null, matchups: null, pairings: null, plan: null, teams: null, meta: null })
    })
  }

  // Made-up pairings, side matches and scores, for looking the screens over.
  // Only offered while the trip has no scores of its own, so it can never
  // overwrite a real round.
  const canSample = rosterReady && tripReady && archivedDays.length === 0 && tripDayRecords(t, history).length === 0
  const fillSample = () => {
    if (!confirm('Fill the tournament with sample data?\n\nThis adds made-up pairings, side matches and scores using your real players, teams and courses, so you can see how every screen looks. Anything you have already set up is kept.\n\nTo remove it afterwards, use Start over from Day 1.')) return
    run('Sample data added. Have a look at the scorer and results. Start over from Day 1 removes it.', async () => {
      const snap = await get(ref(db, 'tournament'))
      await update(ref(db, 'tournament'), sampleFillUpdates(snap.val() || {}, library))
    })
  }

  const eraseEverything = () => run('Everything in the setup was erased.', async () => { await set(ref(db, 'tournament'), null) })

  // ── Day rows ───────────────────────────────────────────────────────
  const dayRows = Array.from({ length: totalDays }, (_, i) => {
    const day = DAY_LABELS[i]
    const d = dayData(t, day)
    const isCurrent = day === currentDay
    const isClosed = archivedDays.includes(day)
    const groups: any[] = d.pairings ? Object.values(d.pairings) : []
    const placed = new Set(groups.flatMap((g: any) => g.playerIds || [])).size
    const matches = d.matchups ? Object.keys(d.matchups).length : 0
    const scored = d.scores ? Object.keys(d.scores).length : 0
    return { day, d, isCurrent, isClosed, groups: groups.length, placed, matches, scored }
  })

  const missing = [
    !tripReady && 'name the tournament',
    !rosterReady && 'add players and teams',
    !moneyReady && 'set the entry fee',
    !courseReady && `pick a course for ${currentDay || 'Day 1'}`,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-semibold flex items-center gap-2 text-sm hover:text-emerald-300">
            <ArrowLeft size={16}/> Home
          </Link>
          <Link href="/setup/help" className="text-sm text-zinc-400 hover:text-emerald-400 underline underline-offset-4">How to set up a tournament</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-28 space-y-6">

        {/* ── Title ── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{meta.tripName || 'New tournament'}</h1>
            <p className="text-zinc-500 text-sm mt-1.5">
              {tripReady
                ? `${totalDays} day${totalDays > 1 ? 's' : ''}, ${fieldIds.size} player${fieldIds.size === 1 ? '' : 's'} on ${teams.length} team${teams.length === 1 ? '' : 's'}`
                : 'Set up the tournament once on the left, then plan each day on the right.'}
            </p>
          </div>
          {allReady && !tripComplete && currentDay && (
            <div className="flex items-center gap-2">
              <Link href="/scorer" className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
                <Play size={15}/> Score {currentDay}
              </Link>
              {dayRows.some(r => !r.isClosed && r.scored > 0) && (
                <button onClick={() => { setFinishError(null); setShowFinish(true) }}
                  className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-4 py-2.5 rounded-xl font-semibold text-sm">
                  Finish tournament
                </button>
              )}
            </div>
          )}
        </div>

        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400'}`}>
            {notice.text}
          </div>
        )}

        {meta.sampleData && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>This tournament is showing sample scores. They are made up. Remove them before the real thing.</span>
            <button onClick={() => { setShowReset(true); setConfirmKind('restart'); setConfirmText('') }} className="font-semibold underline underline-offset-4">Remove the sample data</button>
          </div>
        )}

        {tripComplete && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16}/> This tournament is finished</p>
              <p className="text-sm text-zinc-500 mt-1">Every day is saved in History.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/history" className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-semibold text-sm">See the results</Link>
              <button onClick={newTournament} disabled={resetBusy} className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-4 py-2.5 rounded-xl font-semibold text-sm">Start a new tournament</button>
            </div>
          </div>
        )}

        {!allReady && !tripComplete && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 px-4 py-3 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5"/>
            <span>Before scoring can start: {missing.join(', ')}.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">

          {/* ── LEFT: decided once ── */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="font-semibold">The tournament</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Set once. Stays the same every day.</p>
            </div>

            {/* Trip */}
            <div className="px-5 py-4 border-b border-zinc-800">
              {editingTrip ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">Name</label>
                    <input value={tripNameInput} onChange={e => setTripNameInput(e.target.value)} autoFocus
                      placeholder="Pinehurst 2026"
                      className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-lg text-white outline-none text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">Days of golf</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <button key={n} onClick={() => setTotalDaysInput(n)}
                          className={`w-9 h-9 rounded-lg font-semibold text-sm border ${totalDaysInput === n ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-black border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveTrip} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-lg font-semibold text-sm">Save</button>
                    <button onClick={() => setEditingTrip(false)} className="px-4 border border-zinc-700 text-zinc-400 hover:border-zinc-500 py-2.5 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <SetupRow done={tripReady} label="Name and days"
                  value={tripReady ? `${meta.tripName} — ${totalDays} day${totalDays > 1 ? 's' : ''}` : 'Not set yet'}
                  action={<button onClick={startEditTrip} className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-1 flex-shrink-0"><Pencil size={13}/> {tripReady ? 'Edit' : 'Set'}</button>}/>
              )}
            </div>

            <div className="px-5 py-4 border-b border-zinc-800">
              <SetupRow done={rosterReady} label="Players and teams"
                value={rosterReady ? `${fieldIds.size} players on ${teams.length} teams` : players.length ? `${players.length} players, no teams yet` : 'No players yet'}
                action={<RowLink href="/setup/roster" label={rosterReady ? 'Edit' : 'Add'}/>}/>
            </div>

            <div className="px-5 py-4 border-b border-zinc-800">
              <SetupRow done={moneyReady} label="Money"
                value={!moneyReady ? 'Entry fee not set'
                  : byPlace
                    ? `${money$(money.entryFee)} entry. Team prize ${prizes.length ? prizes.map(money$).join(' / ') : 'not set'}, paid at the end.`
                    : `${money$(money.entryFee)} entry${Number(money.skinsAllocation) > 0 ? `, ${money$(money.skinsAllocation)} of it to skins` : ''}. Team pot ${money$(Math.max(0, teamPot))} a day.`}
                action={<RowLink href="/setup/money" label={moneyReady ? 'Edit' : 'Set'}/>}/>
            </div>

            <div className="px-5 py-4">
              <SetupRow done label="Team scoring format" value={formatName}
                action={<RowLink href="/setup/format" label="Edit"/>}/>
            </div>
          </section>

          {/* ── RIGHT: one row per day ── */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">The days</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Plan any day ahead of time. Side matches are optional.</p>
              </div>
              {tripReady && <button onClick={startEditTrip} className="text-xs text-zinc-500 hover:text-emerald-400">Add or remove days</button>}
            </div>

            {/* Column headings — laptop only */}
            <div className="hidden lg:grid grid-cols-[110px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_128px] gap-4 px-5 py-2.5 border-b border-zinc-800 text-xs text-zinc-500">
              <span>Day</span><span>Course</span><span>Pairings</span><span>Side matches</span><span/>
            </div>

            {dayRows.map(r => (
              <div key={r.day}
                className={`grid lg:grid-cols-[110px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_128px] gap-x-4 gap-y-3 px-5 py-4 border-b border-zinc-800 last:border-b-0 lg:items-center ${r.isCurrent && !tripComplete ? 'bg-emerald-500/5' : ''}`}>

                {/* Day + status */}
                <div className="flex lg:block items-center justify-between gap-3">
                  <div className="font-semibold">{r.day}</div>
                  <div className={`text-xs mt-0.5 ${r.isClosed ? 'text-zinc-500' : r.isCurrent ? 'text-emerald-400' : r.scored ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {r.isClosed ? 'Finished' : r.isCurrent ? 'Open for scoring' : r.scored ? 'Scores saved' : 'Not started'}
                  </div>
                </div>

                {r.isClosed ? (
                  <div className="lg:col-span-3 text-sm text-zinc-500">Finished and saved in History.</div>
                ) : (
                  <>
                    {/* Course */}
                    <div>
                      <div className="lg:hidden text-xs text-zinc-500 mb-1">Course</div>
                      <select value={library.find(c => c.name === r.d.course?.name)?.id || (r.d.course ? '__current' : '')}
                        onChange={e => pickCourse(r.day, e.target.value)}
                        className={`w-full bg-black border px-3 py-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 ${r.d.course ? 'border-zinc-700 text-white' : 'border-amber-500/50 text-amber-400'}`}>
                        {!r.d.course && <option value="">Pick a course…</option>}
                        {r.d.course && !library.find(c => c.name === r.d.course.name) && <option value="__current">{r.d.course.name}</option>}
                        {library.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Pairings */}
                    <Link href={`/setup/day?day=${encodeURIComponent(r.day)}`} className="group block">
                      <div className="lg:hidden text-xs text-zinc-500 mb-1">Pairings</div>
                      <div className="flex items-center justify-between gap-2 border border-zinc-800 group-hover:border-zinc-600 rounded-lg px-3 py-2.5 text-sm">
                        <span className={r.groups ? 'text-white' : 'text-zinc-500'}>
                          {r.groups ? `${r.groups} group${r.groups > 1 ? 's' : ''}` : 'Not set'}
                          {r.groups > 0 && r.placed < fieldIds.size && <span className="text-amber-400"> ({fieldIds.size - r.placed} left out)</span>}
                        </span>
                        <ChevronRight size={14} className="text-zinc-600 flex-shrink-0"/>
                      </div>
                    </Link>

                    {/* Side matches */}
                    <Link href={`/setup/matchups?day=${encodeURIComponent(r.day)}`} className="group block">
                      <div className="lg:hidden text-xs text-zinc-500 mb-1">Side matches</div>
                      <div className="flex items-center justify-between gap-2 border border-zinc-800 group-hover:border-zinc-600 rounded-lg px-3 py-2.5 text-sm">
                        <span className={r.matches ? 'text-white' : 'text-zinc-500'}>{r.matches ? `${r.matches} match${r.matches > 1 ? 'es' : ''}` : 'None'}</span>
                        <ChevronRight size={14} className="text-zinc-600 flex-shrink-0"/>
                      </div>
                    </Link>
                  </>
                )}

                {/* Action */}
                <div className="lg:text-right">
                  {r.isClosed ? (
                    <Link href="/history" className="text-sm text-zinc-400 hover:text-white">See results</Link>
                  ) : r.isCurrent && !tripComplete ? (
                    <Link href="/scorer" className="inline-flex items-center justify-center gap-1.5 w-full lg:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-lg font-semibold text-sm">
                      <Play size={13}/> Scorer
                    </Link>
                  ) : (
                    <button onClick={() => openDay(r.day)} disabled={!!openingDay}
                      className="inline-flex items-center justify-center gap-1.5 w-full lg:w-auto border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 text-zinc-300 px-4 py-2.5 rounded-lg font-semibold text-sm">
                      {openingDay === r.day ? <Loader2 size={13} className="animate-spin"/> : null} Open
                    </button>
                  )}
                  {!r.isClosed && r.scored > 0 && (
                    <button onClick={() => openClose(r.day)} className="block w-full lg:w-auto lg:ml-auto mt-2 text-xs text-zinc-500 hover:text-emerald-400 whitespace-nowrap">
                      Finish day
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="px-5 py-3.5 bg-black/40 text-xs text-zinc-500 leading-relaxed">
              Open whichever day you are playing. Opening another day keeps the scores on the one you leave, so you can move between days freely.
              When a day's scores are final, finish it: that saves it to History for the record and locks it. You never have to finish a day to move on.{' '}
              <Link href="/courses" className="text-zinc-400 hover:text-emerald-400 underline">Add a course to the list</Link>
            </div>
          </section>
        </div>

        {/* ── Start over ── */}
        {hasAnyData && (
          <div className="pt-2">
            <button onClick={() => setShowReset(!showReset)} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5">
              <ChevronDown size={15} className={showReset ? 'rotate-180' : ''}/> Sample data, clear scores or start over
            </button>

            {showReset && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800">
                <ResetRow title={`Clear ${currentDay || 'today'}'s scores`}
                  detail="Removes the scores entered for the open day. Everything else stays."
                  button="Clear scores" onClick={clearTodayScores} disabled={resetBusy}/>

                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">Start over from Day 1</p>
                      <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                        For clearing out practice rounds. Removes every score on every day and deletes this tournament's closed days from History.
                        Players, teams, courses, pairings, side matches and money all stay.
                      </p>
                    </div>
                    {confirmKind !== 'restart' && (
                      <button onClick={() => { setConfirmKind('restart'); setConfirmText('') }} disabled={resetBusy}
                        className="border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 px-4 py-2 rounded-lg text-sm font-semibold">Start over</button>
                    )}
                  </div>
                  {confirmKind === 'restart' && (
                    <TypeToConfirm word="START OVER" text={confirmText} setText={setConfirmText} busy={resetBusy}
                      warning="The scores and closed days cannot be brought back."
                      go="Remove the scores and go back to Day 1" onGo={restartFromDayOne} onCancel={() => setConfirmKind(null)}/>
                  )}
                </div>

                <ResetRow title="Fill with sample data"
                  detail={canSample
                    ? 'Adds made-up pairings, side matches and scores using your real players, teams and courses, so you can see every screen with something in it. Start over from Day 1 removes it again.'
                    : 'Only available while the tournament has no scores. Use Start over from Day 1 first if you want to try it.'}
                  button="Add sample data" onClick={fillSample} disabled={resetBusy || !canSample}/>

                <ResetRow title="Start a new tournament"
                  detail="Clears the trip, teams, pairings, side matches and scores. Keeps the players, the course and the money settings. Closed days stay in History."
                  button="New tournament" onClick={newTournament} disabled={resetBusy}/>

                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">Erase the whole setup</p>
                      <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                        Removes everything on this screen, including players, teams and money. History, saved courses and the permanent roster are not touched.
                      </p>
                    </div>
                    {confirmKind !== 'erase' && (
                      <button onClick={() => { setConfirmKind('erase'); setConfirmText('') }} disabled={resetBusy}
                        className="border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 px-4 py-2 rounded-lg text-sm font-semibold">Erase</button>
                    )}
                  </div>
                  {confirmKind === 'erase' && (
                    <TypeToConfirm word="ERASE" text={confirmText} setText={setConfirmText} busy={resetBusy}
                      warning="This cannot be undone."
                      go="Erase the setup" onGo={eraseEverything} onCancel={() => setConfirmKind(null)}/>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Finish-tournament dialog ── */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!finishing) setShowFinish(false) }}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div>
              <p className="font-semibold text-lg">Finish the tournament</p>
              <p className="text-sm text-zinc-500 mt-1">
                Saves every day below to History in one go and marks the tournament finished. Scores are locked after this, so fix any mistakes first.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
              {dayRows.map(r => {
                const a = !r.isClosed && r.scored > 0 ? runAudit(r.day) : null
                return (
                  <div key={r.day} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                    <span className="font-semibold">{r.day}</span>
                    <span className={`text-right ${r.isClosed ? 'text-zinc-500' : !a ? 'text-zinc-500' : a.partial.length ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {r.isClosed ? 'Already in History'
                        : !a ? 'No scores, will be skipped'
                        : a.partial.length ? `Will be saved. ${a.partial.length} of ${a.total} scorecards not finished.`
                        : `Will be saved. All ${a.total} scorecards complete.`}
                    </span>
                  </div>
                )
              })}
            </div>

            {finishError && <div className="border border-rose-500/40 bg-rose-500/10 text-rose-400 rounded-xl p-3 text-sm">{finishError}</div>}
            {finishStep && <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={14} className="animate-spin"/> {finishStep}</div>}

            <div className="space-y-2">
              <button onClick={finishTournament} disabled={finishing}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black py-3.5 rounded-xl font-semibold text-sm">
                Save to History and finish the tournament
              </button>
              <button onClick={() => setShowFinish(false)} disabled={finishing} className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm">Cancel</button>
            </div>

            <p className="text-xs text-zinc-600 text-center leading-relaxed">
              Each day is saved and checked before anything is cleared. If a check fails, your scores are left alone.
            </p>
          </div>
        </div>
      )}

      {/* ── Finish-day dialog ── */}
      {showClose && closeTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!closing) { setShowClose(false); setCloseDone(null) } }}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {closeDone ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto"/>
                <div>
                  <p className="font-semibold text-lg">{closeDone.day} is finished</p>
                  <p className="text-sm text-zinc-500 mt-1">{closeDone.cards} scorecards saved to History.</p>
                </div>
                {(closeDone.over || closeDone.next) && (
                  <p className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    {closeDone.over ? 'That was the last day. The tournament is finished.' : `${closeDone.next} is now open for scoring.`}
                  </p>
                )}
                <button onClick={() => { setShowClose(false); setCloseDone(null) }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-semibold text-sm">Done</button>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-lg">Finish {closeTarget}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Saves {closeTarget} to History as the permanent record and locks its scores. Do this once the scores are final. It still counts toward the team prize.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">Date this round was played</label>
                  <input type="date" value={playDate} onChange={e => setPlayDate(e.target.value)}
                    className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-lg text-white outline-none text-sm"/>
                </div>

                {audit && (audit.partial.length === 0 ? (
                  <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded-xl p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 size={15}/> All {audit.total} scorecards are complete.
                  </div>
                ) : (
                  <div className="border border-amber-500/40 bg-amber-500/10 text-amber-400 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15}/> {audit.partial.length} scorecard{audit.partial.length > 1 ? 's are' : ' is'} not finished</div>
                    <ul className="text-xs pl-5 list-disc">
                      {audit.partial.slice(0, 6).map((n: string) => <li key={n}>{n}</li>)}
                      {audit.partial.length > 6 && <li>and {audit.partial.length - 6} more</li>}
                    </ul>
                    <p className="text-xs text-zinc-500">You can still finish the day, but its scores are locked once you do.</p>
                  </div>
                ))}

                {closeError && <div className="border border-rose-500/40 bg-rose-500/10 text-rose-400 rounded-xl p-3 text-sm">{closeError}</div>}
                {closeStep && <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={14} className="animate-spin"/> {closeStep}</div>}

                <div className="space-y-2">
                  <button onClick={() => closeDay(false)} disabled={closing}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black py-3.5 rounded-xl font-semibold text-sm">
                    Finish {closeTarget}
                  </button>
                  {dayRows.filter(r => !r.isClosed && r.day !== closeTarget).length > 0 && (
                    <button onClick={() => { if (confirm(`End the whole tournament after ${closeTarget}?\n\nDays that are not finished will not be saved to History.`)) closeDay(true) }} disabled={closing}
                      className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 py-3 rounded-xl text-sm">
                      Finish {closeTarget} and end the tournament early
                    </button>
                  )}
                  <button onClick={() => setShowClose(false)} disabled={closing} className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm">Cancel</button>
                </div>

                <p className="text-xs text-zinc-600 text-center leading-relaxed">
                  The day is saved and checked before anything is cleared. If the check fails, your scores are left alone.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SetupRow({ done, label, value, action }: { done: boolean; label: string; value: string; action: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 size={17} className={`flex-shrink-0 mt-0.5 ${done ? 'text-emerald-400' : 'text-zinc-700'}`}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-sm">{label}</span>
          {action}
        </div>
        <p className={`text-sm mt-0.5 ${done ? 'text-zinc-400' : 'text-amber-400'}`}>{value}</p>
      </div>
    </div>
  )
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold flex items-center gap-0.5 flex-shrink-0">
      {label} <ChevronRight size={14}/>
    </Link>
  )
}

function ResetRow({ title, detail, button, onClick, disabled }: { title: string; detail: string; button: string; onClick: () => void; disabled: boolean }) {
  return (
    <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">{detail}</p>
      </div>
      <button onClick={onClick} disabled={disabled}
        className="border border-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:hover:border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-semibold">{button}</button>
    </div>
  )
}

function TypeToConfirm({ word, text, setText, busy, warning, go, onGo, onCancel }: {
  word: string; text: string; setText: (s: string) => void; busy: boolean; warning: string; go: string; onGo: () => void; onCancel: () => void
}) {
  return (
    <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 space-y-3">
      <p className="text-sm text-rose-400">{warning} Type <span className="font-semibold text-white">{word}</span> to go ahead.</p>
      <input value={text} onChange={e => setText(e.target.value)} placeholder={word} autoFocus
        className="w-full sm:w-64 bg-black border border-zinc-700 focus:border-rose-500 px-3 py-2 rounded-lg text-white outline-none text-sm"/>
      <div className="flex flex-wrap gap-2">
        <button onClick={onGo} disabled={busy || text.trim().toUpperCase() !== word}
          className="bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {busy ? 'Working…' : go}
        </button>
        <button onClick={onCancel} className="px-4 border border-zinc-700 text-zinc-400 hover:border-zinc-500 py-2 rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  )
}
