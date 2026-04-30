"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, User, Users, Sword, Trash2, Save, Target, Zap, ZapOff } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_MATCH = {
  sideA: "" as string,
  sideB: "" as string,
  sideA2: "" as string, // 2v2 second player
  sideB2: "" as string, // 2v2 second player
  nassau: 5,
  press: 5,
  birdie: 2,
  eagle: 5,
  scoringType: 'NET' as 'NET' | 'GROSS',
  autoPress: true,
}

type MatchType = 'PvP' | '2v2' | 'TvT'

export default function MatchupCenter() {
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [isBuilding, setIsBuilding] = useState<MatchType | null>(null)
  const [newMatch, setNewMatch] = useState({ ...DEFAULT_MATCH })

  useEffect(() => {
    onValue(ref(db,'tournament/matchups'), snap => setMatches(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db,'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db,'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const saveMatch = () => {
    if (!newMatch.sideA || !newMatch.sideB) return alert("PLEASE SELECT BOTH SIDES")
    if (newMatch.sideA === newMatch.sideB) return alert("SIDES MUST BE DIFFERENT PLAYERS")
    if (isBuilding === '2v2') {
      if (!newMatch.sideA2 || !newMatch.sideB2) return alert("PLEASE SELECT ALL 4 PLAYERS FOR 2V2")
      const picked = [newMatch.sideA, newMatch.sideA2, newMatch.sideB, newMatch.sideB2]
      if (new Set(picked).size !== 4) return alert("ALL 4 PLAYERS MUST BE DIFFERENT")
    }
    const mRef = push(ref(db,'tournament/matchups'))
    set(mRef, { id: mRef.key, type: isBuilding, ...newMatch })
    setIsBuilding(null)
    setNewMatch({ ...DEFAULT_MATCH })
  }

  const deleteMatch = (id: string) => {
    if (confirm("DELETE THIS MATCHUP?")) set(ref(db,`tournament/matchups/${id}`), null)
  }

  const isPvPLike = isBuilding === 'PvP' || isBuilding === '2v2'

  // For player selects — filter out already selected players in 2v2
  const getAvailablePlayers = (exclude: string[]) =>
    players.filter(p => !exclude.filter(Boolean).includes(p.name))

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-5xl mx-auto space-y-10">

        {/* TYPE SELECTOR */}
        {!isBuilding && (
          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => setIsBuilding('PvP')}
              className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:border-emerald-500 transition-all group">
              <User size={36} className="text-emerald-500 group-hover:scale-110 transition-transform"/>
              <span className="text-sm">1 v 1</span>
              <span className="text-[9px] text-zinc-600 font-black tracking-widest normal-case">Player vs Player</span>
            </button>
            <button onClick={() => setIsBuilding('2v2')}
              className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:border-amber-500 transition-all group">
              <div className="flex gap-1 group-hover:scale-110 transition-transform">
                <User size={28} className="text-amber-400"/>
                <User size={28} className="text-amber-400"/>
              </div>
              <span className="text-sm">2 v 2</span>
              <span className="text-[9px] text-zinc-600 font-black tracking-widest normal-case">Best Ball Partners</span>
            </button>
            <button onClick={() => setIsBuilding('TvT')}
              className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] font-black flex flex-col items-center gap-3 hover:border-blue-500 transition-all group">
              <Users size={36} className="text-blue-500 group-hover:scale-110 transition-transform"/>
              <span className="text-sm">Team v Team</span>
              <span className="text-[9px] text-zinc-600 font-black tracking-widest normal-case">Full Team Match</span>
            </button>
          </div>
        )}

        {/* BUILDER */}
        {isBuilding && (
          <div className="bg-zinc-900 p-6 sm:p-8 rounded-[3rem] border-2 border-emerald-500 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b-2 border-zinc-800">
              <h2 className="text-2xl font-black text-emerald-500">
                NEW {isBuilding === '2v2' ? '2V2' : isBuilding} MATCHUP
              </h2>
              <button onClick={() => setIsBuilding(null)} className="text-zinc-500 hover:text-rose-500 font-black transition-colors">CANCEL</button>
            </div>

            {/* SIDES */}
            {isBuilding === 'TvT' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE A — TEAM</label>
                  <select value={newMatch.sideA} onChange={e => setNewMatch({...newMatch, sideA: e.target.value})}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500">
                    <option value="">SELECT TEAM...</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE B — TEAM</label>
                  <select value={newMatch.sideB} onChange={e => setNewMatch({...newMatch, sideB: e.target.value})}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500">
                    <option value="">SELECT TEAM...</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {isBuilding === 'PvP' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE A — PLAYER</label>
                  <select value={newMatch.sideA} onChange={e => setNewMatch({...newMatch, sideA: e.target.value})}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500">
                    <option value="">SELECT PLAYER...</option>
                    {players.map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE B — PLAYER</label>
                  <select value={newMatch.sideB} onChange={e => setNewMatch({...newMatch, sideB: e.target.value})}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500">
                    <option value="">SELECT PLAYER...</option>
                    {players.map(p => <option key={p.id} value={p.name}>{p.name} (HCP {p.handicap})</option>)}
                  </select>
                </div>
              </div>
            )}

            {isBuilding === '2v2' && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-500 tracking-widest">SIDE A — 2 PARTNERS</p>
                <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <div className="space-y-2">
                    <label className="text-amber-500 font-black text-[10px] tracking-widest">PLAYER 1</label>
                    <select value={newMatch.sideA}
                      onChange={e => setNewMatch({...newMatch, sideA: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none focus:border-amber-500 text-sm">
                      <option value="">SELECT...</option>
                      {getAvailablePlayers([newMatch.sideA2,newMatch.sideB,newMatch.sideB2]).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-amber-500 font-black text-[10px] tracking-widest">PLAYER 2</label>
                    <select value={newMatch.sideA2}
                      onChange={e => setNewMatch({...newMatch, sideA2: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none focus:border-amber-500 text-sm">
                      <option value="">SELECT...</option>
                      {getAvailablePlayers([newMatch.sideA,newMatch.sideB,newMatch.sideB2]).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] font-black text-zinc-500 tracking-widest">SIDE B — 2 PARTNERS</p>
                <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                  <div className="space-y-2">
                    <label className="text-blue-400 font-black text-[10px] tracking-widest">PLAYER 1</label>
                    <select value={newMatch.sideB}
                      onChange={e => setNewMatch({...newMatch, sideB: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none focus:border-blue-500 text-sm">
                      <option value="">SELECT...</option>
                      {getAvailablePlayers([newMatch.sideA,newMatch.sideA2,newMatch.sideB2]).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-blue-400 font-black text-[10px] tracking-widest">PLAYER 2</label>
                    <select value={newMatch.sideB2}
                      onChange={e => setNewMatch({...newMatch, sideB2: e.target.value})}
                      className="w-full bg-black border border-zinc-700 p-3 rounded-xl font-black text-white outline-none focus:border-blue-500 text-sm">
                      <option value="">SELECT...</option>
                      {getAvailablePlayers([newMatch.sideA,newMatch.sideA2,newMatch.sideB]).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 font-black normal-case tracking-wider">
                  Best ball of the 2 partners counts per hole. Same scoring as 1v1 — Nassau, press, birdies.
                </p>
              </div>
            )}

            {/* GROSS / NET */}
            <div className="bg-black p-5 rounded-2xl border border-zinc-800">
              <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-3">SCORING TYPE</label>
              <div className="flex gap-3">
                <button onClick={() => setNewMatch({...newMatch, scoringType:'NET'})}
                  className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 ${newMatch.scoringType==='NET'?'bg-emerald-500 border-emerald-400 text-black':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                  NET<div className="text-[9px] font-black mt-0.5 opacity-70">USES HANDICAPS</div>
                </button>
                <button onClick={() => setNewMatch({...newMatch, scoringType:'GROSS'})}
                  className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 ${newMatch.scoringType==='GROSS'?'bg-rose-500 border-rose-400 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                  GROSS<div className="text-[9px] font-black mt-0.5 opacity-70">SCRATCH · NO STROKES</div>
                </button>
              </div>
            </div>

            {/* AUTO-PRESS — PvP and 2v2 only */}
            {isPvPLike && (
              <div className="bg-black p-5 rounded-2xl border border-zinc-800">
                <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-3">AUTOMATIC PRESSES</label>
                <div className="flex gap-3">
                  <button onClick={() => setNewMatch({...newMatch, autoPress:true})}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2 ${newMatch.autoPress?'bg-yellow-500/20 border-yellow-500/60 text-yellow-400':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    <Zap size={16}/> AUTO-PRESS ON
                  </button>
                  <button onClick={() => setNewMatch({...newMatch, autoPress:false})}
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2 ${!newMatch.autoPress?'bg-zinc-700 border-zinc-500 text-white':'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    <ZapOff size={16}/> NO PRESSES
                  </button>
                </div>
              </div>
            )}

            {/* STAKES */}
            <div className="bg-black p-5 rounded-2xl border border-zinc-800">
              <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-4">STAKES</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-zinc-600 font-black text-[10px] block mb-2">NASSAU ($)</label>
                  <input type="number" value={newMatch.nassau} onChange={e => setNewMatch({...newMatch, nassau:Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-white outline-none border border-zinc-700 focus:border-emerald-500"/>
                </div>
                {isPvPLike && (
                  <div>
                    <label className="text-yellow-600 font-black text-[10px] block mb-2">PRESS ($)</label>
                    <input type="number" value={newMatch.press} onChange={e => setNewMatch({...newMatch, press:Number(e.target.value)})}
                      className="w-full bg-zinc-900 p-3 rounded-xl font-black text-yellow-400 outline-none border border-zinc-700 focus:border-yellow-500"/>
                  </div>
                )}
                <div>
                  <label className="text-blue-600 font-black text-[10px] block mb-2">BIRDIE ($)</label>
                  <input type="number" value={newMatch.birdie} onChange={e => setNewMatch({...newMatch, birdie:Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-blue-400 outline-none border border-zinc-700 focus:border-blue-500"/>
                </div>
                <div>
                  <label className="text-emerald-600 font-black text-[10px] block mb-2">EAGLE ($)</label>
                  <input type="number" value={newMatch.eagle} onChange={e => setNewMatch({...newMatch, eagle:Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-emerald-400 outline-none border border-zinc-700 focus:border-emerald-500"/>
                </div>
              </div>
            </div>

            <button onClick={saveMatch}
              className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-xl flex justify-center items-center gap-2 hover:bg-emerald-400 shadow-xl transition-all">
              <Save size={22}/> SAVE MATCHUP
            </button>
          </div>
        )}

        {/* ACTIVE MATCHES */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-zinc-600"/>
            <h3 className="text-lg font-black text-zinc-500 tracking-tight">ACTIVE MATCHES ({matches.length})</h3>
          </div>

          {matches.length === 0 && (
            <p className="text-zinc-700 font-black text-sm p-8 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800 text-center">
              NO MATCHUPS CONFIGURED YET
            </p>
          )}

          {matches.map(m => {
            const sideALabel = m.type === '2v2' ? `${m.sideA} + ${m.sideA2}` : m.sideA
            const sideBLabel = m.type === '2v2' ? `${m.sideB} + ${m.sideB2}` : m.sideB
            const typeColor = m.type === 'TvT' ? 'text-blue-400' : m.type === '2v2' ? 'text-amber-400' : 'text-emerald-400'
            return (
              <div key={m.id} className="bg-zinc-900 p-5 rounded-[2rem] border-2 border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex-1 flex items-center justify-between bg-black p-4 rounded-xl border border-zinc-800 min-w-0">
                  <span className={`font-black truncate text-sm ${typeColor}`}>{sideALabel}</span>
                  <Sword size={16} className="text-zinc-600 mx-3 flex-shrink-0"/>
                  <span className={`font-black truncate text-sm text-right ${typeColor}`}>{sideBLabel}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-400">{m.type}</span>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${m.scoringType==='GROSS'?'bg-rose-500/20 text-rose-400':'bg-emerald-500/20 text-emerald-400'}`}>
                    {m.scoringType||'NET'}
                  </span>
                  {(m.type === 'PvP' || m.type === '2v2') && (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${m.autoPress!==false?'bg-yellow-500/20 text-yellow-400':'bg-zinc-800 text-zinc-600'}`}>
                      {m.autoPress!==false?<Zap size={10}/>:<ZapOff size={10}/>}
                      {m.autoPress!==false?'PRESS':'NO PRESS'}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 bg-black px-3 py-2 rounded-xl border border-zinc-800">
                    <span>N:<span className="text-white ml-0.5">${m.nassau}</span></span>
                    <span className="text-zinc-700">·</span>
                    <span>B:<span className="text-blue-400 ml-0.5">${m.birdie}</span></span>
                    <span className="text-zinc-700">·</span>
                    <span>E:<span className="text-emerald-400 ml-0.5">${m.eagle}</span></span>
                  </div>
                </div>
                <button onClick={() => deleteMatch(m.id)} className="text-zinc-700 hover:text-rose-500 transition-colors p-1 flex-shrink-0">
                  <Trash2 size={20}/>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}