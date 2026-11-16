"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, update, onValue } from 'firebase/database'
import { ArrowLeft, Flag, Users, Sword, Play, Plus, Trash2, X, ChevronRight, CheckCircle2, Loader2, Copy, Clock } from 'lucide-react'
import Link from 'next/link'
import { DAY_LABELS, dayPath, dayData, openDayUpdates, archivedDayLabels } from '@/lib/plan'

// ─────────────────────────────────────────────────────────────────────
// DAY PLAN
// One day of the tournament: its course, its pairings and its side
// matches. Any day can be planned ahead of time. The day that is open for
// scoring is edited live; every other day is saved to its plan slot and
// goes live when it is opened.
// ─────────────────────────────────────────────────────────────────────

type Group = { id: string; name: string; teeTime?: string; order: number; playerIds: string[] }

export default function DayPlan() {
  const [day, setDay] = useState<string>('')
  const [meta, setMeta] = useState<any>(undefined)
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [library, setLibrary] = useState<any[]>([])
  const [history, setHistory] = useState<any>(null)
  const [tournament, setTournament] = useState<any>({})
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const u1 = onValue(ref(db, 'tournament'), snap => {
      const t = snap.val() || {}
      setTournament(t)
      setMeta(t.meta || {})
      setPlayers(t.roster ? Object.values(t.roster) : [])
      setTeams(t.teams ? Object.values(t.teams) : [])
    })
    const u2 = onValue(ref(db, 'courseHistory'), snap => {
      const list = snap.val() ? Object.values(snap.val()) as any[] : []
      setLibrary(list.sort((a, b) => String(a.name).localeCompare(String(b.name))))
    })
    const u3 = onValue(ref(db, 'history'), snap => setHistory(snap.val()))
    return () => { u1(); u2(); u3() }
  }, [])

  // Day comes from the link (?day=Day 2); default to the day in play.
  useEffect(() => {
    if (meta === undefined || day) return
    const q = new URLSearchParams(window.location.search).get('day')
    setDay(q && DAY_LABELS.includes(q) ? q : (meta.currentDay || 'Day 1'))
  }, [meta, day])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000) }

  if (meta === undefined || !day) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm font-black">Loading...</div>
    </div>
  )

  const currentDay: string | null = meta.currentDay || null
  const totalDays: number = meta.totalDays || 1
  const isLive = day === currentDay
  const archived = archivedDayLabels(history, meta)
  const isArchived = archived.includes(day)
  const data = dayData(tournament, day)
  const course = data.course || null
  const matchCount = data.matchups ? Object.keys(data.matchups).length : 0
  const groups: Group[] = data.pairings
    ? (Object.values(data.pairings) as Group[]).map(g => ({ ...g, playerIds: g.playerIds || [] })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  // Everyone on a team is in the field.
  const fieldIds: string[] = teams.flatMap((t: any) => t.playerIds || [])
  const field = players.filter(p => fieldIds.includes(p.id))
  const teamOf = (pid: string) => teams.find((t: any) => (t.playerIds || []).includes(pid))
  const grouped = new Set(groups.flatMap(g => g.playerIds))
  const pool = field.filter(p => !grouped.has(p.id)).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  const nameOf = (pid: string) => players.find(p => p.id === pid)?.name || '—'

  const saveGroups = async (next: Group[]) => {
    const obj: Record<string, Group> = {}
    next.forEach((g, i) => { obj[g.id] = { ...g, order: i } })
    await set(ref(db, dayPath(day, currentDay, 'pairings')), next.length ? obj : null)
  }

  const addGroup = async () => {
    const id = 'g' + Date.now().toString(36)
    await saveGroups([...groups, { id, name: `Group ${groups.length + 1}`, teeTime: '', order: groups.length, playerIds: [] }])
    setActiveGroup(id)
  }
  const patchGroup = (id: string, patch: Partial<Group>) => saveGroups(groups.map(g => g.id === id ? { ...g, ...patch } : g))
  const removeGroup = (id: string) => {
    if (!confirm('Remove this group? Its players go back to the unassigned list.')) return
    saveGroups(groups.filter(g => g.id !== id))
    if (activeGroup === id) setActiveGroup(null)
  }
  const addToGroup = (pid: string) => {
    const target = activeGroup && groups.find(g => g.id === activeGroup) ? activeGroup : groups[groups.length - 1]?.id
    if (!target) return
    saveGroups(groups.map(g => g.id === target ? { ...g, playerIds: [...g.playerIds, pid] } : g))
  }
  const removeFromGroup = (gid: string, pid: string) =>
    saveGroups(groups.map(g => g.id === gid ? { ...g, playerIds: g.playerIds.filter(x => x !== pid) } : g))

  const copyFrom = async (other: string) => {
    const src = dayData(tournament, other).pairings
    if (!src) return
    if (groups.length && !confirm(`Replace ${day}'s groups with a copy of ${other}'s?`)) return
    await set(ref(db, dayPath(day, currentDay, 'pairings')), src)
    flash(`✓ Copied groups from ${other}.`)
  }

  const pickCourse = async (id: string) => {
    const c = library.find(x => x.id === id)
    if (!c) return
    if (isLive && tournament.scores && Object.keys(tournament.scores).length > 0 &&
        !confirm(`${day} already has scores entered.\n\nChanging the course changes the pars and stroke holes those scores are judged against. Continue?`)) return
    await set(ref(db, dayPath(day, currentDay, 'course')), { name: c.name, holes: c.holes, pars: c.pars || (c.holes || []).map((h: any) => h.par) })
    flash(`✓ ${day} will be played at ${c.name}.`)
  }

  const openDay = async () => {
    if (!confirm(`Open ${day} for scoring?\n\n${currentDay ? `${currentDay} is saved exactly as it is — scores, pairings and side matches — and can be reopened any time.\n\n` : ''}The scorer, results and payouts will switch to ${day}.`)) return
    setBusy(true)
    try {
      const snap = await get(ref(db, 'tournament'))
      const u = openDayUpdates(snap.val() || {}, day)
      if (Object.keys(u).length) await update(ref(db, 'tournament'), u)
      flash(`✓ ${day} is now open for scoring.`)
    } catch (e: any) {
      const m = String(e?.message || e)
      flash(/permission|PERMISSION_DENIED/i.test(m) ? 'Permission denied — sign out, sign back in, and try again.' : `Could not open ${day}: ${m}`)
    } finally { setBusy(false) }
  }

  const otherDaysWithGroups = Array.from({ length: totalDays }, (_, i) => DAY_LABELS[i])
    .filter(d => d !== day && !archived.includes(d) && dayData(tournament, d).pairings)

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/setup/admin" className="text-emerald-500 font-black flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors">
          <ArrowLeft size={16}/> CHECKLIST
        </Link>
        <span className="font-black text-sm tracking-widest text-zinc-400">DAY PLAN</span>
        <div className="w-20"/>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: totalDays }, (_, i) => DAY_LABELS[i]).map(d => {
            const sel = d === day, live = d === currentDay, done = archived.includes(d)
            return (
              <button key={d} onClick={() => { setDay(d); setActiveGroup(null); window.history.replaceState(null, '', `/setup/day?day=${encodeURIComponent(d)}`) }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 font-black text-xs transition-all ${sel ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                {d}
                <div className={`text-[8px] tracking-widest mt-0.5 ${sel ? 'text-black/70' : live ? 'text-blue-400' : done ? 'text-emerald-500' : 'text-zinc-600'}`}>
                  {done ? 'CLOSED' : live ? 'OPEN NOW' : 'PLANNED'}
                </div>
              </button>
            )
          })}
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight">{day}</h1>
          <p className="text-zinc-500 text-xs font-black normal-case mt-1">
            {isArchived ? 'This day is closed and in History.'
              : isLive ? 'Open for scoring now — changes here take effect straight away.'
              : 'Planned ahead — saved for this day and goes live when the day is opened.'}
          </p>
        </div>

        {msg && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-3.5 rounded-2xl text-sm font-black">{msg}</div>}

        {isArchived ? (
          <Link href="/history" className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl font-black text-sm text-zinc-300 transition-all">
            View {day} in History <ChevronRight size={14} className="inline"/>
          </Link>
        ) : (
          <>
            {/* ── COURSE ── */}
            <div className={`rounded-[1.75rem] border-2 bg-zinc-950 p-5 space-y-3 ${course ? 'border-emerald-500/40' : 'border-amber-500/40'}`}>
              <div className="flex items-center gap-3">
                <Flag size={18} className={course ? 'text-emerald-400' : 'text-amber-400'}/>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-white">Course</div>
                  <div className="text-[10px] font-black text-zinc-500 normal-case mt-0.5 truncate">
                    {course ? `${course.name} · Par ${(course.pars || []).reduce((a: number, b: number) => a + b, 0)}` : 'No course picked for this day yet'}
                  </div>
                </div>
                {course && <CheckCircle2 size={16} className="text-emerald-500"/>}
              </div>
              <select value="" onChange={e => pickCourse(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white text-sm outline-none">
                <option value="">{course ? 'Change course…' : 'Pick from saved courses…'}</option>
                {library.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Link href="/courses" className="text-[10px] font-black text-zinc-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                COURSE NOT LISTED? ADD IT IN THE COURSE LIBRARY <ChevronRight size={11}/>
              </Link>
            </div>

            {/* ── PAIRINGS ── */}
            <div className="rounded-[1.75rem] border-2 border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-blue-400"/>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-white">Pairings</div>
                  <div className="text-[10px] font-black text-zinc-500 normal-case mt-0.5">
                    {groups.length} group{groups.length === 1 ? '' : 's'} · {grouped.size} of {field.length} players placed
                  </div>
                </div>
              </div>

              {field.length === 0 && (
                <p className="text-amber-400 text-xs font-black normal-case">Build the roster and teams first — pairings are made from the players on teams.</p>
              )}

              {groups.map(g => {
                const active = activeGroup === g.id
                return (
                  <div key={g.id} className={`rounded-2xl border-2 p-3.5 space-y-3 transition-all ${active ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-black'}`}>
                    <div className="flex items-center gap-2">
                      <input defaultValue={g.name} key={g.id + g.name}
                        onBlur={e => { const v = e.target.value.trim(); if (v && v !== g.name) patchGroup(g.id, { name: v }) }}
                        className="flex-1 min-w-0 bg-transparent border-b border-zinc-800 focus:border-emerald-500 font-black text-sm text-white outline-none py-1"/>
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Clock size={12}/>
                        <input defaultValue={g.teeTime || ''} key={g.id + (g.teeTime || '')} placeholder="Tee time"
                          onBlur={e => { const v = e.target.value.trim(); if (v !== (g.teeTime || '')) patchGroup(g.id, { teeTime: v }) }}
                          className="w-20 bg-transparent border-b border-zinc-800 focus:border-emerald-500 font-black text-xs text-zinc-300 outline-none py-1"/>
                      </div>
                      <button onClick={() => removeGroup(g.id)} className="text-zinc-600 hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.playerIds.map(pid => (
                        <button key={pid} onClick={() => removeFromGroup(g.id, pid)}
                          className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 hover:border-rose-500 px-2.5 py-1.5 rounded-lg text-xs font-black text-white transition-colors">
                          {nameOf(pid)}
                          {teamOf(pid) && <span className="text-[9px] text-blue-400/80">{teamOf(pid).name}</span>}
                          <X size={11} className="text-zinc-500"/>
                        </button>
                      ))}
                      {g.playerIds.length === 0 && <span className="text-[10px] font-black text-zinc-600 normal-case py-1.5">No players yet</span>}
                    </div>
                    {!active ? (
                      <button onClick={() => setActiveGroup(g.id)} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 tracking-widest">+ ADD PLAYERS TO THIS GROUP</button>
                    ) : (
                      <p className="text-[10px] font-black text-emerald-400 tracking-widest">TAP PLAYERS BELOW TO ADD THEM HERE</p>
                    )}
                  </div>
                )
              })}

              <div className="flex gap-2">
                <button onClick={addGroup} disabled={field.length === 0}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 border border-blue-500/40 text-blue-400 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all">
                  <Plus size={14}/> ADD GROUP
                </button>
                {otherDaysWithGroups.length > 0 && (
                  <select value="" onChange={e => e.target.value && copyFrom(e.target.value)}
                    className="flex-1 bg-black border border-zinc-700 text-zinc-400 py-3 px-2 rounded-xl font-black text-xs outline-none">
                    <option value="">Copy groups from…</option>
                    {otherDaysWithGroups.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>

              {pool.length > 0 && groups.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-2">NOT IN A GROUP YET · {pool.length}</p>
                  <div className="flex flex-wrap gap-2">
                    {pool.map(p => (
                      <button key={p.id} onClick={() => addToGroup(p.id)}
                        className="flex items-center gap-1.5 bg-black border border-zinc-800 hover:border-emerald-500 px-2.5 py-1.5 rounded-lg text-xs font-black text-zinc-300 transition-colors">
                        {p.name}
                        {teamOf(p.id) && <span className="text-[9px] text-blue-400/80">{teamOf(p.id).name}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pool.length === 0 && groups.length > 0 && field.length > 0 && (
                <p className="text-[10px] font-black text-emerald-500 tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12}/> EVERY PLAYER IS IN A GROUP</p>
              )}
            </div>

            {/* ── SIDE MATCHES ── */}
            <Link href={`/setup/matchups?day=${encodeURIComponent(day)}`}
              className="flex items-center gap-3 rounded-[1.75rem] border-2 border-zinc-800 hover:border-amber-500/60 bg-zinc-950 p-5 transition-all">
              <Sword size={18} className="text-amber-400"/>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-white">Side Bets &amp; Matches</div>
                <div className="text-[10px] font-black text-zinc-500 normal-case mt-0.5">
                  {matchCount > 0 ? `${matchCount} match${matchCount === 1 ? '' : 'es'} set for ${day}` : 'Optional — none set for this day'}
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-600"/>
            </Link>

            {/* ── OPEN / GO ── */}
            {isLive ? (
              <Link href="/scorer" className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors">
                <Play size={18}/> GO TO THE SCORER
              </Link>
            ) : (
              <button onClick={openDay} disabled={busy}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors">
                {busy ? <Loader2 size={18} className="animate-spin"/> : <Play size={18}/>} OPEN {day.toUpperCase()} FOR SCORING
              </button>
            )}
            {!isLive && (
              <p className="text-[9px] font-black text-zinc-700 text-center leading-relaxed">
                {currentDay ? `${currentDay.toUpperCase()} IS SAVED AS IT IS WHEN YOU OPEN ANOTHER DAY. NOTHING IS ARCHIVED OR DELETED.` : 'OPENING A DAY MAKES IT THE DAY THE SCORER AND RESULTS SHOW.'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
