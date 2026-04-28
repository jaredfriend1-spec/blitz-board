"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { Trophy, Award, ArrowLeft, LayoutGrid, Info } from 'lucide-react'
import Link from 'next/link'

export default function ResultsPage() {
  const [scores, setScores] = useState<Record<string, number[]>>({})
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [money, setMoney] = useState({ entryFee: 25, skinsAllocation: 10 })

  useEffect(() => {
    onValue(ref(db, 'tournament/scores'), snap => snap.val() && setScores(snap.val()))
    onValue(ref(db, 'tournament/roster'), snap => snap.val() && setPlayers(Object.values(snap.val())))
    onValue(ref(db, 'tournament/teams'), snap => snap.val() && setTeams(Object.values(snap.val())))
    onValue(ref(db, 'tournament/money'), snap => snap.val() && setMoney(snap.val()))
  }, [])

  const getResults = () => {
    // 1. Determine active field size (only players assigned to teams)
    const activePlayerIds = new Set<string>();
    teams.forEach(t => (t.playerIds || []).forEach((id: string) => activePlayerIds.add(id)));
    const activeFieldSize = activePlayerIds.size;

    // 2. Financial Pot Math
    const skinsAllocation = money.skinsAllocation || 0;
    const totalSkinsPot = activeFieldSize * skinsAllocation;

    // 3. Parse F9 / B9
    const list = players.filter(p => activePlayerIds.has(p.id)).map(p => {
      const s = scores[p.id] || Array(18).fill(0);
      const f9 = s.slice(0, 9).reduce((a,b) => a + (Number(b) || 0), 0);
      const b9 = s.slice(9, 18).reduce((a,b) => a + (Number(b) || 0), 0);
      return { ...p, f9, b9 }
    })
    
    // 4. Skins Logic & Map
    const map = Array(18).fill(null);
    const skinsCount: Record<string, number> = {};
    let totalSkinsWon = 0;

    for (let h = 0; h < 18; h++) {
      const holeScores = players.filter(p => activePlayerIds.has(p.id)).map(p => ({ id: p.id, name: p.name, s: (scores[p.id] || [])[h] || 0 })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s))
        const winners = holeScores.filter(x => x.s === min)
        if (winners.length === 1) {
          map[h] = winners[0].name;
          skinsCount[winners[0].id] = (skinsCount[winners[0].id] || 0) + 1;
          totalSkinsWon++;
        }
      }
    }

    const valuePerSkin = totalSkinsWon > 0 ? totalSkinsPot / totalSkinsWon : 0;

    return {
      f9: [...list].filter(p => p.f9 > 0).sort((a,b) => a.f9 - b.f9),
      b9: [...list].filter(p => p.b9 > 0).sort((a,b) => a.b9 - b.b9),
      map,
      skinsCount,
      financials: { activeFieldSize, totalSkinsPot, totalSkinsWon, valuePerSkin }
    }
  }

  const res = getResults();

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      {/* SKINS MAP */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="bg-emerald-500 text-black p-6 rounded-t-[2.5rem] border-x-4 border-t-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-3"><LayoutGrid size={24} /><h2 className="text-3xl font-black">Skins Dashboard</h2></div>
          <div className="text-right">
             <div className="text-[10px] font-black tracking-widest">TOTAL POT: ${res.financials.totalSkinsPot}</div>
             <div className="text-xl font-black">VALUE/SKIN: {res.financials.totalSkinsWon > 0 ? `$${res.financials.valuePerSkin.toFixed(2)}` : 'TBD'}</div>
          </div>
        </div>
        <div className="bg-zinc-900 p-8 border-4 border-black rounded-b-[2.5rem] grid grid-cols-3 md:grid-cols-6 gap-4">
          {res.map.map((winner, i) => (
            <div key={i} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center min-h-[90px] ${winner ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-black/40'}`}>
              <span className="text-[10px] text-zinc-600 font-black mb-2">HOLE {i+1}</span>
              <span className={`text-xs font-black text-center ${winner ? 'text-emerald-400' : 'text-zinc-700'}`}>{winner || "---"}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        
        <section className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 p-8">
          <h2 className="text-blue-500 font-black text-3xl mb-8 border-b-2 border-zinc-800 pb-4">FRONT 9</h2>
          <div className="space-y-4">
            {res.f9.slice(0, 4).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  {i === 0 && <Trophy className="text-yellow-500" />}
                  {i === 1 && <Award className="text-zinc-400" />}
                  <span className="font-black text-xl">{p.name}</span>
                </div>
                <span className="text-3xl font-black text-emerald-400">{p.f9}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900 rounded-[3rem] border-2 border-zinc-800 p-8">
          <h2 className="text-amber-500 font-black text-3xl mb-8 border-b-2 border-zinc-800 pb-4">BACK 9</h2>
          <div className="space-y-4">
            {res.b9.slice(0, 4).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-4">
                  {i === 0 && <Trophy className="text-yellow-500" />}
                  {i === 1 && <Award className="text-zinc-400" />}
                  <span className="font-black text-xl">{p.name}</span>
                </div>
                <span className="text-3xl font-black text-amber-500">{p.b9}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-orange-100 rounded-[3rem] border-4 border-black overflow-hidden flex flex-col">
          <div className="bg-orange-500 p-6 font-black text-center text-white text-xl border-b-4 border-black">SKINS PAYOUTS</div>
          <div className="bg-orange-200/50 p-3 flex justify-between items-center border-b-2 border-orange-300 text-[10px] text-orange-800 font-black">
             <span>ACTIVE FIELD: {res.financials.activeFieldSize} PLAYERS</span>
             <span>ALLOCATION: ${money.skinsAllocation || 0}/MAN</span>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-black font-black text-xs">
              <thead><tr className="bg-orange-200 border-b-2 border-black">
                <th className="p-4 text-left">PLAYER</th><th className="p-4">QTY</th><th className="p-4 text-right">TOTAL</th>
              </tr></thead>
              <tbody>
                {players.filter(p => res.skinsCount[p.id] > 0).map(p => (
                  <tr key={p.id} className="border-b border-orange-200 bg-white/50">
                    <td className="p-4 flex items-center gap-2"><Trophy size={14} className="text-orange-500"/> {p.name}</td>
                    <td className="p-4 text-center text-lg">{res.skinsCount[p.id]}</td>
                    <td className="p-4 text-right text-emerald-700 text-lg">${(res.skinsCount[p.id] * res.financials.valuePerSkin).toFixed(2)}</td>
                  </tr>
                ))}
                {Object.keys(res.skinsCount).length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-zinc-500 italic">NO SKINS WON YET</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}