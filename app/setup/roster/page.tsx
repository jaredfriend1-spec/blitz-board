"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, UserPlus, Trash2, Users, Save, X } from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: "", handicap: 0 })
  const [newTeamName, setNewTeamName] = useState("")

  useEffect(() => {
    // Sync Players
    onValue(ref(db, 'tournament/roster'), snap => {
      const data = snap.val()
      setPlayers(data ? Object.values(data) : [])
    })
    // Sync Teams
    onValue(ref(db, 'tournament/teams'), snap => {
      const data = snap.val()
      setTeams(data ? Object.values(data) : [])
    })
  }, [])

  const addPlayer = () => {
    if (!newPlayer.name) return
    const pRef = push(ref(db, 'tournament/roster'))
    set(pRef, { id: pRef.key, ...newPlayer })
    setNewPlayer({ name: "", handicap: 0 })
  }

  const deletePlayer = (id: string) => {
    if (confirm("DELETE PLAYER?")) set(ref(db, `tournament/roster/${id}`), null)
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
    if (pIds.includes(playerId)) {
      pIds = pIds.filter(id => id !== playerId)
    } else {
      pIds.push(playerId)
    }
    set(ref(db, `tournament/teams/${teamId}/playerIds`), pIds)
  }

  const deleteTeam = (id: string) => {
    if (confirm("DELETE TEAM?")) set(ref(db, `tournament/teams/${id}`), null)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* LEFT: ROSTER LIST */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-emerald-500"><UserPlus size={32}/><h2 className="text-4xl font-black">Manage Roster</h2></div>
          
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 space-y-4">
            <input value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500" placeholder="PLAYER NAME" />
            <div className="flex gap-4">
              <input type="number" value={newPlayer.handicap} onChange={e => setNewPlayer({...newPlayer, handicap: Number(e.target.value)})} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none" placeholder="HCP" />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-8 rounded-xl font-black hover:bg-emerald-400">ADD</button>
            </div>
          </div>

          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center group">
                <div>
                  <span className="font-black text-xl mr-4">{p.name}</span>
                  <span className="text-emerald-500 font-black text-sm">HCP: {p.handicap}</span>
                </div>
                <button onClick={() => deletePlayer(p.id)} className="text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: TEAM MANAGER */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-blue-500"><Users size={32}/><h2 className="text-4xl font-black">Manage Teams</h2></div>
          
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 flex gap-4">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none focus:border-blue-500" placeholder="NEW TEAM NAME" />
            <button onClick={createTeam} className="bg-blue-600 text-white px-8 rounded-xl font-black hover:bg-blue-500">CREATE</button>
          </div>

          <div className="space-y-6">
            {teams.map(t => (
              <div key={t.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-zinc-800 space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                  <h3 className="text-2xl font-black text-white">{t.name}</h3>
                  <button onClick={() => deleteTeam(t.id)} className="text-zinc-700 hover:text-rose-500"><X size={24}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {players.map(p => {
                    const isActive = (t.playerIds || []).includes(p.id)
                    return (
                      <button 
                        key={p.id} 
                        onClick={() => togglePlayerOnTeam(t.id, p.id)}
                        className={`p-3 rounded-xl font-black text-xs text-left transition-all border-2 ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-600'}`}
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