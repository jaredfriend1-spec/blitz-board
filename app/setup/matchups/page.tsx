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
  
  const [isBuilding, setIsBuilding] = useState<'PvP' | 'TvT' | null>(null)
  const [newMatch, setNewMatch] = useState({
    sideA: "", 
    sideB: "", 
    nassau: 5, 
    press: 5, 
    birdie: 2, 
    eagle: 5,
    scoringType: 'NET' as 'NET' | 'GROSS',
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
    setNewMatch({ sideA: "", sideB: "", nassau: 5, press: 5, birdie: 2, eagle: 5, scoringType: 'NET' });
  }

  const deleteMatch = (id: string) => {
    if (confirm("DELETE THIS MATCHUP?")) set(ref(db, `tournament/matchups/${id}`), null);
  }

  const options = isBuilding === 'PvP' ? players : teams;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block">
        <ArrowLeft size={18} className="inline mr-2"/> HUB
      </Link>
      
      <div className="max-w-5xl mx-auto space-y-12">

        {/* MATCH TYPE SELECTOR */}
        {!isBuilding && (
          <div className="flex gap-4">
            <button onClick={() => setIsBuilding('PvP')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-emerald-500 transition-all text-xl group">
              <User size={40} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              CREATE 1v1 MATCH
            </button>
            <button onClick={() => setIsBuilding('TvT')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-blue-500 transition-all text-xl group">
              <Users size={40} className="text-blue-500 group-hover:scale-110 transition-transform" />
              CREATE TEAM MATCH
            </button>
          </div>
        )}

        {/* BUILDER FORM */}
        {isBuilding && (
          <div className="bg-zinc-900 p-8 rounded-[3rem] border-2 border-emerald-500 shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b-2 border-zinc-800 pb-4">
              <h2 className="text-3xl font-black text-emerald-500">NEW {isBuilding} MATCHUP</h2>
              <button onClick={() => setIsBuilding(null)} className="text-zinc-500 hover:text-rose-500 font-black">CANCEL</button>
            </div>
            
            {/* SIDE A / SIDE B */}
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

            {/* GROSS / NET TOGGLE — the new piece */}
            <div className="mb-8 bg-black p-6 rounded-2xl border border-zinc-800">
              <label className="text-zinc-500 font-black text-[10px] block mb-3 tracking-widest">SCORING TYPE</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewMatch({...newMatch, scoringType: 'NET'})}
                  className={`flex-1 py-4 rounded-xl font-black text-lg transition-all border-2 ${
                    newMatch.scoringType === 'NET'
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  NET
                  <div className="text-[9px] font-black mt-1 opacity-70 tracking-widest">USES HANDICAPS</div>
                </button>
                <button
                  onClick={() => setNewMatch({...newMatch, scoringType: 'GROSS'})}
                  className={`flex-1 py-4 rounded-xl font-black text-lg transition-all border-2 ${
                    newMatch.scoringType === 'GROSS'
                      ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  GROSS
                  <div className="text-[9px] font-black mt-1 opacity-70 tracking-widest">SCRATCH · NO STROKES</div>
                </button>
              </div>
            </div>

            {/* STAKES */}
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
                <input type="number" value={newMatch.eagle} onChange={e => setNewMatch({...newMatch, eagle: Number(e.target.value)})} className="w-full bg-zinc-900 p-3 rounded-xl font-black text-emerald-400 outline-none border border-zinc-700" />
              </div>
            </div>

            <button onClick={saveMatch} className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-2xl flex justify-center items-center gap-2 hover:bg-emerald-400 shadow-xl transition-all">
              <Save size={24} /> SAVE MATCHUP
            </button>
          </div>
        )}

        {/* ACTIVE MATCHES LIST */}
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
            <div key={m.id} className="bg-zinc-900 p-6 rounded-[2rem] border-2 border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="flex-1 w-full flex items-center justify-between bg-black p-4 rounded-xl border border-zinc-800">
                <span className={`font-black truncate ${m.type === 'PvP' ? 'text-emerald-500' : 'text-blue-500'}`}>{m.sideA}</span>
                <Sword size={20} className="text-zinc-600 mx-4 flex-shrink-0" />
                <span className={`font-black truncate text-right ${m.type === 'PvP' ? 'text-emerald-500' : 'text-blue-500'}`}>{m.sideB}</span>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Scoring type badge */}
                <span className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider ${
                  m.scoringType === 'GROSS' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {m.scoringType || 'NET'}
                </span>
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 tracking-widest bg-black px-4 py-2 rounded-xl border border-zinc-800">
                  <span>N:<span className="text-white ml-1">${m.nassau}</span></span>
                  <span className="text-zinc-700">|</span>
                  <span>P:<span className="text-yellow-500 ml-1">${m.press}</span></span>
                  <span className="text-zinc-700">|</span>
                  <span>B:<span className="text-blue-400 ml-1">${m.birdie}</span></span>
                  <span className="text-zinc-700">|</span>
                  <span>E:<span className="text-emerald-400 ml-1">${m.eagle}</span></span>
                </div>
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