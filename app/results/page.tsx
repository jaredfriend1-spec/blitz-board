"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Trophy, Award, ArrowLeft, LayoutGrid, Medal } from 'lucide-react'
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

  // --- ENGINE 1: INDIVIDUAL MEDALS, SKINS & REMAINDERS ---
  const getIndividualResults = () => {
    const activePlayerIds = new Set<string>();
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)));
    const activeFieldSize = activePlayerIds.size;

    const list = players.filter(p => activePlayerIds.has(p.id)).map(p => {
      const s = scores[p.id] || Array(18).fill(0);
      const f9 = s.slice(0, 9).reduce((a, b) => a + (Number(b) || 0), 0);
      const b9 = s.slice(9, 18).reduce((a, b) => a + (Number(b) || 0), 0);
      return { ...p, f9, b9, hasPlayed: s.some(val => val > 0) }
    }).filter(p => p.hasPlayed);
    
    // Low Gross Medals
    const f9Winners = [...list].sort((a,b) => a.f9 - b.f9).slice(0, 3);
    const b9Winners = [...list].sort((a,b) => a.b9 - b.b9).slice(0, 3);

    // Skins Logic
    const skinsMap = Array(18).fill(null);
    const skinsCount: Record<string, number> = {};
    let totalSkinsWon = 0; let earliestSkinPlayerId: string | null = null; let earliestSkinHole = -1;

    for (let h = 0; h < 18; h++) {
      const holeScores = players.filter(p => activePlayerIds.has(p.id)).map(p => ({ 
        id: p.id, name: p.name, s: (scores[p.id] || [])[h] || 0 
      })).filter(x => x.s > 0);
      
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s));
        const winners = holeScores.filter(x => x.s === min);
        if (winners.length === 1) {
          skinsMap[h] = winners[0];
          skinsCount[winners[0].id] = (skinsCount[winners[0].id] || 0) + 1;
          totalSkinsWon++;
          if (earliestSkinHole === -1) { earliestSkinHole = h; earliestSkinPlayerId = winners[0].id; }
        }
      }
    }

    const totalSkinsPot = activeFieldSize * (money.skinsAllocation || 0);
    const perSkin = totalSkinsWon > 0 ? Math.floor(totalSkinsPot / totalSkinsWon) : 0;
    const remainder = totalSkinsPot - (perSkin * totalSkinsWon);

    return { f9Winners, b9Winners, skinsMap, skinsCount, earliestSkinPlayerId, earliestSkinHole, totalSkinsPot, totalSkinsWon, perSkin, remainder };
  }

  // --- ENGINE 2: TEAM COMPETITION (60/40 SPLITS) ---
  const getTeamResults = () => {
    const activePlayerIds = new Set<string>();
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)));
    const totalTeamPot = activePlayerIds.size * ((money.entryFee || 0) - (money.skinsAllocation || 0));
    const sidePot = totalTeamPot / 2;

    const teamScores = teams.map(t => {
      const pIds = t.playerIds || [];
      const holeScores = Array(18).fill(0).map((_, i) => {
        const par = course.pars[i] || 4;
        const pScores = pIds.map((id:string) => scores[id]?.[i] || 0).filter((s:number) => s > 0).sort((a:number,b:number)=>a-b);
        if (pScores.length === 0) return 0;
        return pScores.slice(0, par === 3 ? 3 : 2).reduce((a:number, b:number) => a + b, 0);
      });
      return { 
        id: t.id, name: t.name, 
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
          results.find(t => t.id === firstPlaceGroup[0].id)!.payout = pot * 0.60;
          results.find(t => t.id === firstPlaceGroup[0].id)!.rank = 1;
          if (sortedScores.length > 1) {
            const secondPlaceGroup = scoreGroups[sortedScores[1]];
            const secondPrizeEach = (pot * 0.40) / secondPlaceGroup.length;
            secondPlaceGroup.forEach((t:any) => {
              const r = results.find(x => x.id === t.id);
              if (r) { r.payout = secondPrizeEach; r.rank = 2; }
            });
          }
        } else {
          const splitPrize = pot / firstPlaceGroup.length;
          firstPlaceGroup.forEach((t:any) => {
            const r = results.find(x => x.id === t.id);
            if (r) { r.payout = splitPrize; r.rank = 1; }
          });
        }
      }
      return results;
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
          <button onClick={() => setActiveTab('INDIVIDUAL')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'INDIVIDUAL' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}>INDIVIDUAL</button>
          <button onClick={() => setActiveTab('TEAM')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'TEAM' ? 'bg-blue-500 text-black' : 'text-zinc-500'}`}>TEAM</button>
        </div>

        {activeTab === 'INDIVIDUAL' && (
          <div className="space-y-12 animate-in fade-in">
            {/* INDIVIDUAL MEDALS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <div className="bg-emerald-600 p-4 text-center font-black text-black flex items-center justify-center gap-2"><Medal size={20}/> FRONT 9 LOW</div>
                <div className="p-6 space-y-3">
                  {ind.f9Winners.map((w, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-zinc-800">
                      <span className="font-black text-lg">{i+1}. {w.name}</span>
                      <span className="text-emerald-400 font-black text-xl">{w.f9}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <div className="bg-emerald-600 p-4 text-center font-black text-black flex items-center justify-center gap-2"><Award size={20}/> BACK 9 LOW</div>
                <div className="p-6 space-y-3">
                  {ind.b9Winners.map((w, i) => (
                    <div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-zinc-800">
                      <span className="font-black text-lg">{i+1}. {w.name}</span>
                      <span className="text-emerald-400 font-black text-xl">{w.b9}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SKINS DASHBOARD */}
            <section>
              <div className="bg-emerald-500 text-black p-6 rounded-t-[2.5rem] border-x-4 border-t-4 border-black flex justify-between items-center">
                <div className="flex items-center gap-3"><LayoutGrid size={24} /><h2 className="text-3xl font-black">Skins</h2></div>
                <div className="text-right">
                   <div className="text-[10px] font-black uppercase">Pot: ${ind.totalSkinsPot} | {ind.totalSkinsWon} Skins</div>
                   <div className="text-xl font-black">${ind.perSkin} / Skin</div>
                </div>
              </div>
              <div className="bg-zinc-900 p-8 border-4 border-black rounded-b-[2.5rem] grid grid-cols-3 md:grid-cols-6 gap-4">
                {ind.skinsMap.map((winner, i) => (
                  <div key={i} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center min-h-[100px] ${winner ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
                    <span className="text-[10px] text-zinc-600 font-black mb-1">HOLE {i+1}</span>
                    <span className={`text-[11px] font-black text-center ${winner ? 'text-emerald-400' : 'text-zinc-700'}`}>{winner ? winner.name : "---"}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* SKINS PAYOUT TABLE */}
            <section className="bg-orange-100 rounded-[3rem] border-4 border-black overflow-hidden flex flex-col">
              <div className="bg-orange-500 p-6 font-black text-center text-white text-xl border-b-4 border-black uppercase italic">Skins Payouts</div>
              {ind.remainder > 0 && ind.earliestSkinPlayerId && (
                <div className="bg-orange-300 p-3 text-center text-[10px] text-orange-900 font-black border-b-2 border-orange-400 uppercase italic">
                  Remainder of ${ind.remainder} to {players.find(p=>p.id === ind.earliestSkinPlayerId)?.name} (Hole {ind.earliestSkinHole + 1})
                </div>
              )}
              <table className="w-full text-black font-black text-xs italic">
                <thead><tr className="bg-orange-200 border-b-2 border-black"><th className="p-4 text-left uppercase">Player</th><th className="p-4 uppercase">Qty</th><th className="p-4 text-right uppercase">Total</th></tr></thead>
                <tbody>
                  {players.filter(p => ind.skinsCount[p.id] > 0).map(p => {
                    const finalPayout = (ind.skinsCount[p.id] * ind.perSkin) + (p.id === ind.earliestSkinPlayerId ? ind.remainder : 0);
                    return (
                      <tr key={p.id} className="border-b border-orange-200 bg-white/50">
                        <td className="p-4 flex items-center gap-2 uppercase"><Trophy size={14} className="text-orange-500"/> {p.name}</td>
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
              <h2 className="text-sm text-zinc-500 font-black tracking-widest mb-2">TOTAL TEAM POT</h2>
              <div className="text-6xl font-black text-blue-500">${tm.totalTeamPot}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* TEAM FRONT 9 */}
              <div className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 overflow-hidden">
                <div className="bg-blue-600 p-6 text-center text-black font-black">
                  <h3 className="text-2xl">FRONT 9</h3><div className="text-xs uppercase italic">Side Pot: ${tm.sidePot}</div>
                </div>
                <div className="p-4 space-y-2">
                  {tm.f9Results.map((t, i) => (
                    <div key={t.id} className={`flex justify-between items-center p-5 rounded-2xl border ${t.payout > 0 ? 'bg-black border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-black/50 border-zinc-800'}`}>
                      <div className="flex items-center gap-4">
                        {t.rank === 1 && <Trophy className="text-yellow-500" size={20} />}
                        {t.rank === 2 && <Award className="text-zinc-400" size={20} />}
                        <span className="font-black text-lg">{t.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-2xl text-zinc-300">{t.f9}</div>
                        {t.payout > 0 && <div className="text-blue-400 font-black text-xs">${t.payout.toFixed(2)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* TEAM BACK 9 */}
              <div className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 overflow-hidden">
                <div className="bg-blue-600 p-6 text-center text-black font-black">
                  <h3 className="text-2xl">BACK 9</h3><div className="text-xs uppercase italic">Side Pot: ${tm.sidePot}</div>
                </div>
                <div className="p-4 space-y-2">
                  {tm.b9Results.map((t, i) => (
                    <div key={t.id} className={`flex justify-between items-center p-5 rounded-2xl border ${t.payout > 0 ? 'bg-black border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-black/50 border-zinc-800'}`}>
                      <div className="flex items-center gap-4">
                        {t.rank === 1 && <Trophy className="text-yellow-500" size={20} />}
                        {t.rank === 2 && <Award className="text-zinc-400" size={20} />}
                        <span className="font-black text-lg">{t.name}</span>
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