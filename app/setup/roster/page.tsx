"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push, get } from 'firebase/database'
import { ArrowLeft, Trash2, UserPlus, Users, Shield, X } from 'lucide-react'
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

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const pRef = push(ref(db, 'tournament/roster'));
    set(pRef, { id: pRef.key, name: newPlayerName.toUpperCase() });
    setNewPlayerName("");
  }

  const deletePlayer = (id: string) => {
    if (confirm("Delete player? They will be removed from all teams.")) {
      set(ref(db, `tournament/roster/${id}`), null);
      // Remove from any teams
      teams.forEach(t => {
        if (t.playerIds?.includes(id)) {
          set(ref(db, `tournament/teams/${t.id}/playerIds`), t.playerIds.filter((pid: string) => pid !== id));
        }
      });
    }
  }

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const tRef = push(ref(db, 'tournament/teams'));
    set(tRef, { id: tRef.key, name: newTeamName.toUpperCase(), playerIds: [] });
    setNewTeamName("");
  }

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This will wipe their matchups too.`)) return;
    await set(ref(db, `tournament/teams/${id}`), null);
    
    // Cascade delete matchups
    const mSnap = await get(ref(db, 'tournament/matchups'));
    if (mSnap.exists()) {
      const matchups = mSnap.val();
      Object.keys(matchups).forEach(key => {
        if (matchups[key].sideA === name || matchups[key].sideB === name) set(ref(db, `tournament/matchups/${key}`), null);
      });
    }
  }

  const assignPlayer = (teamId: string, playerId: string) => {
    if (!playerId) return;
    const team = teams.find(t => t.id === teamId);
    if ((team.playerIds || []).length >= 4) return alert("TEAM FULL");
    set(ref(db, `tournament/teams/${teamId}/playerIds`), [...(team.playerIds || []), playerId]);
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> BACK</Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        
        {/* MASTER ROSTER */}
        <section className="bg-zinc-900 p-8 rounded-[2rem] border-2 border-zinc-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 text-emerald-500"><UserPlus size={28}/><h2 className="text-3xl font-black">Master Roster</h2></div>
          <div className="flex gap-2 mb-6">
            <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="ADD PLAYER" className="flex-1 bg-black border border-zinc-700 p-4 rounded-xl font-black text-emerald-400 outline-none" />
            <button onClick={addPlayer} className="bg-emerald-500 text-black px-6 rounded-xl font-black">ADD</button>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[500px]">
            {players.map(p => (
              <div key={p.id} className="bg-black p-4 rounded-xl flex justify-between items-center border border-zinc-800">
                <span className="font-black text-zinc-300">{p.name}</span>
                <button onClick={() => deletePlayer(p.id)} className="text-zinc-600 hover:text-rose-500"><Trash2 size={18}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* TEAM BUILDER */}
        <section className="bg-zinc-900 p-8 rounded-[2rem] border-2 border-zinc-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 text-blue-500"><Users size={28}/><h2 className="text-3xl font-black">Team Builder</h2></div>
          <div className="flex gap-2 mb-6">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="ADD TEAM" className="flex-1 bg-black border border-zinc-700 p-4 rounded-xl font-black text-blue-400 outline-none" />
            <button onClick={addTeam} className="bg-blue-500 text-black px-6 rounded-xl font-black">CREATE</button>
          </div>
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            {teams.map(t => (
              <div key={t.id} className="bg-black p-6 rounded-2xl border border-zinc-700 relative">
                <button onClick={() => deleteTeam(t.id, t.name)} className="absolute top-4 right-4 text-zinc-600 hover:text-rose-500"><Trash2 size={18}/></button>
                <div className="flex items-center gap-2 text-emerald-500 font-black text-xl mb-4"><Shield size={20}/> {t.name}</div>
                <div className="space-y-2 mb-4">
                  {[0,1,2,3].map(i => {
                    const pid = (t.playerIds || [])[i];
                    const p = players.find(x => x.id === pid);
                    return (
                      <div key={i} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center text-xs font-black">
                        <span className={p ? "text-white" : "text-zinc-600"}>{p ? p.name : `SLOT ${i+1} - EMPTY`}</span>
                        {p && <button onClick={() => set(ref(db, `tournament/teams/${t.id}/playerIds`), t.playerIds.filter((x:string) => x !== p.id))} className="text-zinc-500 hover:text-rose-500"><X size={14}/></button>}
                      </div>
                    )
                  })}
                </div>
                <select onChange={(e) => assignPlayer(t.id, e.target.value)} value="" className="w-full bg-zinc-800 text-zinc-300 p-3 rounded-lg text-xs font-black outline-none border border-zinc-700">
                  <option value="">+ ASSIGN PLAYER</option>
                  {players.filter(p => !teams.some(team => (team.playerIds || []).includes(p.id))).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}