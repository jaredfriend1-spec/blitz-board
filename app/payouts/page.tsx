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
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4), holes: Array.from({length: 18}, (_, i) => ({ par: 4, hcp: i + 1 })) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  const calculateMatch = (m: any) => {
    // 1. Resolve Players
    const pA = m.type === 'PvP' ? players.filter(p => p.name === m.sideA) : players.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id));
    const pB = m.type === 'PvP' ? players.filter(p => p.name === m.sideB) : players.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id));
    
    if (pA.length === 0 || pB.length === 0) return null;

    // 2. Stroke Allocation (Net vs Gross)
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
        // PvP LOGIC: Single Best Ball
        if (netsA.length > 0) sA_final[i] = Math.min(...netsA.map(x => x.net));
        if (netsB.length > 0) sB_final[i] = Math.min(...netsB.map(x => x.net));
        
        // PvP Birdies (Full Eagle Support)
        const bgA = netsA.length > 0 ? Math.min(...netsA.map(x => x.gross)) : 0;
        const bgB = netsB.length > 0 ? Math.min(...netsB.map(x => x.gross)) : 0;
        if (bgA > 0 && bgA < par) birdieA += bgA <= par - 2 ? (m.eagle || (m.birdie * 2)) : (m.birdie || 0);
        if (bgB > 0 && bgB < par) birdieB += bgB <= par - 2 ? (m.eagle || (m.birdie * 2)) : (m.birdie || 0);
      } else {
        // TvT LOGIC: Aggregate (Best 2 on Par 4/5, Best 3 on Par 3)
        const count = par === 3 ? 3 : 2;
        if (netsA.length >= count) sA_final[i] = netsA.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        if (netsB.length >= count) sB_final[i] = netsB.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        
        // TvT Birdies (Flat Birdie Pay)
        const bgA = netsA.length > 0 ? Math.min(...netsA.map(x => x.gross)) : 0;
        const bgB = netsB.length > 0 ? Math.min(...netsB.map(x => x.gross)) : 0;
        if (bgA > 0 && bgA < par) birdieA += (m.birdie || 0);
        if (bgB > 0 && bgB < par) birdieB += (m.birdie || 0);
      }
      sA_dots[i] = Math.max(...pA.map(p => getStrokes(Number(p.handicap)||0, i)));
      sB_dots[i] = Math.max(...pB.map(p => getStrokes(Number(p.handicap)||0, i)));
    }

    const runNine = (start: number, end: number) => {
      let bets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults = []; let totalP = 0;
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
            // PRESS LOGIC: Only trigger for PvP types
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
        const amt = b.isBase ? (m.nassau || 0) : (m.press || 0);
        if (b.score > 0) payA += amt; else if (b.score < 0) payB += amt;
      });
      return { holeResults, payoutA: payA, payoutB: pB, totalPresses: totalP };
    }

    const f9 = runNine(0, 8); const b9 = runNine(9, 17);
    const strokesA = Math.max(...pA.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    const strokesB = Math.max(...pB.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    const net = (f9.payoutA + b9.payoutA + birdieA) - (f9.payoutB + b9.payoutB + birdieB);
    return { sA_net: sA_final, sB_net: sB_final, sA_dots, sB_dots, strokesA, strokesB, f9, b9, birdieA, birdieB, net };
  }

  const renderDots = (count: number) => {
    if (!count || count <= 0) return null;
    return <div className="flex justify-center -mt-1 gap-[2px]">{Array.from({length: Math.min(count, 3)}).map((_, idx) => <div key={idx} className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>)}</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2" /> HUB</Link>
      <div className="flex items-center gap-4 mb-12"><DollarSign size={40} className="text-emerald-500"/><h1 className="text-5xl font-black tracking-tighter">Match Payouts</h1></div>
      <div className="max-w-7xl mx-auto space-y-16">
        {matches.map(m => {
          const res = calculateMatch(m);
          if (!res) return null;
          return (
            <div key={m.id} className="bg-zinc-950 p-6 sm:p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-2 border-zinc-900 pb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black">{m.sideA} <span className="text-zinc-700 mx-2">VS</span> {m.sideB}</h2>
                  <div className="mt-3 flex gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${m.scoringType === 'GROSS' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{m.scoringType || 'NET'}</span>
                    {res.strokesA > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideA} GETS {res.strokesA}</span>}
                    {res.strokesB > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideB} GETS {res.strokesB}</span>}
                  </div>
                  <div className="text-zinc-500 font-black text-xs mt-3 tracking-widest flex items-center gap-3">
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">NASSAU: ${m.nassau || 0}</span>
                    {m.type === 'PvP' && <span className="bg-zinc-900 px-3 py-1 rounded-lg">PRESS: ${m.press || 0}</span>}
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">BIRDIE/EAGLE: ${m.birdie||0}/${m.eagle||(m.birdie*2)||0}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto mb-8 bg-black rounded-2xl border border-zinc-900 shadow-inner">
                <table className="w-full text-center border-collapse min-w-[700px]">
                  <thead className="text-[10px] text-zinc-600 font-black bg-zinc-950">
                    <tr><th className="p-4 text-left border-r border-zinc-900 uppercase tracking-tighter">Hole ({m.type === 'PvP' ? 'Best' : 'Agg'})</th>{Array.from({length:18}).map((_,i) => <th key={i} className={`p-2 w-8 ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}>{i+1}</th>)}</tr>
                  </thead>
                  <tbody className="text-xs font-black">
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500 truncate border-r border-zinc-900">{m.sideA}</td>
                      {res.sA_net.map((s: number, i: number) => <td key={i} className={`p-2 relative ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}><div>{s || '-'}</div>{renderDots(res.sA_dots[i])}</td>)}
                    </tr>
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-blue-500 truncate border-r border-zinc-900">{m.sideB}</td>
                      {res.sB_net.map((s: number, i: number) => <td key={i} className={`p-2 relative ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}><div>{s || '-'}</div>{renderDots(res.sB_dots[i])}</td>)}
                    </tr>
                    <tr className="border-t-2 border-zinc-800 bg-zinc-900/50">
                      <td className="p-4 text-left text-zinc-500 border-r border-zinc-900">WINNER</td>
                      {[...res.f9.holeResults, ...res.b9.holeResults].map((h, i) => (
                        <td key={i} className={`p-2 relative ${i===8 ? 'border-r-2 border-zinc-800' : ''} ${h.winner === 'A' ? 'text-emerald-500' : h.winner === 'B' ? 'text-blue-500' : 'text-zinc-600'}`}>
                          {h.winner || '-'}
                          {h.newP > 0 && <div className="absolute top-1 left-1 flex"><Zap size={10} className="text-yellow-500 animate-pulse"/></div>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black uppercase mb-2">Front 9 {res.f9.totalPresses > 0 ? `(${res.f9.totalPresses} Press)` : ''}</div>
                  <div className="text-white font-black mt-1 uppercase italic"><span className="text-emerald-500">${res.f9.payoutA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.f9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black uppercase mb-2">Back 9 {res.b9.totalPresses > 0 ? `(${res.b9.totalPresses} Press)` : ''}</div>
                  <div className="text-white font-black mt-1 uppercase italic"><span className="text-emerald-500">${res.b9.payoutA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.b9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase mb-2"><Target size={12}/> Birdie Pool</div>
                  <div className="text-white font-black mt-1 uppercase italic"><span className="text-emerald-500">${res.birdieA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.birdieB}</span></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl">
                <div className="text-zinc-500 font-black mb-4 sm:mb-0 uppercase italic tracking-widest text-xs">Total Match Net</div>
                <div className="text-4xl font-black">
                  {res.net > 0 ? <span className="text-emerald-400">{m.sideB} OWES ${res.net}</span> : res.net < 0 ? <span className="text-blue-400">{m.sideA} OWES ${Math.abs(res.net)}</span> : <span className="text-zinc-500 font-black">EVEN</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}