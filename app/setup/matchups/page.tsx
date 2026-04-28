"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, User, Users, Sword, Trash2, Save, Target } from 'lucide-react'
import Link from 'next/link'

export default function MatchupCenter() {
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  
  // Builder State
  const [isBuilding, setIsBuilding] = useState<'PvP' | 'TvT' | null>(null)
  const [newMatch, setNewMatch] = useState({
    sideA: "", 
    sideB: "", 
    nassau: 5, 
    press: 5, 
    birdie: 2, 
    eagle: 5, // NEW: Eagle Bet Unit
    handicap: 0
  })

  useEffect(() => {
    onValue(ref(db, 'tournament/matchups'), snap => setMatches(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const saveMatch = () => {
    if (!newMatch.sideA || !newMatch.sideB || newMatch.sideA === newMatch.sideB) {
      return alert("PLEASE SELECT TWO DISTINCT SIDES");
    }
    const mRef = push(ref(db, 'tournament/matchups'));
    set(mRef, { 
      id: mRef.key, 
      type: isBuilding, 
      ...newMatch 
    });
    setIsBuilding(null);
    setNewMatch({ sideA: "", sideB: "", nassau: 5, press: 5, birdie: 2, eagle: 5, handicap: 0 });
  }

  const deleteMatch = (id: string) => {
    if (confirm("DELETE THIS MATCHUP?")) set(ref(db, `tournament/matchups/${id}`), null);
  }

  const options = isBuilding === 'PvP' ? players : teams;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-5xl mx-auto space-y-12">
        {/* ACTION SELECTORS */}
        {!isBuilding && (
          <div className="flex gap-4">
            <button onClick={() => setIsBuilding('PvP')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-emerald-500 transition-all text-xl group">
              <User size={40} className="text-emerald-500 group-hover:scale-110 transition-transform" /> CREATE 1v1 MATCH
            </button>
            <button onClick={() => setIsBuilding('TvT')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-blue-500 transition-all text-xl group">
              <Users size={40} className="text-blue-500 group-hover:scale-110 transition-transform" /> CREATE TEAM MATCH
            </button>
          </div>
        )}

        {/* BUILDER FORM */}
        {isBuilding && (
          <div className="bg-zinc-900 p-8 rounded-[3rem] border-2 border-emerald-500 shadow-2xl animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-8 border-b-2 border-zinc-800 pb-4">
              <h2 className="text-3xl font-black text-emerald-500">NEW {isBuilding} MATCHUP</h2>
              <button onClick={() => setIsBuilding(null)} className="text-zinc-500 hover:text-rose-500 font-black">CANCEL</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <label className="text-zinc-500 font-black text-xs">SIDE A</label>
                <select value={newMatch.sideA} onChange={e => setNewMatch({...newMatch, sideA: e.target.value})} className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none">
                  <option value="">SELECT...</option>
                  {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-zinc-500 font-black text-xs">SIDE B</label>
                <select value={newMatch.sideB} onChange={e => setNewMatch({...newMatch, sideB: e.target.value})} className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none">
                  <option value="">SELECT...</option>
                  {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
            </div>

            {/* STAKES CONFIGURATION (4 COLUMNS) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-black p-6 rounded-2xl border border-zinc-800">
              <div>
                <label className="text-zinc-500 font-black text-[10px] block mb-2">NASSAU BASE ($)</label>
                <input type="number" value={newMatch.nassau} onChange={e => setNewMatch({...newMatch, nassau: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-xl font-black text-white outline-none border border-zinc-700" />
              </div>
              <div>
                <label className="text-zinc-500 font-black text-[10px] block mb-2">PRESS AMT ($)</label>
                <input type="number" value={newMatch.press} onChange={e => setNewMatch({...newMatch, press: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-xl font-black text-yellow-500 outline-none border border-zinc-700" />
              </div>
              <div>
                <label className="text-zinc-500 font-black text-[10px] block mb-2">BIRDIE UNIT ($)</label>
                <input type="number" value={newMatch.birdie} onChange={e => setNewMatch({...newMatch, birdie: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-xl font-black text-blue-400 outline-none border border-zinc-700" />
              </div>
              <div>
                <label className="text-emerald-600 font-black text-[10px] block mb-2 tracking-widest">EAGLE UNIT ($)</label>
                <input type="number" value={newMatch.eagle} onChange={e => setNewMatch({...newMatch, eagle: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-xl font-black text-emerald-400 outline-none border border-zinc-700" placeholder="e.g. 5" />
              </div>
            </div>

            <button onClick={saveMatch} className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-2xl flex justify-center items-center gap-2 hover:bg-emerald-400 shadow-xl transition-all">
              <Save size={24} /> SAVE MATCHUP
            </button>
          </div>
        )}

        {/* ACTIVE SIDE BETS LIST */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Target size={20} className="text-zinc-600" />
            <h3 className="text-xl font-black text-zinc-500 uppercase tracking-tighter">Active Side Bets ({matches.length})</h3>
          </div>
          
          {matches.length === 0 && (
            <p className="text-zinc-600 font-black text-sm p-8 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800 text-center">
              NO MATCHUPS CONFIGURED. TAP ABOVE TO START.
            </p>
          )}

          {matches.map((m) => (
            <div key={m.id} className="bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl group">
              <div className="flex-1 w-full flex items-center justify-between bg-black p-4 rounded-xl border border-zinc-800">
                <span className={`font-black truncate ${m.type === 'PvP' ? 'text-emerald-500' : 'text-blue-500'}`}>{m.sideA}</span>
                <Sword size={20} className="text-zinc-600 mx-4 flex-shrink-0" />
                <span className={`font-black truncate text-right ${m.type === 'PvP' ? 'text-emerald-500' : 'text-blue-500'}`}>{m.sideB}</span>
              </div>
              
              {/* DISPLAYING ALL 4 STAKES */}
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 tracking-widest bg-black px-4 py-3 rounded-xl border border-zinc-800">
                <span title="Nassau">N: <span className="text-white">${m.nassau}</span></span> | 
                <span title="Press">P: <span className="text-yellow-500">${m.press}</span></span> | 
                <span title="Birdie">B: <span className="text-blue-400">${m.birdie}</span></span> | 
                <span title="Eagle" className="text-emerald-500">E: <span className="text-emerald-400">${m.eagle}</span></span>
              </div>
              
              <button onClick={() => deleteMatch(m.id)} className="text-zinc-700 hover:text-rose-500 transition-colors p-2">
                <Trash2 size={24}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}