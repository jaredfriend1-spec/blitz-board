// ─────────────────────────────────────────────────────────────────────
// TOURNAMENT DAY PLAN
//
// A tournament is set up once (trip, roster, teams, money) and then every
// day carries its own course, pairings and side matches.
//
// The live day keeps living where it always has — tournament/course,
// tournament/matchups, tournament/pairings, tournament/scores and
// tournament/draws — so the scorer, results, payouts and history engines
// read exactly what they read before. Every other day waits in
// tournament/plan/{Day N}/… and is swapped in when that day is opened.
//
// Opening a day never deletes anything: the day being left is written back
// to its plan slot, scores included, so days can be opened in any order.
//
// This file is shared logic — identical on every branch.
// ─────────────────────────────────────────────────────────────────────

export const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8']

// Everything that belongs to one day rather than to the whole tournament.
export const DAY_KEYS = ['course', 'matchups', 'pairings', 'scores', 'draws'] as const
export type DayKey = typeof DAY_KEYS[number]

// Where a day's data lives right now: the live tree if it is the open day,
// otherwise its plan slot.
export function dayPath(day: string, currentDay: string | null | undefined, key: DayKey): string {
  return day && day === currentDay ? `tournament/${key}` : `tournament/plan/${day}/${key}`
}

// Read one day's data out of a full `tournament` snapshot.
export function dayData(tournament: any, day: string): any {
  const t = tournament || {}
  if (day && day === t.meta?.currentDay) {
    const out: any = {}
    DAY_KEYS.forEach(k => { if (t[k] != null) out[k] = t[k] })
    return out
  }
  return t.plan?.[day] || {}
}

const has = (v: any) => v != null && (typeof v !== 'object' || Object.keys(v).length > 0)

// Multi-path update (relative to `tournament`) that parks the open day in
// its plan slot and brings `target` live. Pass the result to
// update(ref(db,'tournament'), …) so the swap lands in one write.
export function openDayUpdates(tournament: any, target: string): Record<string, any> {
  const t = tournament || {}
  const cur: string | null = t.meta?.currentDay || null
  if (!target || target === cur) return {}
  const incoming = t.plan?.[target] || {}
  const u: Record<string, any> = {}

  if (cur) {
    const stash: any = {}
    DAY_KEYS.forEach(k => { if (has(t[k])) stash[k] = t[k] })
    u[`plan/${cur}`] = Object.keys(stash).length ? stash : null
  }
  // A day with no course of its own inherits the one in play, so a day can
  // never be opened without a course.
  u['course'] = incoming.course ?? t.course ?? null
  u['matchups'] = incoming.matchups ?? null
  u['pairings'] = incoming.pairings ?? null
  u['scores'] = incoming.scores ?? null
  u['draws'] = incoming.draws ?? null
  u[`plan/${target}`] = null
  u['meta/currentDay'] = target
  u['meta/status'] = 'active'
  return u
}

// Multi-path update for after a day has been archived to History.
// `next` = the day to bring live, or null when the tournament is over.
// The closed day's own data is dropped; the archive holds it now.
export function afterCloseUpdates(tournament: any, next: string | null): Record<string, any> {
  const t = tournament || {}
  const u: Record<string, any> = {}
  const incoming = next ? (t.plan?.[next] || {}) : {}
  u['course'] = incoming.course ?? t.course ?? null
  u['matchups'] = incoming.matchups ?? null
  u['pairings'] = incoming.pairings ?? null
  u['scores'] = incoming.scores ?? null
  u['draws'] = incoming.draws ?? null
  if (next) u[`plan/${next}`] = null
  return u
}

// ── Which archived rounds belong to this trip ────────────────────────
// Rounds archived since trips got an id match on that id. Older archives
// fall back to the trip name.
export function isTripArchive(h: any, meta: any): boolean {
  const m = h?._meta
  if (!m?.dayLabel || !meta) return false
  if (meta.tripId && m.tripId) return m.tripId === meta.tripId
  if (m.tripId && !meta.tripId) return false
  return !!meta.tripName && m.tripName === meta.tripName
}

export function archivedDayLabels(history: any, meta: any): string[] {
  if (!history) return []
  return (Object.values(history) as any[]).filter(h => isTripArchive(h, meta)).map(h => h._meta.dayLabel)
}

// ── Team best-ball for one day ───────────────────────────────────────
// Same rule the Results page has always used for the team pot: the two
// lowest gross scores on each hole, three on par 3s. `toPar` only counts
// holes that have scores, so a round in progress ranks fairly against a
// finished one.
export function teamDayScore(playerIds: string[], scores: Record<string, number[]>, pars: number[]) {
  let total = 0, toPar = 0, holes = 0
  const n = Math.max(18, pars?.length || 0)
  for (let i = 0; i < n; i++) {
    const par = Number(pars?.[i]) || 4
    const sc = (playerIds || [])
      .map(id => Number(scores?.[id]?.[i]) || 0)
      .filter(s => s > 0)
      .sort((a, b) => a - b)
    if (!sc.length) continue
    const used = sc.slice(0, par === 3 ? 3 : 2)
    const sum = used.reduce((a, b) => a + b, 0)
    total += sum
    toPar += sum - par * used.length
    holes++
  }
  return { total, toPar, holes }
}

export type TeamStanding = {
  id: string; name: string
  days: Record<string, { total: number; toPar: number; holes: number }>
  total: number; toPar: number; holes: number
  rank: number; tied: boolean; payout: number
}

// ── Whole-tournament team standings ──────────────────────────────────
// Adds up every day of the trip — archived days, days parked in the plan
// with scores on them, and the day in play — and pays fixed dollar amounts
// by finishing place. Teams tied for a place split the money for the places
// they cover between them.
export function tournamentTeamStandings(tournament: any, history: any, placePayouts: number[] = []) {
  const t = tournament || {}
  const meta = t.meta || {}
  const liveTeams: any[] = t.teams ? Object.values(t.teams) : []
  const perDay: Record<string, { teams: any[]; scores: any; pars: number[] }> = {}

  // Days parked in the plan
  Object.entries(t.plan || {}).forEach(([day, d]: [string, any]) => {
    if (has(d?.scores)) perDay[day] = { teams: liveTeams, scores: d.scores, pars: d.course?.pars || t.course?.pars || [] }
  })
  // The day in play
  if (meta.currentDay && has(t.scores)) {
    perDay[meta.currentDay] = { teams: liveTeams, scores: t.scores, pars: t.course?.pars || [] }
  }
  // Archived days win over anything else carrying the same label
  if (history) {
    (Object.values(history) as any[]).filter(h => isTripArchive(h, meta)).forEach(h => {
      perDay[h._meta.dayLabel] = {
        teams: h.teams ? Object.values(h.teams) : liveTeams,
        scores: h.scores || {},
        pars: h.course?.pars || [],
      }
    })
  }

  const dayLabels = Object.keys(perDay).sort((a, b) => DAY_LABELS.indexOf(a) - DAY_LABELS.indexOf(b))

  const rows: TeamStanding[] = liveTeams.map(team => {
    const row: TeamStanding = { id: team.id, name: team.name, days: {}, total: 0, toPar: 0, holes: 0, rank: 0, tied: false, payout: 0 }
    dayLabels.forEach(day => {
      const d = perDay[day]
      const dayTeam = d.teams.find((x: any) => x.id === team.id) || d.teams.find((x: any) => x.name === team.name) || team
      const s = teamDayScore(dayTeam.playerIds || [], d.scores, d.pars)
      if (s.holes > 0) {
        row.days[day] = s
        row.total += s.total; row.toPar += s.toPar; row.holes += s.holes
      }
    })
    return row
  })

  const scored = rows.filter(r => r.holes > 0).sort((a, b) => a.toPar - b.toPar || a.name.localeCompare(b.name))
  let i = 0
  while (i < scored.length) {
    let j = i
    while (j + 1 < scored.length && scored[j + 1].toPar === scored[i].toPar) j++
    let money = 0
    for (let p = i; p <= j; p++) money += Number(placePayouts[p]) || 0
    const each = Math.round((money / (j - i + 1)) * 100) / 100
    for (let p = i; p <= j; p++) { scored[p].rank = i + 1; scored[p].tied = j > i; scored[p].payout = each }
    i = j + 1
  }

  const unscored = rows.filter(r => r.holes === 0)
  return { dayLabels, standings: [...scored, ...unscored] }
}
