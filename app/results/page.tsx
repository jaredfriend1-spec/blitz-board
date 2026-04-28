"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Trophy, Award, ArrowLeft, LayoutGrid, Users } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })
  const [course, setCourse] = useState<any>({ pars: Array(18).fill(4) })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/money'), snap => snap.val() && setMoney(snap.val()))
    onValue(ref(db, 'tournament/course'), snap => snap.val() && setCourse(snap.val()))
  }, [])

  // --- ENGINE 1: INDIVIDUAL SKINS & REMAINDER LOGIC ---
  const getIndividualResults = () => {
    const activePlayerIds = new Set<string>();
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)));
    const activeFieldSize = activePlayerIds.size;

    const list = players.filter(p => activePlayerIds.has(p.id)).map(p => {
      const s = scores[p.id] || Array(18).fill(0);
      return { ...p, f9: s.slice(0, 9).reduce((a,b)=>a+(Number(b)||0), 0), b9: s.slice(9, 18).reduce((a,b)=>a+(Number(b)||0), 0) }
    })
    
    const map = Array(18).fill(null);
    const skinsCount: Record<string, number> = {};
    let totalSkinsWon = 0; let earliestSkinPlayerId: string | null = null; let earliestSkinHole = -1;

    for (let h = 0; h < 18; h++) {
      const holeScores = players.filter(p => activePlayerIds.has(p.id)).map(p => ({ id: p.id, name: p.name, s: (scores[p.id] || [])[h] || 0 })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s));
        const winners = holeScores.filter(x => x.s === min);
        if (winners.length === 1) {
          map[h] = winners[0];
          skinsCount[winners[0].id] = (skinsCount[winners[0].id] || 0) + 1;
          totalSkinsWon++;
          if (earliestSkinHole === -1) { earliestSkinHole = h; earliestSkinPlayerId = winners[0].id; }
        }
      }
    }

    const totalSkinsPot = activeFieldSize * (money.skinsAllocation || 0);
    const rawPerSkin = totalSkinsWon > 0 ? totalSkinsPot / totalSkinsWon : 0;
    const perSkin = Math.floor(rawPerSkin);
    const remainder = totalSkinsPot - (perSkin * totalSkinsWon);

    return {
      f9: [...list].filter(p => p.f9 > 0).sort((a,b) => a.f9 - b.f9),
      b9: [...list].filter(p => p.b9 > 0).sort((a,b) => a.b9 - b.b9),
      map, skinsCount, earliestSkinPlayerId, earliestSkinHole,
      financials: { activeFieldSize, totalSkinsPot, totalSkinsWon, perSkin, remainder }
    }
  }

  // --- ENGINE 2: TEAM BEST BALL & 60/40 SPLITS ---
  const getTeamResults = () => {
    const activePlayerIds = new Set<string>();
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)));
    const totalTeamPot = activePlayerIds.size * ((money.entryFee || 0) - (money.skinsAllocation || 0));
    const sidePot = totalTeamPot / 2; // F9 and B9 get half each

    const teamScores = teams.map(t => {
      const pIds = t.playerIds || [];
      const holeScores = Array(18).fill(0).map((_, i) => {
        const par = course.pars[i] || 4;
        const pScores = pIds.map((id:string) => scores[id]?.[i] || 0).filter((s:number) => s > 0).sort((a:number,b:number)=>a-b);
        if (pScores.length === 0) return 0;
        const countToTake = par === 3 ? 3 : 2;
        return pScores.slice(0, countToTake).reduce((a:number, b:number) => a + b, 0);
      });
      return { 
        id: t.id, name: t.name, holeScores,
        f9: holeScores.slice(0, 9).reduce((a,b)=>a+b, 0),
        b9: holeScores.slice(9, 18).reduce((a,b)=>a+b, 0)
      }
    });

    const calcPayouts = (pot: number, teamsArr: any[], half: 'f9'|'b9') => {
      const valid = teamsArr.filter(t => t[half] > 0).sort((a,b) => a[half] - b[half]);
      if (valid.length === 0) return [];
      
      const scoreGroups: any = {};
      valid.forEach(t => { if(!scoreGroups[t[half]]) scoreGroups[t[half]] = []; scoreGroups[t[half]].push(t); });
      
      const sortedScores = Object.keys(scoreGroups).map(Number).sort((a,b)=>a-b);
      const results = valid.map(t => ({ ...t, payout: 0, rank: 0 }));

      if (sortedScores.length > 0) {
        const firstPlaceGroup = scoreGroups[sortedScores[0]];
        if (firstPlaceGroup.length === 1) {
          // One 1st place winner gets 60%
          results.find(t => t.id === firstPlaceGroup[0].id)!.payout = pot * 0.60;
          results.find(t => t.id === firstPlaceGroup[0].id)!.rank = 1;
          
          if (sortedScores.length > 1) {
            const secondPlaceGroup = scoreGroups[sortedScores[1]];
            const secondPrizeEach = (pot * 0.40) / secondPlaceGroup.length;
            secondPlaceGroup.forEach((t:any) => {
              results.find(x => x.id === t.id)!.payout = secondPrizeEach;
              results.find(x => x.id === t.id)!.rank = 2;
            });
          }
        } else {
          // Tie for 1st: Combine 60% and 40% and split evenly. Nobody gets 2nd.
          const splitPrize = (pot * 1.0) / firstPlaceGroup.length;
          firstPlaceGroup.forEach((t:any) => {
            results.find(x => x.id === t.id)!.payout = splitPrize;
            results.find(x => x.id === t.id)!.rank = 1;
          });
        }
      }
      return results.sort((a,b) => a[half] - b[half]);
    }

    return { totalTeamPot, sidePot, f9Results: calcPayouts(sidePot, teamScores, 'f9'), b9Results: calcPayouts(sidePot, teamScores, 'b9') }
  }

  const ind = getIndividualResults();
  const tm = getTeamResults();

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
        
        <div className="flex bg-zinc-900 rounded-2xl p-2 mb-12 border-2 border-zinc-800">
          <button onClick={() => setActiveTab('INDIVIDUAL')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'INDIVIDUAL' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}>INDIVIDUAL SKINS</button>
          <button onClick={() => setActiveTab('TEAM')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'TEAM' ? 'bg-blue-500 text-black' : 'text-zinc-500'}`}>TEAM COMPETITION</button>
        </div>

        {activeTab === 'INDIVIDUAL' && (
          <div className="animate-in fade-in">
            <section className="mb-12">
              <div className="bg-emerald-500 text-black p-6 rounded-t-[2.5rem] border-x-4 border-t-4 border-black flex justify-between items-center">
                <div className="flex items-center gap-3"><LayoutGrid size={24} /><h2 className="text-3xl font-black">Skins Dashboard</h2></div>
                <div className="text-right">
                   <div className="text-[10px] font-black tracking-widest">POT: ${ind.financials.totalSkinsPot} | WON: {ind.financials.totalSkinsWon}</div>
                   <div className="text-xl font-black">${ind.financials.perSkin} / SKIN</div>
                </div>
              </div>
              <div className="bg-zinc-900 p-8 border-4 border-black rounded-b-[2.5rem] grid grid-cols-3 md:grid-cols-6 gap-4">
                {ind.map.map((winner, i) => (
                  <div key={i} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center min-h-[90px] ${winner ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
                    <span className="text-[10px] text-zinc-600 font-black mb-2">HOLE {i+1}</span>
                    <span className={`text-xs font-black text-center ${winner ? 'text-emerald-400' : 'text-zinc-700'}`}>{winner ? winner.name : "---"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-orange-100 rounded-[3rem] border-4 border-black overflow-hidden flex flex-col">
              <div className="bg-orange-500 p-6 font-black text-center text-white text-xl border-b-4 border-black">SKINS PAYOUTS (WHOLE DOLLARS)</div>
              {ind.financials.remainder > 0 && ind.earliestSkinPlayerId && (
                <div className="bg-orange-300 p-3 text-center text-xs text-orange-900 font-black border-b-2 border-orange-400">
                  REMAINDER OF ${ind.financials.remainder} AWARDED TO {players.find(p=>p.id === ind.earliestSkinPlayerId)?.name} (EARLIEST SKIN ON HOLE {ind.earliestSkinHole + 1})
                </div>
              )}
              <table className="w-full text-black font-black text-xs">
                <thead><tr className="bg-orange-200 border-b-2 border-black"><th className="p-4 text-left">PLAYER</th><th className="p-4">QTY</th><th className="p-4 text-right">TOTAL WINNINGS</th></tr></thead>
                <tbody>
                  {players.filter(p => ind.skinsCount[p.id] > 0).map(p => {
                    const basePayout = ind.skinsCount[p.id] * ind.financials.perSkin;
                    const finalPayout = basePayout + (p.id === ind.earliestSkinPlayerId ? ind.financials.remainder : 0);
                    return (
                      <tr key={p.id} className="border-b border-orange-200 bg-white/50">
                        <td className="p-4 flex items-center gap-2"><Trophy size={14} className="text-orange-500"/> {p.name}</td>
                        <td className="p-4 text-center text-lg">{ind.skinsCount[p.id]}</td>
                        <td className="p-4 text-right text-emerald-700 text-lg">${finalPayout}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeTab === 'TEAM' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-blue-500 text-center shadow-2xl">
              <h2 className="text-sm text-zinc-500 font-black tracking-widest mb-2">TOTAL TEAM POT (ENTRY - SKINS)</h2>
              <div className="text-6xl font-black text-blue-500">${tm.totalTeamPot}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* FRONT 9 STANDINGS */}
              <div className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 overflow-hidden">
                <div className="bg-blue-600 p-6 text-center text-black font-black">
                  <h3 className="text-2xl">FRONT 9</h3><div className="text-xs">POT: ${tm.sidePot}</div>
                </div>
                <div className="p-4 space-y-2">
                  {tm.f9Results.map((t, i) => (
                    <div key={t.id} className={`flex justify-between items-center p-5 rounded-2xl border ${t.payout > 0 ? 'bg-black border-blue-500' : 'bg-black/50 border-zinc-800'}`}>
                      <div className="flex items-center gap-4">
                        {t.rank === 1 && <Trophy className="text-yellow-500" size={20} />}
                        {t.rank === 2 && <Award className="text-zinc-400" size={20} />}
                        {!t.rank && <span className="w-5 text-center text-zinc-600 font-black">{i+1}</span>}
                        <span className="font-black text-lg text-white">{t.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-2xl text-zinc-300">{t.f9}</div>
                        {t.payout > 0 && <div className="text-blue-400 font-black text-xs">${t.payout.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BACK 9 STANDINGS */}
              <div className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 overflow-hidden">
                <div className="bg-blue-600 p-6 text-center text-black font-black">
                  <h3 className="text-2xl">BACK 9</h3><div className="text-xs">POT: ${tm.sidePot}</div>
                </div>
                <div className="p-4 space-y-2">
                  {tm.b9Results.map((t, i) => (
                    <div key={t.id} className={`flex justify-between items-center p-5 rounded-2xl border ${t.payout > 0 ? 'bg-black border-blue-500' : 'bg-black/50 border-zinc-800'}`}>
                      <div className="flex items-center gap-4">
                        {t.rank === 1 && <Trophy className="text-yellow-500" size={20} />}
                        {t.rank === 2 && <Award className="text-zinc-400" size={20} />}
                        {!t.rank && <span className="w-5 text-center text-zinc-600 font-black">{i+1}</span>}
                        <span className="font-black text-lg text-white">{t.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-2xl text-zinc-300">{t.b9}</div>
                        {t.payout > 0 && <div className="text-blue-400 font-black text-xs">${t.payout.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}