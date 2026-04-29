"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Zap, DollarSign, Target } from 'lucide-react'
import Link from 'next/link'

export default function PayoutsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [course, setCourse] = useState<any>({ 
    pars: Array(18).fill(4), 
    holes: Array.from({length: 18}, (_, i) => ({ par: 4, hcp: i + 1 })) 
  })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  const calculateMatch = (m: any) => {
    const pA = m.type === 'PvP' ? players.filter(p => p.name === m.sideA) : players.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id));
    const pB = m.type === 'PvP' ? players.filter(p => p.name === m.sideB) : players.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id));
    
    if (pA.length === 0 || pB.length === 0) return null;

    const isGross = m.scoringType === 'GROSS';
    const allHcps = isGross ? [0] : [...pA, ...pB].map(p => Number(p.handicap) || 0);
    const baseHcp = Math.min(...allHcps);

    const getStrokes = (playerHcp: number, holeIdx: number) => {
      if (isGross) return 0;
      const hcpRating = Number(course.holes?.[holeIdx]?.hcp) || (holeIdx + 1);
      const diff = Math.max(0, playerHcp - baseHcp);
      let s = Math.floor(diff / 18);
      if (hcpRating <= (diff % 18)) s += 1;
      return s;
    };

    const sA_final = Array(18).fill(0); const sB_final = Array(18).fill(0);
    const sA_dots = Array(18).fill(0); const sB_dots = Array(18).fill(0);
    let birdieA = 0; let birdieB = 0;

    for (let i = 0; i < 18; i++) {
      const par = course.pars[i] || 4;
      const netsA = pA.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);
      const netsB = pB.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);

      if (m.type === 'PvP') {
        if (netsA.length > 0) sA_final[i] = Math.min(...netsA.map(x => x.net));
        if (netsB.length > 0) sB_final[i] = Math.min(...netsB.map(x => x.net));
        const bgA = netsA.length > 0 ? Math.min(...netsA.map(x => x.gross)) : 0;
        const bgB = netsB.length > 0 ? Math.min(...netsB.map(x => x.gross)) : 0;
        if (bgA > 0 && bgA < par) birdieA += bgA <= par - 2 ? (Number(m.eagle) || (Number(m.birdie) * 2)) : Number(m.birdie || 0);
        if (bgB > 0 && bgB < par) birdieB += bgB <= par - 2 ? (Number(m.eagle) || (Number(m.birdie) * 2)) : Number(m.birdie || 0);
      } else {
        const count = par === 3 ? 3 : 2;
        if (netsA.length >= count) sA_final[i] = netsA.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        if (netsB.length >= count) sB_final[i] = netsB.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        const bgA = netsA.length > 0 ? Math.min(...netsA.map(x => x.gross)) : 0;
        const bgB = netsB.length > 0 ? Math.min(...netsB.map(x => x.gross)) : 0;
        if (bgA > 0 && bgA < par) birdieA += Number(m.birdie || 0);
        if (bgB > 0 && bgB < par) birdieB += Number(m.birdie || 0);
      }
      sA_dots[i] = Math.max(...pA.map(p => getStrokes(Number(p.handicap)||0, i)));
      sB_dots[i] = Math.max(...pB.map(p => getStrokes(Number(p.handicap)||0, i)));
    }

    const runNine = (start: number, end: number) => {
      let bets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults: any[] = []; let totalP = 0;
      for (let i = start; i <= end; i++) {
        let winner = null; let newP = 0;
        if (sA_final[i] > 0 && sB_final[i] > 0) {
          if (sA_final[i] < sB_final[i]) winner = 'A';
          else if (sB_final[i] < sA_final[i]) winner = 'B';
          else winner = 'T';
        }
        let delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0;
        if (delta !== 0) {
          bets.forEach(b => {
            b.score += delta;
            if (m.type === 'PvP' && Math.abs(b.score) >= 2 && !b.pressed) { b.pressed = true; newP++; totalP++; }
          });
          if (m.type === 'PvP') {
            for (let p = 0; p < newP; p++) bets.push({ score: 0, pressed: false, isBase: false });
          }
        }
        holeResults.push({ winner, newP });
      }
      let payA = 0; let payB = 0;
      bets.forEach(b => {
        const amt = b.isBase ? Number(m.nassau || 0) : Number(m.press || 0);
        if (b.score > 0) payA += amt; else if (b.score < 0) payB += amt;
      });
      return { holeResults, payoutA: payA, payoutB: payB, totalPresses: totalP };
    }

    const f9 = runNine(0, 8); const b9 = runNine(9, 17);
    const strokesA = Math.max(...pA.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    const strokesB = Math.max(...pB.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    
    const totalA = Number(f9.payoutA) + Number(b9.payoutA) + Number(birdieA);
    const totalB = Number(f9.payoutB) + Number(b9.payoutB) + Number(birdieB);
    const net = totalA - totalB;

    return { sA_net: sA_final, sB_net: sB_final, sA_dots, sB_dots, strokesA, strokesB, f9, b9, birdieA, birdieB, net };
  }

  const renderDots = (count: number) => {
    if (!count || count <= 0) return null;
    return (
      <div className="flex justify-center mt-1 gap-[3px]">
        {Array.from({length: Math.min(count, 3)}).map((_, idx) => (
          <div key={idx} className="w-2 h-2 bg-yellow-400 rounded-full"/>
        ))}
      </div>
    );
  }

  // Split holes into front 9 and back 9 for two-row display
  const renderScorecardNine = (res: any, m: any, start: number, label: string) => {
    const holes = Array.from({length: 9}, (_, i) => start + i);
    const holeResults = start === 0 ? res.f9.holeResults : res.b9.holeResults;
    return (
      <div className="mb-4">
        <div className="text-[10px] font-black text-zinc-600 tracking-widest mb-2 px-1">{label}</div>
        <div className="bg-black rounded-2xl border border-zinc-900 overflow-hidden">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-zinc-950">
                <th className="py-3 px-4 text-left text-xs text-zinc-600 font-black w-28">PLAYER</th>
                {holes.map(i => (
                  <th key={i} className="py-3 px-1 text-sm text-zinc-500 font-black w-10">{i + 1}</th>
                ))}
                <th className="py-3 px-3 text-sm text-zinc-500 font-black">TOT</th>
              </tr>
            </thead>
            <tbody>
              {/* Side A scores */}
              <tr className="border-t border-zinc-900">
                <td className="py-4 px-4 text-left text-emerald-400 font-black text-sm truncate max-w-[7rem]">{m.sideA}</td>
                {holes.map(i => (
                  <td key={i} className="py-3 px-1">
                    <div className="text-base font-black text-white">{res.sA_net[i] || <span className="text-zinc-700">—</span>}</div>
                    {renderDots(res.sA_dots[i])}
                  </td>
                ))}
                <td className="py-3 px-3 font-black text-emerald-400 text-base">
                  {holes.reduce((acc, i) => acc + (res.sA_net[i] || 0), 0) || '—'}
                </td>
              </tr>
              {/* Side B scores */}
              <tr className="border-t border-zinc-900 bg-white/[0.02]">
                <td className="py-4 px-4 text-left text-blue-400 font-black text-sm truncate max-w-[7rem]">{m.sideB}</td>
                {holes.map(i => (
                  <td key={i} className="py-3 px-1">
                    <div className="text-base font-black text-white">{res.sB_net[i] || <span className="text-zinc-700">—</span>}</div>
                    {renderDots(res.sB_dots[i])}
                  </td>
                ))}
                <td className="py-3 px-3 font-black text-blue-400 text-base">
                  {holes.reduce((acc, i) => acc + (res.sB_net[i] || 0), 0) || '—'}
                </td>
              </tr>
              {/* Winner row */}
              <tr className="border-t-2 border-zinc-800 bg-zinc-900/60">
                <td className="py-3 px-4 text-left text-zinc-600 font-black text-xs">HOLE WIN</td>
                {holeResults.map((h: any, idx: number) => (
                  <td key={idx} className="py-3 px-1 relative">
                    <span className={`text-sm font-black ${
                      h.winner === 'A' ? 'text-emerald-400' : 
                      h.winner === 'B' ? 'text-blue-400' : 
                      h.winner === 'T' ? 'text-zinc-500' : 'text-zinc-800'
                    }`}>
                      {h.winner === 'T' ? '½' : h.winner || '·'}
                    </span>
                    {h.newP > 0 && (
                      <div className="absolute -top-0.5 -right-0.5">
                        <Zap size={10} className="text-yellow-400"/>
                      </div>
                    )}
                  </td>
                ))}
                <td/>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block">
        <ArrowLeft size={18} className="inline mr-2" /> HUB
      </Link>
      <div className="flex items-center gap-4 mb-12">
        <DollarSign size={40} className="text-emerald-500"/>
        <h1 className="text-5xl font-black tracking-tighter">Match Payouts</h1>
      </div>

      <div className="max-w-4xl mx-auto space-y-16">
        {matches.map(m => {
          const res = calculateMatch(m);
          if (!res) return null;
          return (
            <div key={m.id} className="bg-zinc-950 rounded-[3rem] border-2 border-zinc-800 shadow-2xl overflow-hidden">
              
              {/* Match header */}
              <div className="p-6 sm:p-8 border-b-2 border-zinc-900">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black">
                      <span className="text-emerald-400">{m.sideA}</span>
                      <span className="text-zinc-600 mx-3 text-xl">VS</span>
                      <span className="text-blue-400">{m.sideB}</span>
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${
                        m.scoringType === 'GROSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>{m.scoringType || 'NET'}</span>
                      {res.strokesA > 0 && <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-black">{m.sideA} +{res.strokesA}</span>}
                      {res.strokesB > 0 && <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-black">{m.sideB} +{res.strokesB}</span>}
                      <span className="bg-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black text-zinc-400">Nassau ${m.nassau}</span>
                      {m.type === 'PvP' && <span className="bg-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black text-yellow-500">Press ${m.press}</span>}
                      <span className="bg-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black text-blue-400">Bird/Eagle ${m.birdie}/${m.eagle||(m.birdie*2)||0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scorecards — front 9 and back 9 separately */}
              <div className="p-4 sm:p-8">
                {renderScorecardNine(res, m, 0, 'FRONT 9')}
                {renderScorecardNine(res, m, 9, 'BACK 9')}
              </div>

              {/* Payout summary */}
              <div className="px-4 sm:px-8 pb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-3">
                    Front 9 {res.f9.totalPresses > 0 ? `(${res.f9.totalPresses}×Press)` : ''}
                  </div>
                  <div className="text-lg font-black">
                    <span className="text-emerald-400">${res.f9.payoutA}</span>
                    <span className="text-zinc-700 mx-2">to</span>
                    <span className="text-blue-400">${res.f9.payoutB}</span>
                  </div>
                </div>
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-3">
                    Back 9 {res.b9.totalPresses > 0 ? `(${res.b9.totalPresses}×Press)` : ''}
                  </div>
                  <div className="text-lg font-black">
                    <span className="text-emerald-400">${res.b9.payoutA}</span>
                    <span className="text-zinc-700 mx-2">to</span>
                    <span className="text-blue-400">${res.b9.payoutB}</span>
                  </div>
                </div>
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-black uppercase tracking-widest mb-3">
                    <Target size={12}/> Birdie Pool
                  </div>
                  <div className="text-lg font-black">
                    <span className="text-emerald-400">${res.birdieA}</span>
                    <span className="text-zinc-700 mx-2">to</span>
                    <span className="text-blue-400">${res.birdieB}</span>
                  </div>
                </div>
              </div>

              {/* Net result */}
              <div className="mx-4 sm:mx-8 mb-8 flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-6 sm:p-8 rounded-3xl gap-4">
                <div className="text-zinc-500 font-black text-xs tracking-widest">MATCH NET</div>
                <div className="text-4xl sm:text-5xl font-black">
                  {res.net > 0 
                    ? <span className="text-emerald-400">{m.sideB} OWES ${res.net}</span> 
                    : res.net < 0 
                    ? <span className="text-blue-400">{m.sideA} OWES ${Math.abs(res.net)}</span> 
                    : <span className="text-zinc-500">EVEN</span>
                  }
                </div>
              </div>

            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="text-center py-24 text-zinc-700 font-black">
            <DollarSign size={48} className="mx-auto mb-4 opacity-20"/>
            <p>NO MATCHES CONFIGURED</p>
            <p className="text-xs mt-2 tracking-widest">SET UP MATCHUPS IN SETUP CENTER</p>
          </div>
        )}
      </div>
    </div>
  )
}