"use client"
import React, { useState, useEffect } from 'react'
import { db } from './lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { Settings, LayoutDashboard, Calculator, DollarSign, Plus, UserPlus, Save, RefreshCw } from 'lucide-react'

export default function BlitzBoardMaster() {
  const [activeTab, setActiveTab] = useState('board')
  const [teams, setTeams] = useState<any[]>([])
  const [scores, setScores] = useState<any>({})
  const UNIT_VALUE = 17

  useEffect(() => {
    onValue(ref(db, 'tournament-teams'), (snap) => { if (snap.val()) setTeams(snap.val()) })
    onValue(ref(db, 'live-scores'), (snap) => { if (snap.val()) setScores(snap.val()) })
  }, [])

  const saveToCloud = () => {
    set(ref(db, 'tournament-teams'), teams)
    alert("CLOUD SYNC COMPLETE")
  }

  const updateScore = (teamName: string, holeIdx: number, playerIdx: number, val: string) => {
    const ns = { ...scores }; if (!ns[teamName]) ns[teamName] = {}; if (!ns[teamName][holeIdx]) ns[teamName][holeIdx] = [0,0,0,0];
    ns[teamName][holeIdx][playerIdx] = parseInt(val) || 0; setScores(ns); set(ref(db, 'live-scores'), ns);
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <div className="p-8 text-center bg-gradient-to-b from-emerald-900/20 to-black border-b border-zinc-800">
        <h1 className="text-4xl font-black tracking-tighter text-emerald-500">BLITZ BOARD</h1>
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 mt-2 uppercase font-bold">Montgomery Country Club • 2026</p>
      </div>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-500"/> TOURNAMENT SETUP</h2>
              <button onClick={() => setTeams([...teams, { name: `TEAM ${teams.length + 1}`, members: ["", ""] }])} className="bg-emerald-500 text-black p-2 rounded-full"><Plus className="w-5 h-5"/></button>
            </div>
            {teams.map((team, tIdx) => (
              <div key={tIdx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <input value={team.name} onChange={(e) => { const nt = [...teams]; nt[tIdx].name = e.target.value; setTeams(nt); }} className="w-full bg-transparent border-b border-emerald-500/50 text-emerald-500 font-bold text-lg outline-none" />
                {team.members.map((m: string, pIdx: number) => (
                  <div key={pIdx} className="flex gap-2">
                    <UserPlus className="w-4 h-4 text-zinc-600 mt-2"/>
                    <input value={m} onChange={(e) => { const nt = [...teams]; nt[tIdx].members[pIdx] = e.target.value; setTeams(nt); }} placeholder="Player Name" className="flex-1 bg-zinc-800 border border-zinc-700 p-2 rounded text-sm outline-none focus:border-emerald-500" />
                  </div>
                ))}
                <button onClick={() => { const nt = [...teams]; nt[tIdx].members.push(""); setTeams(nt); }} className="text-[10px] text-zinc-500 font-bold">+ ADD PLAYER</button>
              </div>
            ))}
            <button onClick={saveToCloud} className="w-full bg-zinc-800 hover:bg-emerald-600 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"><Save className="w-5 h-5"/> SYNC TO ALL PHONES</button>
          </div>
        )}

        {activeTab === 'board' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-emerald-500"/> LIVE LEADERBOARD</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 p-3 bg-zinc-800/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <div className="col-span-2">TEAM</div>
                <div className="text-center">NET</div>
                <div className="text-center">STATUS</div>
              </div>
              {teams.map((team) => (
                <div key={team.name} className="grid grid-cols-4 p-4 border-b border-zinc-800 items-center">
                  <div className="col-span-2">
                    <div className="font-bold text-sm">{team.name}</div>
                    <div className="text-[9px] text-zinc-500 truncate">{team.members.join(' • ')}</div>
                  </div>
                  <div className="text-center font-black text-emerald-500 text-xl">-3</div>
                  <div className="text-center text-[10px] text-zinc-500 font-bold">HOLE 14</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scorer' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-500"/> LIVE SCORER</h2>
            {teams.map((team) => (
              <div key={team.name} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="text-xs font-black text-emerald-500 mb-3">{team.name}</div>
                {team.members.map((player: string, pIdx: number) => (
                  <div key={pIdx} className="mb-4 last:mb-0">
                    <div className="text-[9px] text-zinc-600 font-bold mb-1">{player || `PLAYER ${pIdx+1}`}</div>
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                      {[...Array(18)].map((_, hIdx) => (
                        <div key={hIdx} className="flex-shrink-0">
                          <div className="text-[8px] text-center text-zinc-700 mb-1">{hIdx + 1}</div>
                          <input type="number" inputMode="numeric" value={scores[team.name]?.[hIdx]?.[pIdx] || ""} onChange={(e) => updateScore(team.name, hIdx, pIdx, e.target.value)} className="w-8 h-8 bg-zinc-800 border border-zinc-700 text-center text-xs rounded focus:border-emerald-500 outline-none" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bets' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500"/> BETTING & SKINS</h2>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Current Unit Value</div>
              <div className="text-4xl font-black text-emerald-500">${UNIT_VALUE}</div>
              <div className="mt-6 space-y-3 text-left">
                <div className="flex justify-between text-sm border-b border-zinc-800 pb-2"><span>BIG POOL TOTAL</span><span className="font-bold">$340</span></div>
                <div className="flex justify-between text-sm border-b border-zinc-800 pb-2"><span>SKINS CARRYOVER</span><span className="text-orange-500 font-bold">3 HOLES (DIRTY)</span></div>
                <div className="flex justify-between text-sm"><span>MATCH PRESS STATUS</span><span className="text-zinc-500 uppercase text-[10px] mt-1 font-bold">No Active Press</span></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FIXED NAV BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex justify-around p-3 z-50">
        {[
          { id: 'board', icon: LayoutDashboard, label: 'BOARD' },
          { id: 'scorer', icon: Calculator, label: 'SCORER' },
          { id: 'setup', icon: Settings, label: 'SETUP' },
          { id: 'bets', icon: DollarSign, label: 'BETS' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-emerald-500' : 'text-zinc-600'}`}>
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] font-black tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
