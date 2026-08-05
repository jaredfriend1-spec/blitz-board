// ─────────────────────────────────────────────────────────────────────
// BLITZ BOARD — SHARED PAYOUT ENGINE
//
// Single source of truth for every dollar the app settles. Imported by
// app/history, app/payouts and app/master/analytics so they can never
// disagree again.
//
// Rules encoded here:
//   • Handicap %  — a matchup's own handicapPercent wins; if it doesn't
//                   set one, fall back to the round's money.handicapPercent.
//                   Strokes are a property of the individual bet.
//   • Nassau      — three bets: front nine, back nine, and an overall bet
//                   decided by holes won across the round.
//   • Presses     — when autoPress is on, a bet that goes 2 up spawns a new
//                   bet worth `press`, which runs to the end of that nine.
//   • Skins       — a field-wide pot. Splits into gross and net pools by
//                   skinsSplitGross / skinsSplitNet. Net skins use the
//                   ROUND's handicap %, not any matchup's.
//   • Wheel       — round-robin pairs; straight or nassau format, both with
//                   press support (mirrors app/payouts).
// ─────────────────────────────────────────────────────────────────────

export type Player = { id: string; name: string; handicap?: number }

export type RoundCtx = {
  players: Player[]
  scores: Record<string, number[]>
  courseHoles: any[]
  pars: number[]
  money: any
  teams: any[]
  holeOffset: number
  numHoles: number
}

// ── Stroke allocation ────────────────────────────────────────────────
// GHIN method: apply the handicap % BEFORE working out strokes.
export function getStrokes(
  playerHcp: number, holeIdx: number, baseHcp: number,
  pct: number, isGross: boolean, courseHoles: any[],
): number {
  if (isGross) return 0
  const adj = Math.round(playerHcp * (pct / 100))
  const adjBase = Math.round(baseHcp * (pct / 100))
  const rating = Number(courseHoles?.[holeIdx]?.hcp) || (holeIdx + 1)
  const diff = Math.max(0, adj - adjBase)
  let s = Math.floor(diff / 18)
  if (rating <= (diff % 18)) s++
  return s
}

// ── One nine of match play, with auto-press ──────────────────────────
export function runNine(
  scA: number[], scB: number[], start: number, end: number,
  nassau: number, press: number, autoPress: boolean,
) {
  const bets = [{ score: 0, pressed: false, isBase: true }]
  const holeWinners: string[] = []
  const pressHoles: number[] = []
  let totalPresses = 0

  for (let i = start; i <= end; i++) {
    const sa = scA[i], sb = scB[i]
    let winner = '·'
    if (sa > 0 && sb > 0) winner = sa < sb ? 'A' : sb < sa ? 'B' : '½'
    holeWinners.push(winner)
    const delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0
    if (delta !== 0) {
      let newPresses = 0
      bets.forEach(b => {
        b.score += delta
        if (autoPress && Math.abs(b.score) >= 2 && !b.pressed) {
          b.pressed = true; newPresses++; totalPresses++
          pressHoles.push(i - start)
        }
      })
      for (let k = 0; k < newPresses; k++) bets.push({ score: 0, pressed: false, isBase: false })
    }
  }

  // Base and press money kept apart so analytics can bucket them.
  let baseNet = 0, pressNet = 0
  bets.forEach(b => {
    const amt = b.isBase ? nassau : press
    if (b.score > 0) { if (b.isBase) baseNet += amt; else pressNet += amt }
    else if (b.score < 0) { if (b.isBase) baseNet -= amt; else pressNet -= amt }
  })

  const net = baseNet + pressNet
  return {
    baseNet, pressNet, net,
    payA: net > 0 ? net : 0,
    payB: net < 0 ? -net : 0,
    holeWinners, totalPresses, pressHoles,
  }
}

// ── Effective handicap % for a given bet ─────────────────────────────
export function betHandicapPercent(matchup: any, money: any): number {
  const own = matchup?.handicapPercent
  if (own !== undefined && own !== null && own !== '') return Number(own)
  return Number(money?.handicapPercent ?? 100)
}

// ── Settle a PvP / 2v2 / team match ──────────────────────────────────
export function settleMatch(m: any, ctx: RoundCtx) {
  const { players, scores, courseHoles, pars, money, teams, holeOffset, numHoles } = ctx
  const type = m.type || 'PvP'
  const isGross = m.scoringType === 'GROSS'
  const pct = betHandicapPercent(m, money)

  let pA: Player[] = [], pB: Player[] = []
  if (type === 'PvP') {
    pA = players.filter(p => p.name === m.sideA)
    pB = players.filter(p => p.name === m.sideB)
  } else if (type === '2v2') {
    pA = players.filter(p => p.name === m.sideA || p.name === m.sideA2)
    pB = players.filter(p => p.name === m.sideB || p.name === m.sideB2)
  } else {
    const ta = teams.find((t: any) => t.name === m.sideA)?.playerIds || []
    const tb = teams.find((t: any) => t.name === m.sideB)?.playerIds || []
    pA = players.filter(p => ta.includes(p.id))
    pB = players.filter(p => tb.includes(p.id))
  }
  if (!pA.length || !pB.length) return null

  const allH = isGross ? [0] : [...pA, ...pB].map(p => Number(p.handicap) || 0)
  const baseHcp = Math.min(...allH)

  const bestBall = (list: Player[]) => Array.from({ length: numHoles }, (_, i) => {
    const vals = list.map(p => {
      const g = Number(scores[p.id]?.[holeOffset + i]) || 0
      return g > 0 ? g - getStrokes(Number(p.handicap) || 0, holeOffset + i, baseHcp, pct, isGross, courseHoles) : 0
    }).filter(Boolean)
    return vals.length ? Math.min(...vals) : 0
  })
  const sA = bestBall(pA), sB = bestBall(pB)

  const nassau = Number(m.nassau) || 5
  // A Nassau is three bets. Today they share one amount; nassauF9 /
  // nassauB9 / nassauOverall let each leg carry its own stake later
  // without touching this engine again.
  const nF9 = Number(m.nassauF9 ?? nassau)
  const nB9 = Number(m.nassauB9 ?? nassau)
  // `overall` is the legacy Quick Match field for the overall stake. Honour it
  // so existing quick matches keep paying what they were set up to pay.
  const nOverall = Number(m.nassauOverall ?? m.overall ?? nassau)
  const press = Number(m.press) || 5
  const autoPress = m.autoPress !== false && (type === 'PvP' || type === '2v2')

  const nines: [number, number][] = numHoles > 9 ? [[0, 8], [9, 17]] : [[0, numHoles - 1]]
  const legAmts = numHoles > 9 ? [nF9, nB9] : [nF9]
  const legs = nines.map(([f, t], li) => runNine(sA, sB, f, t, legAmts[li], press, autoPress))
  const baseNet = legs.reduce((s, l) => s + l.baseNet, 0)
  const pressNet = legs.reduce((s, l) => s + l.pressNet, 0)

  let aW = 0, bW = 0
  for (let i = 0; i < numHoles; i++) {
    if (sA[i] > 0 && sB[i] > 0) { if (sA[i] < sB[i]) aW++; else if (sB[i] < sA[i]) bW++ }
  }
  const overallNet = aW > bW ? nOverall : bW > aW ? -nOverall : 0

  const bonusFor = (list: Player[]) => Array.from({ length: numHoles }, (_, i) => {
    const par = pars[holeOffset + i] || 4
    const raw = list.map(p => Number(scores[p.id]?.[holeOffset + i]) || 99).filter(s => s < 99)
    if (!raw.length) return 0
    const g = Math.min(...raw)
    return g < par ? (g <= par - 2 ? Number(m.eagle || 0) : Number(m.birdie || 0)) : 0
  }).reduce((x, y) => x + y, 0)
  const bonusNet = bonusFor(pA) - bonusFor(pB)

  const net = baseNet + overallNet + pressNet + bonusNet
  return {
    id: m.id, type, sideA: m.sideA, sideB: m.sideB, pA, pB, sA, sB,
    handicapPercent: pct, isGross,
    baseNet: baseNet + overallNet,   // nassau legs + overall
    pressNet, bonusNet, net,
    f9: legs[0], b9: legs[1] || null,
    overallNet, aWins18: aW, bWins18: bW,
    nassauF9: nF9, nassauB9: nB9, nassauOverall: nOverall,
    winner: net > 0 ? 'A' : net < 0 ? 'B' : 'TIE',
    nassau, press, autoPress,
  }
}

// ── Settle a wheel (mirrors app/payouts) ─────────────────────────────
export function settleWheel(m: any, ctx: RoundCtx) {
  const { players, scores, courseHoles, money, holeOffset, numHoles } = ctx
  const names: string[] = m.wheelPlayers || []
  const resolved = names.map(n => players.find(p => p.name === n)).filter(Boolean) as Player[]
  if (resolved.length < 2) return null

  const isGross = m.scoringType === 'GROSS'
  const pct = betHandicapPercent(m, money)
  const amount = Number(m.wheelAmount) || 10
  const format = m.wheelFormat || 'straight'
  const nasF9 = Number(m.wheelNassauF9 ?? 5)
  const nasB9 = Number(m.wheelNassauB9 ?? 5)
  const nasOverall = Number(m.wheelNassauOverall ?? 10)
  const wPress = Number(m.wheelPress ?? 5)
  const wAuto = m.wheelAutoPress !== false

  const baseHcp = isGross ? 0 : Math.min(...resolved.map(p => Number(p.handicap) || 0))
  const netOf = (p: Player) => Array.from({ length: numHoles }, (_, i) => {
    const g = Number(scores[p.id]?.[holeOffset + i]) || 0
    return g > 0 ? g - getStrokes(Number(p.handicap) || 0, holeOffset + i, baseHcp, pct, isGross, courseHoles) : 0
  })
  const nets = resolved.map(netOf)

  const netWinnings: Record<string, number> = {}
  const pressWinnings: Record<string, number> = {}
  resolved.forEach(p => { netWinnings[p.name] = 0; pressWinnings[p.name] = 0 })
  const pairs: any[] = []

  for (let x = 0; x < resolved.length; x++) {
    for (let y = x + 1; y < resolved.length; y++) {
      const a = resolved[x].name, b = resolved[y].name
      const scA = nets[x], scB = nets[y]
      let pairNet = 0, pairPress = 0

      if (format === 'nassau') {
        const f9 = runNine(scA, scB, 0, 8, nasF9, wPress, wAuto)
        const b9 = runNine(scA, scB, 9, 17, nasB9, wPress, wAuto)
        let aT = 0, bT = 0
        for (let i = 0; i < numHoles; i++) {
          if (scA[i] > 0 && scB[i] > 0) { if (scA[i] < scB[i]) aT++; else if (scB[i] < scA[i]) bT++ }
        }
        const totalPay = aT > bT ? nasOverall : bT > aT ? -nasOverall : 0
        pairNet = f9.baseNet + b9.baseNet + totalPay
        pairPress = f9.pressNet + b9.pressNet
      } else {
        const played = scA.filter((s, i) => s > 0 && scB[i] > 0).length || numHoles
        const r = runNine(scA, scB, 0, played - 1, amount, wPress, wAuto)
        pairNet = r.baseNet
        pairPress = r.pressNet
      }

      netWinnings[a] += pairNet; netWinnings[b] -= pairNet
      pressWinnings[a] += pairPress; pressWinnings[b] -= pairPress
      pairs.push({ playerA: a, playerB: b, net: pairNet, press: pairPress, format })
    }
  }
  return { id: m.id, type: 'Wheel', format, players: resolved, netWinnings, pressWinnings, pairs }
}

// ── Skins: gross and net pools ───────────────────────────────────────
export function computeSkins(ctx: RoundCtx) {
  const { players, scores, courseHoles, money, holeOffset, numHoles } = ctx
  const alloc = Number(money?.skinsAllocation) || 0
  const netOn = !!money?.netSkinsEnabled
  const splitG = Number(money?.skinsSplitGross ?? 100)
  const splitN = Number(money?.skinsSplitNet ?? 0)
  const pct = Number(money?.handicapPercent ?? 100)   // round-level for skins

  const gross: Record<string, number> = {}
  const net: Record<string, number> = {}

  for (let h = 0; h < numHoles; h++) {
    const idx = holeOffset + h
    const vals = players
      .map(p => ({ name: p.name, s: Number(scores[p.id]?.[idx]) || 0 }))
      .filter(v => v.s > 0)
    if (!vals.length) continue
    const lo = Math.min(...vals.map(v => v.s))
    const w = vals.filter(v => v.s === lo)
    if (w.length === 1) gross[w[0].name] = (gross[w[0].name] || 0) + 1
  }

  if (netOn) {
    const adj: Record<string, number> = {}
    players.forEach(p => { adj[p.name] = Math.round((Number(p.handicap) || 0) * (pct / 100)) })
    const base = Math.min(...Object.values(adj))
    for (let h = 0; h < numHoles; h++) {
      const idx = holeOffset + h
      const rating = Number(courseHoles?.[idx]?.hcp) || (idx + 1)
      const vals = players.map(p => {
        const g = Number(scores[p.id]?.[idx]) || 0
        if (!g) return null
        const diff = Math.max(0, adj[p.name] - base)
        let st = Math.floor(diff / 18)
        if (rating <= (diff % 18)) st++
        return { name: p.name, n: g - st }
      }).filter(Boolean) as any[]
      if (!vals.length) continue
      const lo = Math.min(...vals.map(v => v.n))
      const w = vals.filter(v => v.n === lo)
      if (w.length === 1) net[w[0].name] = (net[w[0].name] || 0) + 1
    }
  }

  const pot = alloc * players.length
  const grossPot = netOn ? pot * (splitG / 100) : pot
  const netPot = netOn ? pot * (splitN / 100) : 0
  const tg = Object.values(gross).reduce((a, b) => a + b, 0)
  const tn = Object.values(net).reduce((a, b) => a + b, 0)

  return {
    gross, net, pot, grossPot, netPot,
    totalGross: tg, totalNet: tn,
    perGross: tg ? grossPot / tg : 0,
    perNet: tn ? netPot / tn : 0,
    buyIn: alloc,
  }
}

// ── Everything for one archived round ────────────────────────────────
export function buildCtx(arch: any): RoundCtx {
  const roster = arch?.roster ? Object.values(arch.roster) as Player[] : []
  const pars: number[] = arch?.course?.pars || []
  const nineHole = !!arch?.course?.nineHole
  return {
    players: roster,
    scores: arch?.scores || {},
    courseHoles: arch?.course?.holes || [],
    pars,
    money: arch?.money || {},
    teams: arch?.teams ? Object.values(arch.teams) : [],
    holeOffset: nineHole && arch?.course?.startingNine === 'back' ? 9 : 0,
    numHoles: nineHole ? 9 : (pars.length || 18),
  }
}

export type BetBuckets = Record<string, { won: number; lost: number }>

export function computeRoundPayouts(arch: any) {
  const ctx = buildCtx(arch)
  const matchups: any[] = arch?.matchups ? Object.values(arch.matchups) : []
  const skins = computeSkins(ctx)

  const buckets: Record<string, BetBuckets> = {}
  const buyIns: Record<string, number> = {}
  const add = (name: string, cat: string, amt: number) => {
    if (!amt) return
    if (!buckets[name]) buckets[name] = {}
    if (!buckets[name][cat]) buckets[name][cat] = { won: 0, lost: 0 }
    if (amt > 0) buckets[name][cat].won += amt
    else buckets[name][cat].lost += -amt
  }

  ctx.players.forEach(p => { buyIns[p.name] = (buyIns[p.name] || 0) + skins.buyIn })
  Object.entries(skins.gross).forEach(([n, c]) => add(n, 'skinsGross', c * skins.perGross))
  Object.entries(skins.net).forEach(([n, c]) => add(n, 'skinsNet', c * skins.perNet))

  const matches: any[] = []
  const wheels: any[] = []
  matchups.forEach(m => {
    if ((m.type || 'PvP') === 'Wheel') {
      const w = settleWheel(m, ctx)
      if (!w) return
      wheels.push(w)
      Object.entries(w.netWinnings).forEach(([n, v]) => add(n, 'wheel', v as number))
      Object.entries(w.pressWinnings).forEach(([n, v]) => add(n, 'press', v as number))
      return
    }
    const r = settleMatch(m, ctx)
    if (!r) return
    matches.push(r)
    const cat = r.type === 'PvP' ? 'pvp' : r.type === '2v2' ? 'twoV2' : 'team'
    r.pA.forEach(p => {
      add(p.name, cat, r.baseNet); add(p.name, 'press', r.pressNet); add(p.name, 'bonus', r.bonusNet)
    })
    r.pB.forEach(p => {
      add(p.name, cat, -r.baseNet); add(p.name, 'press', -r.pressNet); add(p.name, 'bonus', -r.bonusNet)
    })
  })

  return { ctx, skins, matches, wheels, buckets, buyIns }
}

export const BET_CATEGORIES: { key: string; label: string; kind: 'pot' | 'h2h' }[] = [
  { key: 'skinsGross', label: 'Gross Skins', kind: 'pot' },
  { key: 'skinsNet', label: 'Net Skins', kind: 'pot' },
  { key: 'pvp', label: '1v1 Matches', kind: 'h2h' },
  { key: 'twoV2', label: '2v2 Matches', kind: 'h2h' },
  { key: 'team', label: 'Team Matches', kind: 'h2h' },
  { key: 'press', label: 'Presses', kind: 'h2h' },
  { key: 'bonus', label: 'Birdies/Eagles', kind: 'h2h' },
  { key: 'wheel', label: 'Wheel', kind: 'h2h' },
]