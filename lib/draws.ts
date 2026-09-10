// ─────────────────────────────────────────────────────────────────────
// DRAW SCORES
//
// When a player misses a day, they can take another player's card for that
// round. The drawn card is written into tournament/scores like any other
// score, so results, matches and team best ball all work untouched — but
// tournament/draws records where it came from, which lets skins exclude it.
//
// The card is copied exactly as shot. Everything downstream applies the
// drawn player's own handicap to it, so the round scores exactly as if they
// had played it. Nothing is fabricated.
// ─────────────────────────────────────────────────────────────────────

export type DrawEntry = { source: string; setAt?: number }
export type DrawMap = Record<string, DrawEntry>

export const normalizeDraws = (val: any): DrawMap => {
  if (!val || typeof val !== 'object') return {}
  const out: DrawMap = {}
  Object.entries(val).forEach(([pid, v]: [string, any]) => {
    if (v?.source) out[pid] = { source: v.source, setAt: v.setAt }
  })
  return out
}

export const isDrawn = (playerId: string, draws?: DrawMap | null) => !!draws?.[playerId]

// The card a drawn player should post. Returns zeros where the source has
// not been scored yet, so the mirror fills in hole by hole as play happens.
export function copyCard(sourceScores: number[], numHoles = 18): number[] {
  const out: number[] = []
  for (let h = 0; h < numHoles; h++) out.push(Number(sourceScores?.[h]) || 0)
  return out
}

// Recompute every drawn card in a round. Call whenever scores change.
export function applyDraws(
  scores: Record<string, number[]>,
  draws: DrawMap,
  numHoles = 18,
): Record<string, number[]> {
  if (!draws || !Object.keys(draws).length) return scores
  const next = { ...scores }
  Object.entries(draws).forEach(([pid, d]) => {
    if (!d?.source || d.source === pid) return
    next[pid] = copyCard(scores[d.source] || [], numHoles)
  })
  return next
}