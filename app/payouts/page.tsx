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
  const defaultHoles = Array.from({length: 18}, (_, i) => ({ par: 4, hcp: i + 1 }));
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4), holes: defaultHoles })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/matchups'), snap => snap.val() && setMatches(Object.values(snap.val())))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/course'), snap => {
      if(snap.val()) setCourse({ pars: snap.val().pars || Array(18).fill(4), holes: snap.val().holes || defaultHoles })
    })
  }, [])

  const calculateMatch = (m: any) => {
    const pA = m.type === 'PvP' ? players.filter(p => p.name === m.sideA) : players.filter(p => (teams.find(t => t.name === m.sideA)?.playerIds || []).includes(p.id));
    const pB = m.type === 'PvP' ? players.filter(p => p.name === m.sideB) : players.filter(p => (teams.find(t => t.name === m.sideB)?.playerIds || []).includes(p.id));
    if (pA.length === 0 || pB.length === 0) return null;

    const allHcps = [...pA, ...pB].map(p => Number(p.handicap) || 0);
    const baseHcp = Math.min(...allHcps);

    const getStrokes = (playerHcp: number, holeIndex: number) => {
      const holeHcpRating = Number(course.holes[holeIndex]?.hcp) || (holeIndex + 1);
      const diff = Math.max(0, playerHcp - baseHcp);
      let strokes = Math.floor(diff / 18);
      if (holeHcpRating <= (diff % 18)) strokes += 1;
      return strokes;
    };

    const sA_agg = Array(18).fill(0); const sB_agg = Array(18).fill(0);
    const sA_dots = Array(18).fill(0); const sB_dots = Array(18).fill(0);
    let birdieA = 0; let birdieB = 0;
    let strokesA = Math.max(...pA.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));
    let strokesB = Math.max(...pB.map(p => Math.max(0, (Number(p.handicap)||0) - baseHcp)));

    for (let i = 0; i < 18; i++) {
      const par = course.pars[i] || 4;
      const count = par === 3 ? 3 : 2;

      // SIDE A
      const netsA = pA.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);
      if (netsA.length >= count) {
        sA_agg[i] = netsA.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        sA_dots[i] = Math.max(...pA.map(p => getStrokes(Number(p.handicap)||0, i)));
        const bestG = Math.min(...netsA.map(x => x.gross));
        if (bestG < par) birdieA += bestG <= par - 2 ? (m.eagle || (m.birdie * 2) || 0) : (m.birdie || 0);
      }

      // SIDE B
      const netsB = pB.map(p => ({ gross: scores[p.id]?.[i] || 0, net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i) })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);
      if (netsB.length >= count) {
        sB_agg[i] = netsB.slice(0, count).reduce((acc, curr) => acc + curr.net, 0);
        sB_dots[i] = Math.max(...pB.map(p => getStrokes(Number(p.handicap)||0, i)));
        const bestG = Math.min(...netsB.map(x => x.gross));
        if (bestG < par) birdieB += bestG <= par - 2 ? (m.eagle || (m.birdie * 2) || 0) : (m.birdie || 0);
      }
    }

    const runNine = (start: number, end: number) => {
      let activeBets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults = []; let totalPresses = 0;
      for (let i = start; i <= end; i++) {
        let winner = null; let newPresses = 0;
        if (sA_agg[i] > 0 && sB_agg[i] > 0) {
          if (sA_agg[i] < sB_agg[i]) winner = 'A';
          else if (sB_agg[i] < sA_agg[i]) winner = 'B';
          else winner = 'T';
        }
        let delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0;
        if (delta !== 0) {
          activeBets.forEach(bet => {
            bet.score += delta;
            if (Math.abs(bet.score) >= 2 && !bet.pressed) { bet.pressed = true; newPresses++; totalPresses++; }
          });
          for (let p = 0; p < newPresses; p++) activeBets.push({ score: 0, pressed: false, isBase: false });
        }
        holeResults.push({ winner, newPresses });
      }
      let payA = 0; let payB = 0;
      activeBets.forEach(bet => {
        const amt = bet.isBase ? (m.nassau || 0) : (m.press || 0);
        if (bet.score > 0) payA += amt; else if (bet.score < 0) payB += amt;
      });
      return { holeResults, payoutA: payA, payoutB: payB, totalPresses };
    }

    const f9 = runNine(0, 8); const b9 = runNine(9, 17);
    const net = (f9.payoutA + b9.payoutA + birdieA) - (f9.payoutB + b9.payoutB + birdieB);
    return { sA_net: sA_agg, sB_net: sB_agg, sA_dots, sB_dots, strokesA, strokesB, f9, b9, birdieA, birdieB, net };
  }

  const renderDots = (count: number) => {
    if (!count || count <= 0) return null;
    return <div className="flex justify-center -mt-1 gap-[2px]">{Array.from({length: Math.min(count, 3)}).map((_, idx) => <div key={idx} className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>)}</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2" /> HUB</Link>
      <div className="flex items-center gap-4 mb-12"><DollarSign size={40} className="text-emerald-500"/><h1 className="text-5xl font-black tracking-tighter">Side Bets & Payouts</h1></div>
      <div className="max-w-7xl mx-auto space-y-16">
        {matches.map(m => {
          const res = calculateMatch(m);
          if (!res) return null;
          return (
            <div key={m.id} className="bg-zinc-950 p-6 sm:p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-2 border-zinc-900 pb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black text-white">{m.sideA} <span className="text-zinc-700 mx-2">VS</span> {m.sideB}</h2>
                  <div className="mt-3 flex gap-2">
                    {res.strokesA > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideA} GETS {res.strokesA} STROKES</span>}
                    {res.strokesB > 0 && <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-lg text-xs font-black">{m.sideB} GETS {res.strokesB} STROKES</span>}
                  </div>
                  <div className="text-zinc-500 font-black text-xs mt-3 tracking-widest flex items-center gap-3">
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">NASSAU: ${m.nassau || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg">PRESS: ${m.press || 0}</span>
                    <span className="bg-zinc-900 px-3 py-1 rounded-lg uppercase">Birdie/Eagle: ${m.birdie||0}/${m.eagle||(m.birdie*2)||0}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto mb-8 bg-black rounded-2xl border border-zinc-900">
                <table className="w-full text-center border-collapse min-w-[700px]">
                  <thead className="text-[10px] text-zinc-600 font-black bg-zinc-950">
                    <tr><th className="p-4 text-left border-r border-zinc-900">HOLE (AGG)</th>{Array.from({length:18}).map((_,i) => <th key={i} className={`p-2 w-8 ${i===8 ? 'border-r-2 border-zinc-800' : ''}`}>{i+1}</th>)}</tr>
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
                          {h.newPresses > 0 && <div className="absolute top-1 left-1 flex"><Zap size={10} className="text-yellow-500 animate-pulse"/></div>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2 uppercase">Front 9 (${m.nassau})</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${res.f9.payoutA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.f9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black tracking-widest mb-2 uppercase">Back 9 (${m.nassau})</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${res.b9.payoutA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.b9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black tracking-widest mb-2 uppercase"><Target size={12}/> Birdie Pool</div>
                  <div className="text-white font-black mt-1"><span className="text-emerald-500">${res.birdieA}</span> <span className="text-zinc-600 mx-1">to</span> <span className="text-blue-500">${res.birdieB}</span></div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl">
                <div className="text-zinc-500 font-black mb-4 sm:mb-0 uppercase">Match Net</div>
                <div className="text-4xl font-black">
                  {res.net > 0 ? <span className="text-emerald-400">{m.sideB} OWES ${res.net}</span> : res.net < 0 ? <span className="text-blue-400">{m.sideA} OWES ${Math.abs(res.net)}</span> : <span className="text-zinc-500">EVEN MATCH</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}