"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, Trash2, UserPlus, Users, Shield, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function RosterPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")

  useEffect(() => {
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  // 1. Player Management
  const addPlayer = () => {
    if (!newPlayerName) return;
    const pRef = push(ref(db, 'tournament/roster'));
    set(pRef, { id: pRef.key, name: newPlayerName.toUpperCase() });
    setNewPlayerName("");
  }

  // 2. Team Management with Validation
  const addTeam = () => {
    if (!newTeamName) return;
    const tRef = push(ref(db, 'tournament/teams'));
    set(tRef, { id: tRef.key, name: newTeamName.toUpperCase(), playerIds: [] });
    setNewTeamName("");
  }

  const assignPlayerToTeam = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team.playerIds?.length >= 4) return alert("TEAM FULL (MAX 4)");
    if (teams.some(t => t.playerIds?.includes(playerId))) return alert("PLAYER ALREADY ON A TEAM");
    
    const updatedIds = [...(team.playerIds || []), playerId];
    set(ref(db, `tournament/teams/${teamId}/playerIds`), updatedIds);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block"><ArrowLeft size={18} /> BACK</Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
        {/* MASTER ROSTER */}
        <section className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-8 text-emerald-500"><UserPlus /><h2 className="text-3xl font-black italic">Master Roster</h2></div>
          <div className="flex gap-2 mb-8">
            <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="PLAYER NAME" className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-emerald-400 outline-none" />
            <button onClick={addPlayer} className="bg-emerald-500 text-black px-6 rounded-xl font-black">ADD</button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {players.map(p => (
              <div key={p.id} className="bg-black/40 p-4 rounded-xl flex justify-between items-center border border-zinc-800">
                <span className="font-black">{p.name}</span>
                <button onClick={() => set(ref(db, `tournament/roster/${p.id}`), null)} className="text-zinc-700 hover:text-rose-500"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* TEAM BUILDER */}
        <section className="space-y-6">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-8 text-blue-500"><Users /><h2 className="text-3xl font-black italic">Team Builder</h2></div>
            <div className="flex gap-2 mb-8">
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="TEAM NAME" className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-blue-400 outline-none" />
              <button onClick={addTeam} className="bg-blue-500 text-black px-6 rounded-xl font-black">CREATE</button>
            </div>
            
            <div className="space-y-6">
              {teams.map(t => (
                <div key={t.id} className="bg-black p-6 rounded-3xl border-2 border-zinc-800 relative">
                  <button onClick={() => set(ref(db, `tournament/teams/${t.id}`), null)} className="absolute top-4 right-4 text-zinc-700"><Trash2 size={16}/></button>
                  <h3 className="text-xl font-black text-emerald-500 mb-4">{t.name}</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[0,1,2,3].map(i => {
                      const pid = t.playerIds?.[i];
                      const p = players.find(x => x.id === pid);
                      return (
                        <div key={i} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-[10px] font-black text-zinc-500">
                          {p ? p.name : <span className="text-zinc-700">EMPTY SLOT</span>}
                        </div>
                      )
                    })}
                  </div>
                  <select onChange={(e) => assignPlayerToTeam(t.id, e.target.value)} className="w-full bg-zinc-800 p-2 rounded-lg text-[10px] font-black uppercase">
                    <option value="">+ ASSIGN PLAYER</option>
                    {players.filter(p => !teams.some(team => team.playerIds?.includes(p.id))).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}