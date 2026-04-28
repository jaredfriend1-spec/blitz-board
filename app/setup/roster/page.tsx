"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push, get, update } from 'firebase/database'
import { ArrowLeft, Trash2, UserPlus, Users, Shield, X, Edit2, Check } from 'lucide-react'
import Link from 'next/link'

export default function RosterPage() {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'TEAMS'>('ROSTER')
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  
  // Input State
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerHcp, setNewPlayerHcp] = useState<number>(0)
  const [newTeamName, setNewTeamName] = useState("")
  
  // UX State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editPlayerName, setEditPlayerName] = useState("")
  const [editPlayerHcp, setEditPlayerHcp] = useState<number>(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const triggerDelete = (id: string, executeDelete: () => void) => {
    if (confirmDeleteId === id) { executeDelete(); setConfirmDeleteId(null); } 
    else { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000); }
  }

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const pRef = push(ref(db, 'tournament/roster'));
    set(pRef, { id: pRef.key, name: newPlayerName.toUpperCase().trim(), handicap: newPlayerHcp });
    setNewPlayerName(""); setNewPlayerHcp(0);
  }

  const savePlayerEdit = async (id: string) => {
    await update(ref(db, `tournament/roster/${id}`), { name: editPlayerName.toUpperCase().trim(), handicap: editPlayerHcp });
    setEditingPlayerId(null);
  }

  // ... (Team Logic remains the same: addTeam, deleteTeam, assignPlayerToTeam)
  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const tRef = push(ref(db, 'tournament/teams'));
    set(tRef, { id: tRef.key, name: newTeamName.toUpperCase().trim(), playerIds: [] });
    setNewTeamName("");
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <div className="max-w-4xl mx-auto">
        <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
        
        <div className="flex bg-zinc-900 rounded-2xl p-2 mb-8 border-2 border-zinc-800">
          <button onClick={() => setActiveTab('ROSTER')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'ROSTER' ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}>MASTER ROSTER</button>
          <button onClick={() => setActiveTab('TEAMS')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'TEAMS' ? 'bg-blue-500 text-black' : 'text-zinc-500'}`}>TEAM BUILDER</button>
        </div>

        {activeTab === 'ROSTER' && (
          <section className="bg-zinc-900 p-6 sm:p-8 rounded-[2rem] border-2 border-zinc-800 shadow-xl">
            <div className="flex items-center gap-3 mb-6 text-emerald-500"><UserPlus size={28}/><h2 className="text-3xl font-black">Master Roster</h2></div>
            
            <div className="flex gap-2 mb-8 bg-black p-4 rounded-2xl border border-zinc-800">
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="PLAYER NAME" className="flex-1 bg-zinc-900 border border-zinc-700 p-3 rounded-xl font-black text-emerald-400 outline-none" />
              <input type="number" value={newPlayerHcp} onChange={e => setNewPlayerHcp(Number(e.target.value))} placeholder="HCP" className="w-20 bg-zinc-900 border border-zinc-700 p-3 rounded-xl font-black text-white text-center outline-none" min="0" max="36" />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-6 rounded-xl font-black">ADD</button>
            </div>

            <div className="space-y-3">
              {players.map(p => {
                const isEditing = editingPlayerId === p.id;
                return (
                  <div key={p.id} className="bg-black p-4 rounded-2xl flex justify-between items-center border border-zinc-800 group">
                    {isEditing ? (
                      <div className="flex flex-1 gap-2 mr-4">
                        <input value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} className="flex-1 bg-zinc-900 border border-emerald-500 p-2 rounded-lg font-black text-white outline-none" />
                        <input type="number" value={editPlayerHcp} onChange={e => setEditPlayerHcp(Number(e.target.value))} className="w-16 bg-zinc-900 border border-emerald-500 p-2 rounded-lg font-black text-white text-center outline-none" />
                        <button onClick={() => savePlayerEdit(p.id)} className="bg-emerald-500 text-black p-2 rounded-lg"><Check size={18}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-black text-white text-lg">{p.name}</span>
                        <span className="bg-zinc-800 text-emerald-400 px-3 py-1 rounded-full text-xs font-black">HCP {p.handicap || 0}</span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingPlayerId(p.id); setEditPlayerName(p.name); setEditPlayerHcp(p.handicap || 0); }} className="text-zinc-600 hover:text-white p-2"><Edit2 size={16}/></button>
                        <button onClick={() => triggerDelete(p.id, () => set(ref(db, `tournament/roster/${p.id}`), null))} className={`p-2 rounded-lg font-black transition-all ${confirmDeleteId === p.id ? 'bg-rose-500 text-white text-xs px-2' : 'text-zinc-600'}`}>
                          {confirmDeleteId === p.id ? 'CONFIRM?' : <Trash2 size={16}/>}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
        
        {/* TEAMS TAB (Same UI as previously built, omitting for brevity) */}
      </div>
    </div>
  )
}