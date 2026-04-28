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
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4), holes: Array(18).fill({par: 4, hcp: 1}) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => {
      if(snap.val()) setCourse({ pars: snap.val().pars || Array(18).fill(4), holes: snap.val().holes || Array(18).fill({par: 4, hcp: 1}) })
    })
  }, [])

  const calculateMatch = (m: any) => {
    // 1. Resolve Players
    const pA = m.type === 'PvP' ? players.filter(p => p.name === m.sideA) : players.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id));
    const pB = m.type === 'PvP' ? players.filter(p => p.name === m.sideB) : players.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id));
    
    if (pA.length === 0 || pB.length === 0) return null;

    // 2. Stroke Allocation
    const allHcps = [...pA, ...pB].map(p => Number(p.handicap) || 0);
    const baseHcp = Math.min(...allHcps);

    const getStrokes = (playerHcp: number, holeIndex: number) => {
      const holeHcpRating = course.holes[holeIndex]?.hcp || 1;
      const diff = Math.max(0, playerHcp - baseHcp);
      let strokes = Math.floor(diff / 18);
      if (holeHcpRating <= (diff % 18)) strokes += 1;
      return strokes;
    };

    const sA_gross = Array(18).fill(0); const sA_net = Array(18).fill(0); const sA_dots = Array(18).fill(0);
    const sB_gross = Array(18).fill(0); const sB_net = Array(18).fill(0); const sB_dots = Array(18).fill(0);
    let birdiePayoutA = 0; let birdiePayoutB = 0;
    
    // Calculate total strokes given for the UI header
    let totalStrokesA = Math.max(...pA.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    let totalStrokesB = Math.max(...pB.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));

    for (let i = 0; i < 18; i++) {
      // Team A
      sA_dots[i] = Math.max(...pA.map(p => getStrokes(Number(p.handicap)||0, i)));
      const scoresA = pA.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0);
      sA_gross[i] = scoresA.length > 0 ? Math.min(...scoresA.map(x => x.gross)) : 0;
      sA_net[i] = scoresA.length > 0 ? Math.min(...scoresA.map(x => x.net)) : 0;

      // Team B
      sB_dots[i] = Math.max(...pB.map(p => getStrokes(Number(p.handicap)||0, i)));
      const scoresB = pB.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0);
      sB_gross[i] = scoresB.length > 0 ? Math.min(...scoresB.map(x => x.gross)) : 0;
      sB_net[i] = scoresB.length > 0 ? Math.min(...scoresB.map(x => x.net)) : 0;

      // Birdie / Eagle Units (Gross)
      const par = course.pars[i];
      const eagleVal = m.eagle || (m.birdie * 2) || 0;
      if (sA_gross[i] > 0 && sA_gross[i] < par) birdiePayoutA += sA_gross[i] <= par - 2 ? eagleVal : (m.birdie || 0);
      if (sB_gross[i] > 0 && sB_gross[i] < par) birdiePayoutB += sB_gross[i] <= par - 2 ? eagleVal : (m.birdie || 0);
    }

    // 3. Match Play Engine
    const runNine = (start: number, end: number) => {
      let activeBets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults = []; let totalPresses = 0;

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
            if (Math.abs(bet.score) >= 2 && !bet.pressed) {
              bet.pressed = true; newPresses++; totalPresses++;
            }
          });
          for (let p = 0; p < newPresses; p++) activeBets.push({ score: 0, pressed: false, isBase: false });
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
    const net = (f9.payoutA + b9.payoutA + birdiePayoutA) - (f9.payoutB + b9.payoutB + birdiePayoutB);

    return { sA_net, sB_net, sA_dots, sB_dots, totalStrokesA, totalStrokesB, f9, b9, birdiePayoutA, birdiePayoutB, net };
  }

  // Helper to render the golf stroke dots
  const renderDots = (count: number) => {
    if (!count || count <= 0) return null;
    return (
      <div className="flex justify-center -mt-1 gap-[2px]">
        {Array.from({length: Math.min(count, 3)}).map((_, idx) => (
          <div key={idx} className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2" /> HUB</Link>
      
      <div className="flex items-center gap-4 mb-12">
        <DollarSign size={40} className="text-emerald-500"/>
        <h1 className="text-5xl font-black tracking-tighter">Side Bets & Payouts</h1>
      </div>

      <div className="max-w-7xl mx-auto space-y-16">
        {matches.length === 0 && <div className="text-zinc-500 font-black bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">NO MATCHES CONFIGURED</div>}
        
        {matches.map(m => {
          const results = calculateMatch(m);
          if (!results) return null;

          return (
            <div key={m.id} className="bg-zinc-950 p-6 sm:p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-2 border-zinc-900 pb-8 gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-black text-white">{m.sideA} <span className="text-zinc-700 mx-2">VS</span> {m.sideB}</h2>
                  </div>
                  
                  {/* NEW: Stroke Advantage Callout */}
                  <div className="mt-3 flex gap-2">
                    {results.totalStrokesA > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideA} GETS {results.totalStrokesA} STROKES</span>}
                    {results.totalStrokesB > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideB} GETS {results.totalStrokesB} STROKES</span>}
                    {results.totalStrokesA === 0 && results.totalStrokesB === 0 && <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-lg text-xs font-black">PLAYING SCRATCH (EVEN)</span>}
                  </div>

                  <div className="text-zinc-500 font-black text-xs mt-3 tracking-widest flex items-center gap-3">
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">NASSAU: ${m.nassau || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">PRESS: ${m.press || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">BIRDIE/EAGLE: ${m.birdie||0}/${m.eagle||(m.birdie*2)||0}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto mb-8 bg-black rounded-2xl border border-zinc-900">
                <table className="w-full text-center border-collapse min-w-[700px]">
                  <thead className="text-[10px] text-zinc-600 font-black bg-zinc-950">
                    <tr>
                      <th className="p-4 text-left border-r border-zinc-900">HOLE (NET)</th>
                      {Array.from({length:18}).map((_,i) => <th key={i} className={`p-2 w-8 ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}>{i+1}</th>)}
                    </tr>
                  </thead>
                  <tbody className="text-xs font-black">
                    {/* SIDE A ROW */}
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500 truncate border-r border-zinc-900">{m.sideA}</td>
                      {results.sA_net.map((s: number, i: number) => (
                        <td key={i} className={`p-2 relative ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${!s ? 'text-zinc-800' : s < course.pars[i] ? 'text-rose-500' : 'text-zinc-300'}`}>
                          <div>{s || '-'}</div>
                          {renderDots(results.sA_dots[i])}
                        </td>
                      ))}
                    </tr>
                    
                    {/* SIDE B ROW */}
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-blue-500 truncate border-r border-zinc-900">{m.sideB}</td>
                      {results.sB_net.map((s: number, i: number) => (
                        <td key={i} className={`p-2 relative ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${!s ? 'text-zinc-800' : s < course.pars[i] ? 'text-rose-500' : 'text-zinc-300'}`}>
                          <div>{s || '-'}</div>
                          {renderDots(results.sB_dots[i])}
                        </td>
                      ))}
                    </tr>

                    {/* WINNER TALLY ROW */}
                    <tr className="border-t-2 border-zinc-800 bg-zinc-900/50">
                      <td className="p-4 text-left text-zinc-500 border-r border-zinc-900">WINNER</td>
                      {[...results.f9.holeResults, ...results.b9.holeResults].map((h, i) => (
                        <td key={i} className={`p-2 ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${h.winner === 'A' ? 'text-emerald-500' : h.winner === 'B' ? 'text-blue-500' : 'text-zinc-600'}`}>
                          {h.winner || '-'}
                          {h.newPresses > 0 && <div className="absolute -mt-6 -ml-1 flex"><Zap size={10} className="text-yellow-500 animate-pulse"/></div>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* PAYOUT BREAKDOWNS (UNCHANGED) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2">FRONT 9 (PRESSES: <span className="text-yellow-500">{results.f9.totalPresses}</span>)</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${results.f9.payoutA}</span> <span className="text-zinc-600">to</span> <span className="text-blue-500">${results.f9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2">BACK 9 (PRESSES: <span className="text-yellow-500">{results.b9.totalPresses}</span>)</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${results.b9.payoutA}</span> <span className="text-zinc-600">to</span> <span className="text-blue-500">${results.b9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black tracking-widest mb-2"><Target size={12}/> BIRDIE & EAGLE MONEY</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${results.birdiePayoutA}</span> <span className="text-zinc-600">to</span> <span className="text-blue-500">${results.birdiePayoutB}</span></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl">
                <div className="text-zinc-500 font-black mb-4 sm:mb-0">TOTAL MATCH NET</div>
                <div className="text-4xl font-black">
                  {results.net > 0 ? <span className="text-emerald-400">{m.sideB} OWES ${results.net}</span> : results.net < 0 ? <span className="text-blue-400">{m.sideA} OWES ${Math.abs(results.net)}</span> : <span className="text-zinc-500">MATCH TIED ($0)</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}