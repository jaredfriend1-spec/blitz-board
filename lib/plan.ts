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
// ── Every day of the trip that has scores ────────────────────────────
// One record per day, shaped like an archived round (roster, teams, money,
// course, scores, draws, matchups) so the payout engine can read any of
// them. Sources, in order of authority: History for finished days, the
// live tree for the open day, the plan for every other day.
export type TripDay = {
  label: string; source: 'history' | 'live' | 'plan'
  roster: any; teams: any; money: any; format: any
  course: any; scores: any; draws: any; matchups: any; pairings: any
}

export function tripDayRecords(tournament: any, history: any): TripDay[] {
  const t = tournament || {}
  const meta = t.meta || {}
  const base = { roster: t.roster || {}, teams: t.teams || {}, money: t.money || {}, format: t.format || null }
  const out: Record<string, TripDay> = {}
  const add = (label: string, source: TripDay['source'], d: any, b: any = base) => {
    out[label] = {
      label, source, ...b,
      course: d.course || t.course || { pars: [] },
      scores: d.scores || {}, draws: d.draws || {}, matchups: d.matchups || {}, pairings: d.pairings || {},
    }
  }
  Object.entries(t.plan || {}).forEach(([day, d]: [string, any]) => { if (has(d?.scores)) add(day, 'plan', d) })
  if (meta.currentDay && has(t.scores)) add(meta.currentDay, 'live', t)
  if (history) {
    (Object.values(history) as any[]).filter(h => isTripArchive(h, meta)).forEach(h => {
      add(h._meta.dayLabel, 'history', h, {
        roster: h.roster || base.roster, teams: h.teams || base.teams, money: h.money || base.money, format: h.format || base.format,
      })
    })
  }
  return Object.values(out).sort((a, b) => DAY_LABELS.indexOf(a.label) - DAY_LABELS.indexOf(b.label))
}

export function tournamentTeamStandings(tournament: any, history: any, placePayouts: number[] = []) {
  const t = tournament || {}
  const liveTeams: any[] = t.teams ? Object.values(t.teams) : []
  const perDay: Record<string, { teams: any[]; scores: any; pars: number[] }> = {}
  tripDayRecords(t, history).forEach(d => {
    perDay[d.label] = { teams: Object.values(d.teams || {}), scores: d.scores, pars: d.course?.pars || [] }
  })

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

// ── Start the trip over from Day 1 ───────────────────────────────────
// For wiping practice rounds before the real thing. Every day keeps its
// course, pairings and side matches; every score and drawn card goes, and
// Day 1 becomes the open day again. Closed days in History are removed
// separately by the caller (they live outside `tournament`).
// `closed` = this trip's closed days keyed by day label, so a closed day
// gets its own course, pairings and side matches back.
export function restartUpdates(tournament: any, closed: Record<string, any> = {}): Record<string, any> {
  const t = tournament || {}
  const total = Math.max(1, Number(t.meta?.totalDays) || 1)
  const days = DAY_LABELS.slice(0, Math.max(total, DAY_LABELS.indexOf(t.meta?.currentDay || 'Day 1') + 1))
  const plan: Record<string, any> = {}
  let first: any = {}
  days.forEach(day => {
    const { scores: _s, draws: _d, ...keep } = dayData(t, day)
    const was = closed[day]
    if (was) (['course', 'pairings', 'matchups'] as const).forEach(k => { if (keep[k] == null && was[k] != null) keep[k] = was[k] })
    // Anything the sample-data button made up goes too.
    if (keep.course?.sample) delete keep.course
    ;(['pairings', 'matchups'] as const).forEach(k => {
      if (!keep[k]) return
      const real = Object.fromEntries(Object.entries(keep[k]).filter(([, v]: any) => !v?.sample))
      if (Object.keys(real).length) keep[k] = real; else delete keep[k]
    })
    if (day === 'Day 1') first = keep
    else if (Object.keys(keep).length) plan[day] = keep
  })
  return {
    plan: Object.keys(plan).length ? plan : null,
    course: first.course ?? (t.course?.sample ? null : t.course) ?? null,
    matchups: first.matchups ?? null,
    pairings: first.pairings ?? null,
    scores: null,
    draws: null,
    'meta/currentDay': 'Day 1',
    'meta/status': 'active',
    'meta/completedAt': null,
    'meta/closedDays': null,
    'meta/sampleData': null,
  }
}

// ── Whole-tournament individual standings ────────────────────────────
// Gross strokes per day and in total. Ranked by score to par over the
// holes actually played, so someone mid-round compares fairly.
export function tournamentPlayerStandings(days: TripDay[]) {
  const rows: Record<string, { id: string; name: string; days: Record<string, number>; total: number; toPar: number; holes: number }> = {}
  days.forEach(d => {
    const pars: number[] = d.course?.pars || []
    Object.values(d.roster || {}).forEach((p: any) => {
      const card: number[] = d.scores?.[p.id] || []
      let total = 0, toPar = 0, holes = 0
      card.forEach((s, i) => { const v = Number(s) || 0; if (v > 0) { total += v; toPar += v - (Number(pars[i]) || 4); holes++ } })
      if (!holes) return
      const r = rows[p.id] || (rows[p.id] = { id: p.id, name: p.name, days: {}, total: 0, toPar: 0, holes: 0 })
      r.days[d.label] = total; r.total += total; r.toPar += toPar; r.holes += holes
    })
  })
  return Object.values(rows).sort((a, b) => a.toPar - b.toPar || a.name.localeCompare(b.name))
}

// ── Sample data ──────────────────────────────────────────────────────
// Fills the trip with made-up pairings, side matches and scores so the
// screens can be looked at with something in them. Uses the real players,
// teams and courses. Every day but the last is fully scored; the day
// before the last is left half-played and open; the last day is untouched.
// Everything it creates is tagged `sample` so starting over removes it.
export function sampleFillUpdates(tournament: any, library: any[] = [], seed = 7): Record<string, any> {
  const t = tournament || {}
  const total = Math.max(1, Number(t.meta?.totalDays) || 1)
  const days = DAY_LABELS.slice(0, total)
  const teams: any[] = Object.values(t.teams || {})
  const roster: Record<string, any> = t.roster || {}
  const field: string[] = teams.flatMap((tm: any) => tm.playerIds || []).filter((id: string) => roster[id])
  let x = seed
  const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296 }

  const openDay = days[Math.max(0, total - 2)]
  const out: Record<string, any> = {}
  days.forEach((day, di) => {
    const d: any = { ...dayData(t, day) }
    delete d.scores; delete d.draws
    if (!d.course) {
      const c = library.length ? library[di % library.length] : null
      if (c) d.course = { name: c.name, holes: c.holes, pars: c.pars || (c.holes || []).map((h: any) => h.par), sample: true }
      else if (t.course) d.course = t.course
    }
    const pars: number[] = d.course?.pars || Array(18).fill(4)

    // Groups of four, one player from each team where the teams allow it,
    // rotated each day so the groups differ.
    if (!d.pairings) {
      const size = 4, n = Math.ceil(field.length / size)
      const order: string[] = []
      const longest = Math.max(0, ...teams.map((tm: any) => (tm.playerIds || []).length))
      for (let k = 0; k < longest; k++) teams.forEach((tm: any, ti: number) => {
        const ids: string[] = (tm.playerIds || []).filter((id: string) => roster[id])
        if (ids.length) { const id = ids[(k + ti * di) % ids.length]; if (!order.includes(id)) order.push(id) }
      })
      field.forEach(id => { if (!order.includes(id)) order.push(id) })
      d.pairings = {}
      for (let g = 0; g < n; g++) {
        const id = `sample-g${g + 1}`
        d.pairings[id] = { id, name: `Group ${g + 1}`, teeTime: `${8 + Math.floor((g * 10) / 60)}:${String((g * 10) % 60).padStart(2, '0')}`, order: g, playerIds: order.slice(g * size, g * size + size), sample: true }
      }
    }
    const groups: any[] = Object.values(d.pairings).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

    // One match inside each of the first two groups.
    if (!d.matchups) {
      d.matchups = {}
      groups.slice(0, 2).forEach((g: any, gi: number) => {
        const [a, b] = (g.playerIds || []).map((id: string) => roster[id]?.name).filter(Boolean)
        if (!a || !b) return
        const id = `sample-m${gi + 1}`
        d.matchups[id] = { id, type: 'PvP', sideA: a, sideB: b, nassau: 10, nassauF9: 10, nassauB9: 10, nassauOverall: 10, press: 5, birdie: 0, eagle: 0, scoringType: 'NET', autoPress: true, handicapPercent: 100, sample: true }
      })
    }

    // Scores: full rounds before the open day, a round in progress on it.
    const full = di < days.indexOf(openDay)
    const inProgress = day === openDay
    if (full || inProgress) {
      d.scores = {}
      groups.forEach((g: any, gi: number) => {
        const thru = full ? 18 : Math.max(4, 13 - gi * 3)
        ;(g.playerIds || []).forEach((id: string) => {
          const hcp = Number(roster[id]?.handicap) || 0
          d.scores[id] = pars.slice(0, 18).map((par, h) => {
            if (h >= thru) return 0
            const r = rnd() + hcp / 60
            return Math.max(2, par + (r < 0.12 ? -1 : r < 0.55 ? 0 : r < 0.9 ? 1 : 2))
          })
        })
      })
    }
    out[day] = d
  })

  const live = out[openDay] || {}
  const plan: Record<string, any> = {}
  days.forEach(day => { if (day !== openDay && Object.keys(out[day]).length) plan[day] = out[day] })
  return {
    plan: Object.keys(plan).length ? plan : null,
    course: live.course ?? t.course ?? null,
    matchups: live.matchups ?? null,
    pairings: live.pairings ?? null,
    scores: live.scores ?? null,
    draws: null,
    'meta/currentDay': openDay,
    'meta/status': 'active',
    'meta/completedAt': null,
    'meta/closedDays': null,
    'meta/sampleData': true,
  }
}
