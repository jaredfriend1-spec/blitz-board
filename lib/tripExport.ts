// ─────────────────────────────────────────────────────────────────────
// WHOLE-TOURNAMENT EXPORT
//
// Builds one printable page for an entire tournament from its finished
// days in History: the final team standings and prize money, what every
// player won or lost on side matches and skins, every player's strokes,
// and then a section for each day. The page is opened in a new tab and
// printed or saved as a PDF from there.
//
// Shared logic — identical on every branch. No brand names in here.
// ─────────────────────────────────────────────────────────────────────

import { DAY_LABELS, teamDayScore, teamStandingsFromDays, tournamentPlayerStandings, type TripDay } from './plan'
import { computeRoundPayouts } from './payouts'

const esc = (v: any) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const par = (n: number) => n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`
const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n * 100) / 100).toLocaleString('en-US')}`
const day = (ms: number) => ms ? new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''

// Archived rounds → the day records the standings functions read.
export function archivesToDays(archives: any[]): (TripDay & { playedAt: number })[] {
  return [...archives]
    .sort((a, b) => ((a._meta?.dayNumber || 0) - (b._meta?.dayNumber || 0)) || (Number(a._meta?.archivedAt || a.id) - Number(b._meta?.archivedAt || b.id)))
    .map((a, i) => ({
      label: a._meta?.dayLabel || DAY_LABELS[i] || `Day ${i + 1}`,
      source: 'history' as const,
      roster: a.roster || {}, teams: a.teams || {}, money: a.money || {}, format: a.format || null,
      course: a.course || { pars: [] }, scores: a.scores || {}, draws: a.draws || {},
      matchups: a.matchups || {}, pairings: a.pairings || {},
      playedAt: Number(a._meta?.playedAt || a._meta?.archivedAt || a.id) || 0,
    }))
}

export function buildTripExportHtml(tripName: string, archives: any[]): string {
  const days = archivesToDays(archives)
  if (!days.length) return ''
  const last = days[days.length - 1]
  const teamList: any[] = Object.values(last.teams || {})
  const byPlace = last.money?.teamPayoutMode === 'places'
  const teams = teamStandingsFromDays(days, teamList, byPlace ? (last.money.placePayouts || []) : [])
  const players = tournamentPlayerStandings(days)
  const pays = days.map(d => computeRoundPayouts(d))

  // Net side-match and skins money per player, by day
  const moneyRows: Record<string, { name: string; days: Record<string, number>; total: number }> = {}
  days.forEach((d, i) => {
    Object.entries(pays[i].buckets).forEach(([name, cats]: [string, any]) => {
      const net = Object.values(cats).reduce((a: number, c: any) => a + c.won - c.lost, 0)
      if (!net) return
      const r = moneyRows[name] || (moneyRows[name] = { name, days: {}, total: 0 })
      r.days[d.label] = (r.days[d.label] || 0) + net; r.total += net
    })
  })
  const money = Object.values(moneyRows).sort((a, b) => b.total - a.total)

  const th = (cells: string[], right: number[] = []) => `<tr>${cells.map((c, i) => `<th class="${i === 0 ? 'l' : right.includes(i) ? 'r' : 'c'}">${c}</th>`).join('')}</tr>`
  const first = Math.min(...days.map(d => d.playedAt).filter(Boolean))
  const lastDate = Math.max(...days.map(d => d.playedAt))
  const dates = first && lastDate ? (day(first) === day(lastDate) ? day(first) : `${day(first)} to ${day(lastDate)}`) : ''
  const fieldSize = new Set(teamList.flatMap((tm: any) => tm.playerIds || [])).size || Object.keys(last.roster || {}).length

  // ── Summary tables ──
  const teamTable = `
    <table>
      ${th(['Team', ...teams.dayLabels, 'Total', 'To par', ...(byPlace ? ['Prize'] : [])], byPlace ? [teams.dayLabels.length + 3] : [])}
      ${teams.standings.map(r => `<tr${r.payout > 0 ? ' class="win"' : ''}>
        <td class="l"><span class="rk">${r.rank ? `${r.tied ? 'T' : ''}${r.rank}` : ''}</span><b>${esc(r.name)}</b></td>
        ${teams.dayLabels.map(d => `<td class="c">${r.days[d] ? r.days[d].total : '—'}</td>`).join('')}
        <td class="c"><b>${r.holes ? r.total : '—'}</b></td><td class="c"><b>${r.holes ? par(r.toPar) : '—'}</b></td>
        ${byPlace ? `<td class="r"><b>${r.payout > 0 ? usd(r.payout) : ''}</b></td>` : ''}
      </tr>`).join('')}
    </table>
    <p class="note">Each day's team score added together: the two lowest scores on every hole, three on par 3s.${byPlace ? ' Ties split the prize money.' : ''}</p>`

  const moneyTable = money.length ? `
    <h2>Side matches and skins</h2>
    <table>
      ${th(['Player', ...days.map(d => d.label), 'Net'], [days.length + 1])}
      ${money.map(r => `<tr>
        <td class="l"><b>${esc(r.name)}</b></td>
        ${days.map(d => `<td class="c ${!r.days[d.label] ? '' : r.days[d.label] > 0 ? 'up' : 'down'}">${r.days[d.label] ? usd(r.days[d.label]) : '—'}</td>`).join('')}
        <td class="r ${r.total > 0 ? 'up' : r.total < 0 ? 'down' : ''}"><b>${usd(r.total)}</b></td>
      </tr>`).join('')}
    </table>
    <p class="note">What each player finished up or down from side matches, presses and skins. The team prize is not included.</p>` : ''

  const playerTable = `
    <h2>Players</h2>
    <table>
      ${th(['Player', ...days.map(d => d.label), 'Total', 'To par'], [days.length + 2])}
      ${players.map((r, i) => `<tr>
        <td class="l"><span class="rk">${i + 1}</span><b>${esc(r.name)}</b></td>
        ${days.map(d => `<td class="c">${r.days[d.label] || '—'}</td>`).join('')}
        <td class="c"><b>${r.total}</b></td><td class="r"><b>${par(r.toPar)}</b></td>
      </tr>`).join('')}
    </table>
    <p class="note">Gross strokes, no handicap. Ranked by score to par over the holes played.</p>`

  // ── One section per day ──
  const daySections = days.map((d, i) => {
    const pars: number[] = d.course?.pars || []
    const coursePar = pars.reduce((a, b) => a + (Number(b) || 0), 0)
    const dayTeams = Object.values(d.teams || {}).map((tm: any) => {
      const ids: string[] = tm.playerIds || []
      const all = teamDayScore(ids, d.scores, pars)
      const front = teamDayScore(ids, Object.fromEntries(ids.map(id => [id, (d.scores[id] || []).slice(0, 9)])), pars.slice(0, 9).concat(Array(9).fill(0)))
      return { name: tm.name, f9: front.total, b9: all.total - front.total, total: all.total, toPar: all.toPar, holes: all.holes }
    }).filter(r => r.holes > 0).sort((a, b) => a.toPar - b.toPar)

    const teamOf = (pid: string) => (Object.values(d.teams || {}) as any[]).find(tm => (tm.playerIds || []).includes(pid))?.name || ''
    const dayPlayers = Object.values(d.roster || {}).map((p: any) => {
      const card: number[] = d.scores[p.id] || []
      let f9 = 0, b9 = 0, toPar = 0, holes = 0
      for (let h = 0; h < 18; h++) { const v = Number(card[h]) || 0; if (!v) continue; if (h < 9) f9 += v; else b9 += v; toPar += v - (Number(pars[h]) || 4); holes++ }
      return { name: p.name, team: teamOf(p.id), hcp: p.handicap, f9, b9, total: f9 + b9, toPar, holes }
    }).filter(r => r.holes > 0).sort((a, b) => a.toPar - b.toPar)

    const pay = pays[i]
    const matchRows = [
      ...pay.matches.map((m: any) => {
        const a = m.type === 'PvP' ? m.sideA : m.pA.map((p: any) => p.name).join(' & ') || m.sideA
        const b = m.type === 'PvP' ? m.sideB : m.pB.map((p: any) => p.name).join(' & ') || m.sideB
        const result = m.net === 0 ? 'All square' : `${esc(m.net > 0 ? a : b)} won ${usd(Math.abs(m.net))}${m.type === 'PvP' ? '' : ' a player'}`
        return `<tr><td class="l">${esc(a)} <span class="vs">v</span> ${esc(b)}</td><td class="c">${m.isGross ? 'Gross' : 'Net'}</td><td class="r"><b>${result}</b></td></tr>`
      }),
      ...pay.wheels.map((w: any) => {
        const parts = Object.entries(w.netWinnings || {}).map(([n, v]: [string, any]) => `${esc(n)} ${usd(Number(v) + Number(w.pressWinnings?.[n] || 0))}`)
        return `<tr><td class="l">Wheel</td><td class="c"></td><td class="r">${parts.join(', ')}</td></tr>`
      }),
    ]
    // No skins money in play means no skins section.
    const skinNames = pay.skins.pot <= 0 ? [] : [...Object.entries(pay.skins.gross).map(([n, c]) => `${esc(n)} ${c} (${usd(Number(c) * pay.skins.perGross)})`),
      ...Object.entries(pay.skins.net).map(([n, c]) => `${esc(n)} ${c} net (${usd(Number(c) * pay.skins.perNet)})`)]

    return `
    <section class="day">
      <h2>${esc(d.label)}<span class="sub">${esc(d.course?.name || '')}${coursePar ? `, par ${coursePar}` : ''}${d.playedAt ? ` · ${day(d.playedAt)}` : ''}</span></h2>
      <h3>Teams</h3>
      <table>
        ${th(['Team', 'Front', 'Back', 'Total', 'To par'], [4])}
        ${dayTeams.map((r, k) => `<tr><td class="l"><span class="rk">${k + 1}</span><b>${esc(r.name)}</b></td><td class="c">${r.f9 || '—'}</td><td class="c">${r.b9 || '—'}</td><td class="c"><b>${r.total}</b></td><td class="r"><b>${par(r.toPar)}</b></td></tr>`).join('')}
      </table>
      <h3>Players</h3>
      <table>
        ${th(['Player', 'Team', 'Hcp', 'Front', 'Back', 'Total', 'To par'], [6])}
        ${dayPlayers.map((r, k) => `<tr><td class="l"><span class="rk">${k + 1}</span><b>${esc(r.name)}</b></td><td class="c">${esc(r.team)}</td><td class="c">${esc(r.hcp ?? '')}</td><td class="c">${r.f9 || '—'}</td><td class="c">${r.b9 || '—'}</td><td class="c"><b>${r.total}</b>${r.holes < 18 ? ` <span class="sub2">thru ${r.holes}</span>` : ''}</td><td class="r"><b>${par(r.toPar)}</b></td></tr>`).join('')}
      </table>
      ${matchRows.length ? `<h3>Side matches</h3><table>${th(['Match', 'Scoring', 'Result'], [2])}${matchRows.join('')}</table>` : ''}
      ${skinNames.length ? `<h3>Skins</h3><p class="plain">${skinNames.join(', ')}</p>` : ''}
    </section>`
  }).join('')

  const winner = teams.standings.find(r => r.rank === 1)
  const title = esc(tripName)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — tournament results</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#17211c;margin:0;background:#f4f5f2;line-height:1.4}
  .page{max-width:820px;margin:0 auto;background:#fff;padding:36px 40px 48px}
  h1{font-size:28px;margin:0;letter-spacing:-.01em} .meta{color:#5d6b63;font-size:13px;margin:6px 0 0}
  .champ{margin:20px 0 4px;padding:14px 16px;border:1px solid #cfdcd3;background:#f0f6f2;border-radius:8px;font-size:15px}
  h2{font-size:18px;margin:30px 0 8px;padding-bottom:6px;border-bottom:2px solid #17211c}
  h2 .sub{font-size:13px;font-weight:400;color:#5d6b63;margin-left:10px} h3{font-size:13px;margin:16px 0 4px;color:#33423a}
  table{width:100%;border-collapse:collapse;font-size:13px} th{font-weight:600;color:#5d6b63;font-size:11px;padding:6px 8px;border-bottom:1px solid #cfd6d1}
  td{padding:6px 8px;border-bottom:1px solid #e6eae7} .l{text-align:left} .c{text-align:center} .r{text-align:right}
  .rk{display:inline-block;width:26px;color:#7a877f;font-size:11px} tr.win td{background:#f0f6f2}
  .up{color:#1f6b45} .down{color:#a3402f} .vs{color:#7a877f;font-size:11px;margin:0 3px} .sub2{color:#7a877f;font-size:11px;font-weight:400}
  .note{font-size:11px;color:#7a877f;margin:6px 0 0} .plain{font-size:13px;margin:4px 0}
  .day{break-before:page} .bar{max-width:820px;margin:0 auto;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#5d6b63}
  button{font:inherit;font-weight:600;background:#17211c;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}
  tr{break-inside:avoid} h2,h3{break-after:avoid}
  @media print{body{background:#fff}.bar{display:none}.page{padding:0;max-width:none}@page{margin:14mm}}
</style></head><body>
<div class="bar"><span>Use the button to print this or save it as a PDF.</span><button onclick="window.print()">Save or print PDF</button></div>
<div class="page">
  <h1>${title}</h1>
  <p class="meta">${[dates, `${days.length} day${days.length > 1 ? 's' : ''}`, fieldSize ? `${fieldSize} players` : '', teamList.length ? `${teamList.length} teams` : ''].filter(Boolean).join(' · ')}</p>
  ${winner ? `<div class="champ">Winning team: <b>${esc(teams.standings.filter(r => r.rank === 1).map(r => r.name).join(' and '))}</b>, ${winner.total} strokes (${par(winner.toPar)})${byPlace && winner.payout ? `, ${usd(winner.payout)}${winner.tied ? ' each' : ''}` : ''}</div>` : ''}
  <h2>Team standings</h2>
  ${teamTable}
  ${moneyTable}
  ${playerTable}
  ${daySections}
</div></body></html>`
}
