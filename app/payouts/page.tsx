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
  const [course, setCourse] = useState({ pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  // --- THE MATHEMATICAL ENGINE ---
  const calculateMatch = (m: any) => {
    // 1. Resolve Entities (Players or Teams)
    const pA_Ids = m.type === 'PvP' ? [players.find(p => p.name === m.sideA)?.id] : teams.find(t => t.name === m.sideA)?.playerIds;
    const pB_Ids = m.type === 'PvP' ? [players.find(p => p.name === m.sideB)?.id] : teams.find(t => t.name === m.sideB)?.playerIds;
    
    if (!pA_Ids || !pB_Ids || pA_Ids.length === 0 || pB_Ids.length === 0) return null;

    // 2. Resolve Best-Ball Gross Scores
    const sA_gross = Array(18).fill(0);
    const sB_gross = Array(18).fill(0);
    for (let i = 0; i < 18; i++) {
      const holeScoresA = pA_Ids.map((id: string) => scores[id]?.[i] || 0).filter((s: number) => s > 0);
      const holeScoresB = pB_Ids.map((id: string) => scores[id]?.[i] || 0).filter((s: number) => s > 0);
      sA_gross[i] = holeScoresA.length > 0 ? Math.min(...holeScoresA) : 0;
      sB_gross[i] = holeScoresB.length > 0 ? Math.min(...holeScoresB) : 0;
    }

    // 3. Apply 1v1 Handicaps (Adjust Side B's net score for comparison)
    const sA_net = [...sA_gross];
    const sB_net = [...sB_gross];
    if (m.type === 'PvP' && m.handicap) {
      for (let i = 0; i < 18; i++) {
        if (sB_net[i] > 0) sB_net[i] += Number(m.handicap);
      }
    }

    // 4. Calculate Gross Birdie Units (1 per Birdie, 2 per Eagle)
    let birdieUnitsA = 0; let birdieUnitsB = 0;
    for (let i = 0; i < 18; i++) {
      if (sA_gross[i] > 0 && sA_gross[i] < course.pars[i]) birdieUnitsA += (course.pars[i] - sA_gross[i]);
      if (sB_gross[i] > 0 && sB_gross[i] < course.pars[i]) birdieUnitsB += (course.pars[i] - sB_gross[i]);
    }

    // 5. Recursive Match Play Engine (Nassau + Independent Auto-Presses)
    const runNine = (start: number, end: number) => {
      let activeBets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults = [];
      let totalPresses = 0;

      for (let i = start; i <= end; i++) {
        let winner = null;
        if (sA_net[i] > 0 && sB_net[i] > 0) {
          if (sA_net[i] < sB_net[i]) winner = 'A';
          else if (sB_net[i] < sA_net[i]) winner = 'B';
          else winner = 'T';
        }
        
        let delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0;
        let newPresses = 0;
        
        if (delta !== 0) {
          activeBets.forEach(bet => {
            bet.score += delta;
            // Standard Auto-Press Logic: Triggered when tally hits ±2
            if (Math.abs(bet.score) >= 2 && !bet.pressed) {
              bet.pressed = true;
              newPresses++;
              totalPresses++;
            }
          });
          // Spin up new independent bets starting at 0
          for (let p = 0; p < newPresses; p++) {
            activeBets.push({ score: 0, pressed: false, isBase: false });
          }
        }
        holeResults.push({ winner, newPresses });
      }
      
      let payoutA = 0; let payoutB = 0;
      activeBets.forEach(bet => {
        const amt = bet.isBase ? (m.nassau || 0) : (m.press || 0);
        if (bet.score > 0) payoutA += amt;
        else if (bet.score < 0) payoutB += amt;
      });

      return { holeResults, payoutA, payoutB, totalPresses };
    }

    const f9 = runNine(0, 8);
    const b9 = runNine(9, 17);

    // 6. Final Financial Aggregation
    const birdiePayoutA = birdieUnitsA * (m.birdie || 0);
    const birdiePayoutB = birdieUnitsB * (m.birdie || 0);
    
    const totalA = f9.payoutA + b9.payoutA + birdiePayoutA;
    const totalB = f9.payoutB + b9.payoutB + birdiePayoutB;
    const net = totalA - totalB; // Positive = A wins, Negative = B wins

    return { sA_net, sB_net, f9, b9, birdieUnitsA, birdieUnitsB, birdiePayoutA, birdiePayoutB, net };
  }

  const getStyle = (s: number, p: number) => {
    if (!s) return "text-zinc-800"
    if (s < p) return "bg-emerald-500 text-black rounded-full"
    if (s > p) return "bg-zinc-800 text-zinc-500"
    return "text-emerald-400"
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2" /> HUB</Link>
      
      <div className="flex items-center gap-4 mb-12">
        <DollarSign size={40} className="text-emerald-500"/>
        <h1 className="text-5xl font-black tracking-tighter">Side Bets & Payouts</h1>
      </div>

      <div className="max-w-6xl mx-auto space-y-16">
        {matches.length === 0 && <div className="text-zinc-500 font-black bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">NO MATCHES CONFIGURED</div>}
        
        {matches.map(m => {
          const results = calculateMatch(m);
          if (!results) return null;

          return (
            <div key={m.id} className="bg-zinc-950 p-6 sm:p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl relative overflow-hidden">
              {/* STAKES HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-2 border-zinc-900 pb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black">{m.sideA} <span className="text-zinc-700 mx-2">VS</span> {m.sideB}</h2>
                  <div className="text-zinc-500 font-black text-xs mt-2 tracking-widest flex items-center gap-3">
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">NASSAU: ${m.nassau || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">PRESS: ${m.press || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">BIRDIE: ${m.birdie || 0}</span>
                    {m.type === 'PvP' && m.handicap !== 0 && <span className="bg-rose-900/20 text-rose-500 px-3 py-1 rounded-lg">HC: {m.handicap}</span>}
                  </div>
                </div>
              </div>

              {/* 18 HOLE COMPARATIVE SCORECARD */}
              <div className="overflow-x-auto mb-8 bg-black rounded-2xl border border-zinc-900">
                <table className="w-full text-center border-collapse min-w-[600px]">
                  <thead className="text-[10px] text-zinc-600 font-black bg-zinc-950">
                    <tr>
                      <th className="p-4 text-left border-r border-zinc-900 sticky left-0 bg-zinc-950 z-10">HOLE</th>
                      {Array.from({length:18}).map((_,i) => <th key={i} className={`p-2 w-8 ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}>{i+1}</th>)}
                    </tr>
                  </thead>
                  <tbody className="text-xs font-black">
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500 truncate border-r border-zinc-900 sticky left-0 bg-black z-10">{m.sideA}</td>
                      {results.sA_net.map((s: number, i: number) => <td key={i} className={`p-2 ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${getStyle(s, course.pars[i])}`}>{s || '-'}</td>)}
                    </tr>
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500 truncate border-r border-zinc-900 sticky left-0 bg-black z-10">{m.sideB}</td>
                      {results.sB_net.map((s: number, i: number) => <td key={i} className={`p-2 ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${getStyle(s, course.pars[i])}`}>{s || '-'}</td>)}
                    </tr>
                    <tr className="border-t-2 border-zinc-800 bg-zinc-900/50">
                      <td className="p-4 text-left text-zinc-500 border-r border-zinc-900 sticky left-0 bg-zinc-900/90 z-10">WINNER</td>
                      {[...results.f9.holeResults, ...results.b9.holeResults].map((h, i) => (
                        <td key={i} className={`p-2 ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${h.winner === 'A' ? 'text-emerald-500' : h.winner === 'B' ? 'text-amber-500' : 'text-zinc-600'}`}>
                          {h.winner || '-'}
                          {h.newPresses > 0 && <div className="absolute -mt-6 -ml-1 flex"><Zap size={10} className="text-yellow-500 animate-pulse"/></div>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2">FRONT 9</div>
                  <div className="text-sm font-black text-zinc-300">PRESSES: <span className="text-yellow-500">{results.f9.totalPresses}</span></div>
                  <div className="text-emerald-400 font-black mt-1">${results.f9.payoutA} <span className="text-zinc-600">to</span> ${results.f9.payoutB}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2">BACK 9</div>
                  <div className="text-sm font-black text-zinc-300">PRESSES: <span className="text-yellow-500">{results.b9.totalPresses}</span></div>
                  <div className="text-emerald-400 font-black mt-1">${results.b9.payoutA} <span className="text-zinc-600">to</span> ${results.b9.payoutB}</div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black tracking-widest mb-2"><Target size={12}/> BIRDIES</div>
                  <div className="text-sm font-black text-zinc-300">UNITS: {results.birdieUnitsA} <span className="text-zinc-600">to</span> {results.birdieUnitsB}</div>
                  <div className="text-blue-400 font-black mt-1">${results.birdiePayoutA} <span className="text-zinc-600">to</span> ${results.birdiePayoutB}</div>
                </div>
              </div>

              {/* FINAL PAYOUT BAR */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl">
                <div className="text-zinc-500 font-black mb-4 sm:mb-0">TOTAL MATCH NET</div>
                <div className="text-4xl font-black text-emerald-400">
                  {results.net > 0 ? `${m.sideB} OWES $${results.net}` : results.net < 0 ? `${m.sideA} OWES $${Math.abs(results.net)}` : 'MATCH TIED ($0)'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}