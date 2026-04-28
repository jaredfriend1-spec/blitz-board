"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { ArrowLeft, Zap, DollarSign, Target, Trophy } from 'lucide-react'
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
      if(snap.val()) {
        setCourse({ 
          pars: snap.val().pars || Array(18).fill(4), 
          holes: snap.val().holes || defaultHoles 
        })
      }
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

    const sA_aggregate = Array(18).fill(0); 
    const sB_aggregate = Array(18).fill(0);
    const sA_dots = Array(18).fill(0); 
    const sB_dots = Array(18).fill(0);
    let birdiePayoutA = 0; let birdiePayoutB = 0;

    for (let i = 0; i < 18; i++) {
      const par = course.pars[i] || 4;
      const countToTake = par === 3 ? 3 : 2;

      // --- TEAM A ---
      sA_dots[i] = Math.max(...pA.map(p => getStrokes(Number(p.handicap)||0, i)));
      const netA = pA.map(p => ({
        gross: scores[p.id]?.[i] || 0,
        net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i)
      })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);

      if (netA.length >= countToTake) {
        sA_aggregate[i] = netA.slice(0, countToTake).reduce((acc, curr) => acc + curr.net, 0);
        const bestGrossA = Math.min(...netA.map(x => x.gross));
        if (bestGrossA < par) birdiePayoutA += (bestGrossA <= par - 2) ? (m.eagle || 0) : (m.birdie || 0);
      }

      // --- TEAM B ---
      sB_dots[i] = Math.max(...pB.map(p => getStrokes(Number(p.handicap)||0, i)));
      const netB = pB.map(p => ({
        gross: scores[p.id]?.[i] || 0,
        net: (scores[p.id]?.[i] || 0) - getStrokes(Number(p.handicap)||0, i)
      })).filter(x => x.gross > 0).sort((a,b) => a.net - b.net);

      if (netB.length >= countToTake) {
        sB_aggregate[i] = netB.slice(0, countToTake).reduce((acc, curr) => acc + curr.net, 0);
        const bestGrossB = Math.min(...netB.map(x => x.gross));
        if (bestGrossB < par) birdiePayoutB += (bestGrossB <= par - 2) ? (m.eagle || 0) : (m.birdie || 0);
      }
    }

    const runNine = (start: number, end: number) => {
      let activeBets = [{ score: 0, pressed: false, isBase: true }];
      let holeResults = []; let totalPresses = 0;

      for (let i = start; i <= end; i++) {
        let winner = null;
        if (sA_aggregate[i] > 0 && sB_aggregate[i] > 0) {
          if (sA_aggregate[i] < sB_aggregate[i]) winner = 'A';
          else if (sB_aggregate[i] < sA_aggregate[i]) winner = 'B';
          else winner = 'T';
        }
        let delta = winner === 'A' ? 1 : winner === 'B' ? -1 : 0;
        if (delta !== 0) {
          activeBets.forEach(bet => {
            bet.score += delta;
            if (Math.abs(bet.score) >= 2 && !bet.pressed) { bet.pressed = true; totalPresses++; }
          });
          if (activeBets.some(b => b.pressed && b.isBase && activeBets.length === 1)) {
            activeBets.push({ score: 0, pressed: false, isBase: false });
          }
        }
        holeResults.push({ winner });
      }
      let pA = 0; let pB = 0;
      activeBets.forEach(b => {
        const amt = b.isBase ? (m.nassau || 0) : (m.press || 0);
        if (b.score > 0) pA += amt; else if (b.score < 0) pB += amt;
      });
      return { holeResults, payoutA: pA, payoutB: pB, totalPresses };
    }

    const f9 = runNine(0, 8);
    const b9 = runNine(9, 17);
    const net = (f9.payoutA + b9.payoutA + birdiePayoutA) - (f9.payoutB + b9.payoutB + birdiePayoutB);

    return { sA_net: sA_aggregate, sB_net: sB_aggregate, sA_dots, sB_dots, f9, b9, birdiePayoutA, birdiePayoutB, net };
  }

  const renderDots = (count: number) => {
    if (!count || count <= 0) return null;
    return (
      <div className="flex justify-center -mt-1 gap-[2px]">
        {Array.from({length: Math.min(count, 3)}).map((_, idx) => (
          <div key={idx} className="w-1 h-1 bg-yellow-500 rounded-full"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2" /> HUB</Link>
      <div className="flex items-center gap-4 mb-12"><DollarSign size={40} className="text-emerald-500"/><h1 className="text-5xl font-black tracking-tighter">Side Bets</h1></div>
      <div className="max-w-7xl mx-auto space-y-16">
        {matches.map(m => {
          const res = calculateMatch(m);
          if (!res) return null;
          return (
            <div key={m.id} className="bg-zinc-950 p-6 sm:p-10 rounded-[3rem] border-2 border-zinc-800 shadow-2xl relative">
              <h2 className="text-3xl font-black mb-6">{m.sideA} <span className="text-zinc-700">VS</span> {m.sideB}</h2>
              <div className="overflow-x-auto mb-8 bg-black rounded-2xl border border-zinc-900">
                <table className="w-full text-center min-w-[800px]">
                  <thead className="text-[10px] text-zinc-600 font-black bg-zinc-950">
                    <tr><th className="p-4 text-left border-r border-zinc-900">HOLE (AGG)</th>{Array.from({length:18}).map((_,i) => <th key={i} className="p-2">{i+1}<br/><span className="opacity-30">P{course.pars[i]}</span></th>)}</tr>
                  </thead>
                  <tbody className="text-xs font-black">
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-emerald-500 border-r border-zinc-900">{m.sideA}</td>
                      {res.sA_net.map((s, i) => <td key={i} className="p-2"><div>{s || '-'}</div>{renderDots(res.sA_dots[i])}</td>)}
                    </tr>
                    <tr className="border-t border-zinc-900">
                      <td className="p-4 text-left text-blue-500 border-r border-zinc-900">{m.sideB}</td>
                      {res.sB_net.map((s, i) => <td key={i} className="p-2"><div>{s || '-'}</div>{renderDots(res.sB_dots[i])}</td>)}
                    </tr>
                    <tr className="border-t-2 border-zinc-800 bg-zinc-900/50">
                      <td className="p-4 text-left text-zinc-500 border-r border-zinc-900">WINNER</td>
                      {[...res.f9.holeResults, ...res.b9.holeResults].map((h, i) => <td key={i} className={`p-2 ${h.winner === 'A' ? 'text-emerald-500' : h.winner === 'B' ? 'text-blue-500' : 'text-zinc-700'}`}>{h.winner || '-'}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black">FRONT 9 Payout</div>
                  <div className="text-lg font-black mt-1 text-emerald-500">${res.f9.payoutA} <span className="text-zinc-700 mx-2">|</span> <span className="text-blue-500">${res.f9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black">BACK 9 Payout</div>
                  <div className="text-lg font-black mt-1 text-emerald-500">${res.b9.payoutA} <span className="text-zinc-700 mx-2">|</span> <span className="text-blue-500">${res.b9.payoutB}</span></div>
                </div>
                <div className="bg-black border border-zinc-800 p-6 rounded-2xl">
                  <div className="text-zinc-500 text-[10px] font-black uppercase">Birdies/Eagles</div>
                  <div className="text-lg font-black mt-1 text-emerald-500">${res.birdiePayoutA} <span className="text-zinc-700 mx-2">|</span> <span className="text-blue-500">${res.birdiePayoutB}</span></div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl">
                <div className="text-4xl font-black">
                  {res.net > 0 ? <span className="text-emerald-400">{m.sideB} OWES ${res.net}</span> : res.net < 0 ? <span className="text-blue-400">{m.sideA} OWES ${Math.abs(res.net)}</span> : "ALL SQ"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}