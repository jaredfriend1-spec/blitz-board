"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, User, Users, Sword, Trash2, Save, Target, Zap, ZapOff } from 'lucide-react'
import Link from 'next/link'

const DEFAULT_MATCH = {
  sideA: "",
  sideB: "",
  nassau: 5,
  press: 5,
  birdie: 2,
  eagle: 5,
  scoringType: 'NET' as 'NET' | 'GROSS',
  autoPress: true,
}

export default function MatchupCenter() {
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [isBuilding, setIsBuilding] = useState<'PvP' | 'TvT' | null>(null)
  const [newMatch, setNewMatch] = useState({ ...DEFAULT_MATCH })

  useEffect(() => {
    onValue(ref(db, 'tournament/matchups'), snap => setMatches(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const saveMatch = () => {
    if (!newMatch.sideA || !newMatch.sideB || newMatch.sideA === newMatch.sideB) {
      return alert("PLEASE SELECT TWO DISTINCT SIDES")
    }
    const mRef = push(ref(db, 'tournament/matchups'))
    set(mRef, { id: mRef.key, type: isBuilding, ...newMatch })
    setIsBuilding(null)
    setNewMatch({ ...DEFAULT_MATCH })
  }

  const deleteMatch = (id: string) => {
    if (confirm("DELETE THIS MATCHUP?")) set(ref(db, `tournament/matchups/${id}`), null)
  }

  const options = isBuilding === 'PvP' ? players : teams

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-5xl mx-auto space-y-10">

        {/* TYPE SELECTOR */}
        {!isBuilding && (
          <div className="flex gap-4">
            <button
              onClick={() => setIsBuilding('PvP')}
              className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-emerald-500 transition-all text-xl group"
            >
              <User size={40} className="text-emerald-500 group-hover:scale-110 transition-transform"/>
              CREATE 1v1 MATCH
            </button>
            <button
              onClick={() => setIsBuilding('TvT')}
              className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-blue-500 transition-all text-xl group"
            >
              <Users size={40} className="text-blue-500 group-hover:scale-110 transition-transform"/>
              CREATE TEAM MATCH
            </button>
          </div>
        )}

        {/* BUILDER */}
        {isBuilding && (
          <div className="bg-zinc-900 p-6 sm:p-8 rounded-[3rem] border-2 border-emerald-500 shadow-2xl space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-zinc-800">
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-500">NEW {isBuilding} MATCHUP</h2>
              <button onClick={() => setIsBuilding(null)} className="text-zinc-500 hover:text-rose-500 font-black transition-colors">CANCEL</button>
            </div>

            {/* Side A / B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE A</label>
                <select
                  value={newMatch.sideA}
                  onChange={e => setNewMatch({...newMatch, sideA: e.target.value})}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">SELECT...</option>
                  {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-zinc-500 font-black text-xs tracking-widest">SIDE B</label>
                <select
                  value={newMatch.sideB}
                  onChange={e => setNewMatch({...newMatch, sideB: e.target.value})}
                  className="w-full bg-black border border-zinc-700 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">SELECT...</option>
                  {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
            </div>

            {/* GROSS / NET Toggle */}
            <div className="bg-black p-5 rounded-2xl border border-zinc-800">
              <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-3">SCORING TYPE</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewMatch({...newMatch, scoringType: 'NET'})}
                  className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 ${
                    newMatch.scoringType === 'NET'
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  NET
                  <div className="text-[9px] font-black mt-0.5 opacity-70 tracking-wider">USES HANDICAPS</div>
                </button>
                <button
                  onClick={() => setNewMatch({...newMatch, scoringType: 'GROSS'})}
                  className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 ${
                    newMatch.scoringType === 'GROSS'
                      ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  GROSS
                  <div className="text-[9px] font-black mt-0.5 opacity-70 tracking-wider">SCRATCH · NO STROKES</div>
                </button>
              </div>
            </div>

            {/* AUTO-PRESS TOGGLE — PvP only */}
            {isBuilding === 'PvP' && (
              <div className="bg-black p-5 rounded-2xl border border-zinc-800">
                <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-3">
                  AUTOMATIC PRESSES
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewMatch({...newMatch, autoPress: true})}
                    className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 flex items-center justify-center gap-2 ${
                      newMatch.autoPress
                        ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400 shadow-lg shadow-yellow-500/10'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                    }`}
                  >
                    <Zap size={16}/>
                    AUTO-PRESS ON
                    <div className="text-[9px] font-black opacity-70 tracking-wider hidden sm:block">FIRES AT ±2 DOWN</div>
                  </button>
                  <button
                    onClick={() => setNewMatch({...newMatch, autoPress: false})}
                    className={`flex-1 py-3 rounded-xl font-black text-base transition-all border-2 flex items-center justify-center gap-2 ${
                      !newMatch.autoPress
                        ? 'bg-zinc-700 border-zinc-500 text-white shadow-lg'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
                    }`}
                  >
                    <ZapOff size={16}/>
                    NO PRESSES
                    <div className="text-[9px] font-black opacity-70 tracking-wider hidden sm:block">STRAIGHT MATCH</div>
                  </button>
                </div>
                <p className="text-[9px] text-zinc-600 font-black mt-2 tracking-wider normal-case">
                  {newMatch.autoPress
                    ? `When a player is 2-down, a new $${newMatch.press} press bet automatically starts.`
                    : 'Match plays straight through with no automatic press bets.'}
                </p>
              </div>
            )}

            {/* STAKES */}
            <div className="bg-black p-5 rounded-2xl border border-zinc-800">
              <label className="text-zinc-500 font-black text-[10px] tracking-widest block mb-4">STAKES</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-zinc-600 font-black text-[10px] block mb-2">NASSAU BASE ($)</label>
                  <input
                    type="number"
                    value={newMatch.nassau}
                    onChange={e => setNewMatch({...newMatch, nassau: Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-white outline-none border border-zinc-700 focus:border-emerald-500"
                  />
                </div>
                {isBuilding === 'PvP' && (
                  <div>
                    <label className="text-yellow-600 font-black text-[10px] block mb-2">PRESS AMT ($)</label>
                    <input
                      type="number"
                      value={newMatch.press}
                      onChange={e => setNewMatch({...newMatch, press: Number(e.target.value)})}
                      className="w-full bg-zinc-900 p-3 rounded-xl font-black text-yellow-400 outline-none border border-zinc-700 focus:border-yellow-500"
                    />
                  </div>
                )}
                <div>
                  <label className="text-blue-600 font-black text-[10px] block mb-2">BIRDIE UNIT ($)</label>
                  <input
                    type="number"
                    value={newMatch.birdie}
                    onChange={e => setNewMatch({...newMatch, birdie: Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-blue-400 outline-none border border-zinc-700 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-emerald-600 font-black text-[10px] block mb-2">EAGLE UNIT ($)</label>
                  <input
                    type="number"
                    value={newMatch.eagle}
                    onChange={e => setNewMatch({...newMatch, eagle: Number(e.target.value)})}
                    className="w-full bg-zinc-900 p-3 rounded-xl font-black text-emerald-400 outline-none border border-zinc-700 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveMatch}
              className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-xl flex justify-center items-center gap-2 hover:bg-emerald-400 shadow-xl transition-all"
            >
              <Save size={22}/> SAVE MATCHUP
            </button>
          </div>
        )}

        {/* ACTIVE MATCHES LIST */}
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

          {matches.map(m => (
            <div
              key={m.id}
              className="bg-zinc-900 p-5 rounded-[2rem] border-2 border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl"
            >
              {/* Sides */}
              <div className="flex-1 flex items-center justify-between bg-black p-4 rounded-xl border border-zinc-800 min-w-0">
                <span className={`font-black truncate text-sm ${m.type === 'PvP' ? 'text-emerald-400' : 'text-blue-400'}`}>{m.sideA}</span>
                <Sword size={16} className="text-zinc-600 mx-3 flex-shrink-0"/>
                <span className={`font-black truncate text-sm text-right ${m.type === 'PvP' ? 'text-emerald-400' : 'text-blue-400'}`}>{m.sideB}</span>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Scoring type */}
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-wider ${
                  m.scoringType === 'GROSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {m.scoringType || 'NET'}
                </span>

                {/* Press indicator — PvP only */}
                {m.type === 'PvP' && (
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                    m.autoPress !== false ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-600'
                  }`}>
                    {m.autoPress !== false ? <Zap size={10}/> : <ZapOff size={10}/>}
                    {m.autoPress !== false ? 'AUTO-PRESS' : 'NO PRESS'}
                  </span>
                )}

                {/* Stakes */}
                <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 bg-black px-3 py-2 rounded-xl border border-zinc-800">
                  <span>N:<span className="text-white ml-0.5">${m.nassau}</span></span>
                  <span className="text-zinc-700">·</span>
                  <span>B:<span className="text-blue-400 ml-0.5">${m.birdie}</span></span>
                  <span className="text-zinc-700">·</span>
                  <span>E:<span className="text-emerald-400 ml-0.5">${m.eagle}</span></span>
                </div>
              </div>

              <button
                onClick={() => deleteMatch(m.id)}
                className="text-zinc-700 hover:text-rose-500 transition-colors p-1 flex-shrink-0"
              >
                <Trash2 size={20}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}