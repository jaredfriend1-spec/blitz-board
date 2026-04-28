"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, onValue, set } from 'firebase/database'
import { ArrowLeft, Archive, Calendar, Users, DollarSign, Sword, Trophy, Zap, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export default function HistoryPage() {
  const [archives, setArchives] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    onValue(ref(db, 'history'), snap => {
      if (snap.val()) {
        const data = Object.entries(snap.val()).map(([key, value]: [string, any]) => ({
          id: key,
          ...value
        })).sort((a, b) => Number(b.id) - Number(a.id));
        setArchives(data);
      } else {
        setArchives([]);
      }
    })
  }, [])

  const deleteHistory = (id: string) => {
    const pw = prompt("ENTER ADMIN PASSWORD TO DELETE ARCHIVE:");
    if (pw !== "jeff") return alert("ACCESS DENIED");
    if (confirm("PERMANENTLY REMOVE THIS TOURNAMENT FROM HISTORY?")) {
      set(ref(db, `history/${id}`), null);
    }
  }

  // RECAP ENGINE: Runs the numbers for a specific archive snapshot
  const getRecap = (arch: any) => {
    const players = arch.roster ? Object.values(arch.roster) : [];
    const teams = arch.teams ? Object.values(arch.teams) : [];
    const scores = arch.scores || {};
    const money = arch.money || { entryFee: 0, skinsAllocation: 0 };
    
    // Active Field Calc
    const activePlayerIds = new Set<string>();
    teams.forEach((t: any) => (t.playerIds || []).forEach((pid: string) => activePlayerIds.add(pid)));
    const fieldSize = activePlayerIds.size;

    // Leaders
    const ranked = players.filter((p:any) => activePlayerIds.has(p.id)).map((p: any) => {
      const s = scores[p.id] || Array(18).fill(0);
      return { 
        name: p.name, 
        f9: s.slice(0, 9).reduce((a:number, b:number) => a + (Number(b) || 0), 0),
        b9: s.slice(9, 18).reduce((a:number, b:number) => a + (Number(b) || 0), 0)
      }
    });
    const winnerF9 = [...ranked].filter(p => p.f9 > 0).sort((a,b) => a.f9 - b.f9)[0];
    const winnerB9 = [...ranked].filter(p => p.b9 > 0).sort((a,b) => a.b9 - b.b9)[0];

    // Skins Recap
    let skinsTotal = 0;
    for (let h = 0; h < 18; h++) {
      const holeScores = players.filter((p:any) => activePlayerIds.has(p.id)).map((p: any) => ({ s: (scores[p.id] || [])[h] || 0 })).filter(x => x.s > 0)
      if (holeScores.length > 0) {
        const min = Math.min(...holeScores.map(x => x.s))
        if (holeScores.filter(x => x.s === min).length === 1) skinsTotal++;
      }
    }
    const pot = fieldSize * money.skinsAllocation;
    const skinValue = skinsTotal > 0 ? (pot / skinsTotal).toFixed(2) : "0";

    return { winnerF9, winnerB9, fieldSize, skinsTotal, skinValue, pot };
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-12 text-blue-500">
          <Archive size={40} />
          <h1 className="text-5xl font-black tracking-tighter">Senior Ledger</h1>
        </div>

        <div className="space-y-6 pb-20">
          {archives.map(arch => {
            const recap = getRecap(arch);
            const isExpanded = expandedId === arch.id;
            const date = new Date(Number(arch.id)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div key={arch.id} className={`bg-zinc-900 rounded-[2.5rem] border-2 transition-all overflow-hidden shadow-2xl ${isExpanded ? 'border-emerald-500' : 'border-zinc-800'}`}>
                {/* HEADER CARD */}
                <div 
                  className="p-8 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                  onClick={() => setExpandedId(isExpanded ? null : arch.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-zinc-500 font-black text-xs mb-2 tracking-widest"><Calendar size={14}/> {date}</div>
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-black text-white">{arch.course?.name || 'TOURNAMENT RECAP'}</h2>
                      <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-[10px] font-black">{recap.fieldSize} PLAYERS</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <div className="text-[10px] text-zinc-500 font-black">TOTAL SKINS POT</div>
                       <div className="text-2xl font-black text-emerald-500">${recap.pot}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-zinc-500" /> : <ChevronDown className="text-zinc-500" />}
                  </div>
                </div>

                {/* EXPANDED RECAP VIEW */}
                {isExpanded && (
                  <div className="bg-black/50 p-8 border-t-2 border-zinc-800 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      {/* WINNERS BLOCK */}
                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
                        <h3 className="text-blue-500 font-black text-xs tracking-widest mb-4 flex items-center gap-2"><Trophy size={14}/> TOP HONORS</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                            <span className="text-zinc-400 text-[10px] font-black">F9 WINNER</span>
                            <span className="font-black italic">{recap.winnerF9?.name || '---'} ({recap.winnerF9?.f9 || '--'})</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-[10px] font-black">B9 WINNER</span>
                            <span className="font-black italic">{recap.winnerB9?.name || '---'} ({recap.winnerB9?.b9 || '--'})</span>
                          </div>
                        </div>
                      </div>

                      {/* SKINS BLOCK */}
                      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
                        <h3 className="text-emerald-500 font-black text-xs tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> SKINS SUMMARY</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                            <span className="text-zinc-400 text-[10px] font-black">TOTAL SKINS WON</span>
                            <span className="font-black italic">{recap.skinsTotal}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 text-[10px] font-black">VALUE PER SKIN</span>
                            <span className="font-black italic text-emerald-400">${recap.skinValue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-zinc-600 font-black italic uppercase tracking-widest">Snapshot ID: {arch.id}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteHistory(arch.id); }}
                        className="bg-rose-500/10 text-rose-500 px-6 py-2 rounded-xl font-black text-[10px] hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Trash2 size={12}/> DELETE FROM LEDGER
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}