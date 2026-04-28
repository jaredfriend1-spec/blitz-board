"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, UserPlus, Trash2, Users, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: "", handicap: 0 })
  const [newTeamName, setNewTeamName] = useState("")

  useEffect(() => {
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const addPlayer = () => {
    if (!newPlayer.name) return
    const pRef = push(ref(db, 'tournament/roster'))
    set(pRef, { id: pRef.key, ...newPlayer })
    setNewPlayer({ name: "", handicap: 0 })
  }

  const createTeam = () => {
    if (!newTeamName) return
    const tRef = push(ref(db, 'tournament/teams'))
    set(tRef, { id: tRef.key, name: newTeamName, playerIds: [] })
    setNewTeamName("")
  }

  const togglePlayerOnTeam = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    
    let pIds = [...(team.playerIds || [])]
    const isAlreadyOnThisTeam = pIds.includes(playerId)
    
    // Constraint 1: Check if already on ANOTHER team
    const onOtherTeam = teams.some(t => t.id !== teamId && (t.playerIds || []).includes(playerId))
    if (onOtherTeam && !isAlreadyOnThisTeam) return; // Silent block

    if (isAlreadyOnThisTeam) {
      pIds = pIds.filter(id => id !== playerId)
    } else {
      // Constraint 2: 4-Player Cap
      if (pIds.length >= 4) return; // Silent block
      pIds.push(playerId)
    }
    set(ref(db, `tournament/teams/${teamId}/playerIds`), pIds)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* PLAYER LIST */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-emerald-500"><UserPlus size={32}/><h2 className="text-4xl font-black">Roster</h2></div>
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 space-y-4">
            <input value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-black text-white" placeholder="NAME" />
            <div className="flex gap-4">
              <input type="number" value={newPlayer.handicap} onChange={e => setNewPlayer({...newPlayer, handicap: Number(e.target.value)})} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white" placeholder="HCP" />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-8 rounded-xl font-black">ADD</button>
            </div>
          </div>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                <span className="font-black text-xl">{p.name} <span className="text-emerald-500 text-sm ml-2">({p.handicap})</span></span>
                <button onClick={() => set(ref(db, `tournament/roster/${p.id}`), null)} className="text-zinc-700 hover:text-rose-500"><Trash2 size={20}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* TEAM MANAGER */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-blue-500"><Users size={32}/><h2 className="text-4xl font-black">Teams</h2></div>
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 flex gap-4">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white" placeholder="TEAM NAME" />
            <button onClick={createTeam} className="bg-blue-600 text-white px-8 rounded-xl font-black">CREATE</button>
          </div>

          <div className="space-y-6">
            {teams.map(t => (
              <div key={t.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black">{t.name} <span className="text-zinc-600 text-xs ml-2">({(t.playerIds || []).length}/4)</span></h3>
                  <button onClick={() => set(ref(db, `tournament/teams/${t.id}`), null)} className="text-zinc-700 hover:text-rose-500"><X size={20}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {players.map(p => {
                    const isCurrent = (t.playerIds || []).includes(p.id)
                    const isTaken = teams.some(other => other.id !== t.id && (other.playerIds || []).includes(p.id))
                    const isFull = (t.playerIds || []).length >= 4 && !isCurrent

                    return (
                      <button 
                        key={p.id} 
                        disabled={isTaken}
                        onClick={() => togglePlayerOnTeam(t.id, p.id)}
                        className={`p-3 rounded-xl font-black text-[10px] text-left border-2 transition-all 
                          ${isCurrent ? 'bg-blue-600 border-blue-400 text-white' : 
                            isTaken ? 'bg-zinc-950 border-transparent text-zinc-800 opacity-30 cursor-not-allowed' : 
                            isFull ? 'bg-black border-zinc-800 text-zinc-800' :
                            'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}