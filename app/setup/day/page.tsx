"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, get, update, onValue } from 'firebase/database'
import { Play, Plus, Trash2, X, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import SetupBack from '@/components/SetupBack'
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
      <div className="text-zinc-600 text-sm">Loading…</div>
    </div>
  )

  const currentDay: string | null = meta.currentDay || null
  const totalDays: number = meta.totalDays || 1
  const isLive = day === currentDay
  const archived = Array.from(new Set([...archivedDayLabels(history, meta), ...(meta.closedDays || [])]))
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
    flash(`Copied the groups from ${other}.`)
  }

  const pickCourse = async (id: string) => {
    const c = library.find(x => x.id === id)
    if (!c) return
    if (isLive && tournament.scores && Object.keys(tournament.scores).length > 0 &&
        !confirm(`${day} already has scores entered.\n\nChanging the course changes the pars and stroke holes those scores are judged against. Continue?`)) return
    await set(ref(db, dayPath(day, currentDay, 'course')), { name: c.name, holes: c.holes, pars: c.pars || (c.holes || []).map((h: any) => h.par) })
    flash(`${day} will be played at ${c.name}.`)
  }

  const openDay = async () => {
    if (!confirm(`Open ${day} for scoring?\n\n${currentDay ? `${currentDay} is saved exactly as it is — scores, pairings and side matches — and can be reopened any time.\n\n` : ''}The scorer, results and payouts will switch to ${day}.`)) return
    setBusy(true)
    try {
      const snap = await get(ref(db, 'tournament'))
      const u = openDayUpdates(snap.val() || {}, day)
      if (Object.keys(u).length) await update(ref(db, 'tournament'), u)
      flash(`${day} is open for scoring.`)
    } catch (e: any) {
      const m = String(e?.message || e)
      flash(/permission|PERMISSION_DENIED/i.test(m) ? 'Permission denied — sign out, sign back in, and try again.' : `Could not open ${day}: ${m}`)
    } finally { setBusy(false) }
  }

  const otherDaysWithGroups = Array.from({ length: totalDays }, (_, i) => DAY_LABELS[i])
    .filter(d => d !== day && !archived.includes(d) && dayData(tournament, d).pairings)

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-28 space-y-6">
        <SetupBack here={`${day} course and pairings`}/>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: totalDays }, (_, i) => DAY_LABELS[i]).map(d => {
            const sel = d === day, live = d === currentDay, done = archived.includes(d)
            return (
              <button key={d} onClick={() => { setDay(d); setActiveGroup(null); window.history.replaceState(null, '', `/setup/day?day=${encodeURIComponent(d)}`) }}
                className={`flex-shrink-0 text-left px-4 py-2.5 rounded-xl border text-sm ${sel ? 'bg-zinc-900 border-emerald-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                <div className="font-semibold">{d}</div>
                <div className={`text-xs mt-0.5 ${live ? 'text-emerald-400' : 'text-zinc-500'}`}>{done ? 'Closed' : live ? 'Open for scoring' : 'Planned'}</div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{day}</h1>
            <p className="text-zinc-500 text-sm mt-1.5">
              {isArchived ? 'This day is closed and saved in History.'
                : isLive ? 'Open for scoring now. Changes here take effect straight away.'
                : 'Planned ahead. Everything here is saved for this day and goes live when you open it.'}
            </p>
          </div>
          {!isArchived && (isLive ? (
            <Link href="/scorer" className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
              <Play size={15}/> Go to the scorer
            </Link>
          ) : (
            <button onClick={openDay} disabled={busy}
              className="border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 text-zinc-300 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2">
              {busy ? <Loader2 size={15} className="animate-spin"/> : <Play size={15}/>} Open {day} for scoring
            </button>
          ))}
        </div>

        {msg && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-4 py-3 text-sm">{msg}</div>}

        {isArchived ? (
          <Link href="/history" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-semibold">
            See {day} in History <ChevronRight size={14}/>
          </Link>
        ) : (
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">

            {/* ── Course and side matches ── */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
                <div>
                  <h2 className="font-semibold">Course</h2>
                  <p className={`text-sm mt-0.5 ${course ? 'text-zinc-400' : 'text-amber-400'}`}>
                    {course ? `${course.name}, par ${(course.pars || []).reduce((a: number, b: number) => a + b, 0)}` : 'No course picked for this day yet'}
                  </p>
                </div>
                <select value={library.find(c => c.name === course?.name)?.id || (course ? '__current' : '')} onChange={e => pickCourse(e.target.value)}
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-3 py-2.5 rounded-lg text-white text-sm outline-none">
                  {!course && <option value="">Pick a course…</option>}
                  {course && !library.find(c => c.name === course.name) && <option value="__current">{course.name}</option>}
                  {library.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Link href="/courses" className="text-xs text-zinc-500 hover:text-emerald-400 inline-flex items-center gap-1">
                  Course not listed? Add it to the course library <ChevronRight size={12}/>
                </Link>
              </section>

              <Link href={`/setup/matchups?day=${encodeURIComponent(day)}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 hover:border-zinc-600 bg-zinc-950 p-5">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold">Side matches</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {matchCount > 0 ? `${matchCount} match${matchCount === 1 ? '' : 'es'} set for ${day}` : 'None yet. These are optional.'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-zinc-600"/>
              </Link>
            </div>

            {/* ── Pairings ── */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Pairings</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Who plays together on {day}. {grouped.size} of {field.length} players placed.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {otherDaysWithGroups.length > 0 && (
                    <select value="" onChange={e => e.target.value && copyFrom(e.target.value)}
                      className="bg-black border border-zinc-700 text-zinc-400 py-2 px-2.5 rounded-lg text-sm outline-none">
                      <option value="">Copy from…</option>
                      {otherDaysWithGroups.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                  <button onClick={addGroup} disabled={field.length === 0}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black py-2 px-3.5 rounded-lg font-semibold text-sm flex items-center gap-1.5">
                    <Plus size={14}/> Add a group
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {field.length === 0 && (
                  <p className="text-amber-400 text-sm">Add players and teams first. Pairings are made from the players on teams.</p>
                )}
                {field.length > 0 && groups.length === 0 && (
                  <p className="text-zinc-500 text-sm">No groups yet. Add a group, then pick its players from the list below it.</p>
                )}

                {groups.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groups.map(g => {
                      const active = activeGroup === g.id
                      return (
                        <div key={g.id} onClick={() => setActiveGroup(g.id)}
                          className={`rounded-xl border p-3.5 space-y-3 cursor-pointer ${active ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}>
                          <div className="flex items-center gap-2">
                            <input defaultValue={g.name} key={g.id + g.name} aria-label="Group name"
                              onBlur={e => { const v = e.target.value.trim(); if (v && v !== g.name) patchGroup(g.id, { name: v }) }}
                              className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 font-semibold text-sm text-white outline-none py-0.5"/>
                            <input defaultValue={g.teeTime || ''} key={g.id + (g.teeTime || '')} placeholder="Tee time" aria-label="Tee time"
                              onBlur={e => { const v = e.target.value.trim(); if (v !== (g.teeTime || '')) patchGroup(g.id, { teeTime: v }) }}
                              className="w-20 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 text-sm text-zinc-400 outline-none py-0.5 text-right"/>
                            <button onClick={e => { e.stopPropagation(); removeGroup(g.id) }} aria-label="Remove group" className="text-zinc-600 hover:text-rose-400 p-1"><Trash2 size={14}/></button>
                          </div>
                          <div className="space-y-1.5">
                            {g.playerIds.map(pid => (
                              <div key={pid} className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate">{nameOf(pid)}{teamOf(pid) && <span className="text-zinc-500"> · {teamOf(pid).name}</span>}</span>
                                <button onClick={e => { e.stopPropagation(); removeFromGroup(g.id, pid) }} aria-label={`Remove ${nameOf(pid)}`} className="text-zinc-600 hover:text-rose-400 p-0.5 flex-shrink-0"><X size={13}/></button>
                              </div>
                            ))}
                            {g.playerIds.length === 0 && <p className="text-sm text-zinc-600">No players yet</p>}
                          </div>
                          <p className={`text-xs ${active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {active ? (pool.length ? 'Pick players below to add them here' : 'Selected') : 'Click to add players here'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {pool.length > 0 && groups.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Not in a group yet ({pool.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {pool.map(p => (
                        <button key={p.id} onClick={() => addToGroup(p.id)}
                          className="bg-black border border-zinc-700 hover:border-emerald-500 px-3 py-1.5 rounded-lg text-sm text-zinc-200">
                          {p.name}{teamOf(p.id) && <span className="text-zinc-500"> · {teamOf(p.id).name}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {pool.length === 0 && groups.length > 0 && field.length > 0 && (
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14}/> Every player is in a group.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
