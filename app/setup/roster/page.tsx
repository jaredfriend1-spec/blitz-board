"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push, get, update } from 'firebase/database'
import { ArrowLeft, Trash2, UserPlus, Users, Shield, X, Edit2, Check } from 'lucide-react'
import Link from 'next/link'

export default function RosterPage() {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'TEAMS'>('ROSTER')
  
  // Data State
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  
  // Input State
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newTeamName, setNewTeamName] = useState("")
  
  // UX State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editPlayerName, setEditPlayerName] = useState("")
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  // --- UTILS: 2-Tap Delete ---
  const triggerDelete = (id: string, executeDelete: () => void) => {
    if (confirmDeleteId === id) {
      executeDelete();
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(current => current === id ? null : current), 3000);
    }
  }

  // --- PLAYER LOGIC ---
  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const pRef = push(ref(db, 'tournament/roster'));
    set(pRef, { id: pRef.key, name: newPlayerName.toUpperCase().trim() });
    setNewPlayerName("");
  }

  const renamePlayer = async (id: string, oldName: string) => {
    if (!editPlayerName.trim() || editPlayerName === oldName) return setEditingPlayerId(null);
    const newName = editPlayerName.toUpperCase().trim();
    
    await set(ref(db, `tournament/roster/${id}/name`), newName);
    
    // Cascade to Matchups
    const mSnap = await get(ref(db, 'tournament/matchups'));
    if (mSnap.exists()) {
      const updates: any = {};
      Object.entries(mSnap.val()).forEach(([mId, m]: [string, any]) => {
        if (m.sideA === oldName) updates[`${mId}/sideA`] = newName;
        if (m.sideB === oldName) updates[`${mId}/sideB`] = newName;
      });
      if (Object.keys(updates).length > 0) update(ref(db, 'tournament/matchups'), updates);
    }
    setEditingPlayerId(null);
  }

  // --- TEAM LOGIC ---
  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const tRef = push(ref(db, 'tournament/teams'));
    set(tRef, { id: tRef.key, name: newTeamName.toUpperCase().trim(), playerIds: [] });
    setNewTeamName("");
  }

  const renameTeam = async (id: string, oldName: string) => {
    if (!editTeamName.trim() || editTeamName === oldName) return setEditingTeamId(null);
    const newName = editTeamName.toUpperCase().trim();
    
    await set(ref(db, `tournament/teams/${id}/name`), newName);
    
    // Cascade to Matchups
    const mSnap = await get(ref(db, 'tournament/matchups'));
    if (mSnap.exists()) {
      const updates: any = {};
      Object.entries(mSnap.val()).forEach(([mId, m]: [string, any]) => {
        if (m.sideA === oldName) updates[`${mId}/sideA`] = newName;
        if (m.sideB === oldName) updates[`${mId}/sideB`] = newName;
      });
      if (Object.keys(updates).length > 0) update(ref(db, 'tournament/matchups'), updates);
    }
    setEditingTeamId(null);
  }

  const assignPlayerToTeam = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId);
    if ((team.playerIds || []).length >= 4) {
      setAssigningTeamId(null);
      return;
    }
    set(ref(db, `tournament/teams/${teamId}/playerIds`), [...(team.playerIds || []), playerId]);
    
    // Auto-close modal if full
    if ((team.playerIds || []).length + 1 >= 4) setAssigningTeamId(null);
  }

  // Derived Data
  const unassignedPlayers = players.filter(p => !teams.some(team => (team.playerIds || []).includes(p.id)));
  const getPlayerTeam = (playerId: string) => teams.find(t => (t.playerIds || []).includes(playerId));

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      <div className="max-w-4xl mx-auto">
        <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block"><ArrowLeft size={18} className="inline mr-2"/> HUB</Link>
        
        {/* TABS HEADER */}
        <div className="flex bg-zinc-900 rounded-2xl p-2 mb-8 border-2 border-zinc-800">
          <button onClick={() => setActiveTab('ROSTER')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'ROSTER' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}>MASTER ROSTER</button>
          <button onClick={() => setActiveTab('TEAMS')} className={`flex-1 py-4 rounded-xl font-black text-lg transition-all ${activeTab === 'TEAMS' ? 'bg-blue-500 text-black' : 'text-zinc-500 hover:text-white'}`}>TEAM BUILDER</button>
        </div>

        {/* TAB 1: ROSTER */}
        {activeTab === 'ROSTER' && (
          <section className="bg-zinc-900 p-6 sm:p-8 rounded-[2rem] border-2 border-zinc-800 shadow-xl">
            <div className="flex gap-2 mb-8">
              <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} placeholder="ADD PLAYER NAME" className="flex-1 bg-black border border-zinc-700 p-4 rounded-xl font-black text-emerald-400 outline-none focus:border-emerald-500" />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-6 rounded-xl font-black"><UserPlus /></button>
            </div>

            <div className="space-y-3">
              {players.length === 0 && <p className="text-zinc-500 text-center font-black py-8">NO PLAYERS ADDED YET</p>}
              {players.map(p => {
                const assignedTeam = getPlayerTeam(p.id);
                const isEditing = editingPlayerId === p.id;

                return (
                  <div key={p.id} className="bg-black p-4 rounded-2xl flex justify-between items-center border border-zinc-800 group">
                    {isEditing ? (
                      <div className="flex flex-1 gap-2 mr-4">
                        <input autoFocus value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renamePlayer(p.id, p.name)} className="flex-1 bg-zinc-900 border border-emerald-500 p-2 rounded-lg font-black text-white outline-none" />
                        <button onClick={() => renamePlayer(p.id, p.name)} className="bg-emerald-500 text-black p-2 rounded-lg"><Check size={18}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-black text-white text-lg">{p.name}</span>
                        {assignedTeam ? 
                          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">{assignedTeam.name}</span> : 
                          <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">UNASSIGNED</span>
                        }
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingPlayerId(p.id); setEditPlayerName(p.name); }} className="text-zinc-600 hover:text-white p-2"><Edit2 size={16}/></button>
                        <button onClick={() => triggerDelete(p.id, () => {
                          set(ref(db, `tournament/roster/${p.id}`), null);
                          if (assignedTeam) set(ref(db, `tournament/teams/${assignedTeam.id}/playerIds`), assignedTeam.playerIds.filter((pid:string) => pid !== p.id));
                        })} className={`p-2 rounded-lg font-black transition-all ${confirmDeleteId === p.id ? 'bg-rose-500 text-white px-4 text-xs' : 'text-zinc-600 hover:text-rose-500'}`}>
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

        {/* TAB 2: TEAMS */}
        {activeTab === 'TEAMS' && (
          <section className="bg-zinc-900 p-6 sm:p-8 rounded-[2rem] border-2 border-zinc-800 shadow-xl">
            <div className="flex gap-2 mb-8">
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()} placeholder="ADD TEAM NAME" className="flex-1 bg-black border border-zinc-700 p-4 rounded-xl font-black text-blue-400 outline-none focus:border-blue-500" />
              <button onClick={addTeam} className="bg-blue-500 text-black px-6 rounded-xl font-black"><Users /></button>
            </div>

            <div className="space-y-6">
              {teams.length === 0 && <p className="text-zinc-500 text-center font-black py-8">NO TEAMS CREATED YET</p>}
              {teams.map(t => {
                const isEditing = editingTeamId === t.id;
                const pIds = t.playerIds || [];

                return (
                  <div key={t.id} className="bg-black p-6 rounded-3xl border-2 border-zinc-800 relative">
                    <div className="flex justify-between items-start mb-6 border-b border-zinc-900 pb-4">
                      {isEditing ? (
                        <div className="flex flex-1 gap-2 mr-4">
                          <input autoFocus value={editTeamName} onChange={e => setEditTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameTeam(t.id, t.name)} className="flex-1 bg-zinc-900 border border-blue-500 p-2 rounded-lg font-black text-white outline-none" />
                          <button onClick={() => renameTeam(t.id, t.name)} className="bg-blue-500 text-black p-2 rounded-lg"><Check size={18}/></button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-3 text-emerald-500 font-black text-2xl cursor-pointer hover:text-emerald-400" onClick={() => { setEditingTeamId(t.id); setEditTeamName(t.name); }}>
                            <Shield size={24}/> {t.name} <Edit2 size={14} className="text-zinc-600"/>
                          </div>
                          <div className="text-[10px] font-black text-zinc-500 mt-1">{pIds.length}/4 PLAYERS</div>
                        </div>
                      )}
                      
                      {!isEditing && (
                        <button onClick={() => triggerDelete(t.id, async () => {
                          await set(ref(db, `tournament/teams/${t.id}`), null);
                          const mSnap = await get(ref(db, 'tournament/matchups'));
                          if (mSnap.exists()) {
                            Object.entries(mSnap.val()).forEach(([mId, m]: [string, any]) => {
                              if (m.sideA === t.name || m.sideB === t.name) set(ref(db, `tournament/matchups/${mId}`), null);
                            });
                          }
                        })} className={`p-2 rounded-lg font-black transition-all ${confirmDeleteId === t.id ? 'bg-rose-500 text-white px-4 text-xs' : 'text-zinc-600 hover:text-rose-500'}`}>
                          {confirmDeleteId === t.id ? 'CONFIRM?' : <Trash2 size={18}/>}
                        </button>
                      )}
                    </div>

                    {/* PLAYER PILLS */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      {pIds.map((pid: string) => {
                        const p = players.find(x => x.id === pid);
                        if (!p) return null;
                        return (
                          <div key={pid} className="bg-zinc-900 border border-zinc-700 pl-4 pr-2 py-2 rounded-full flex items-center gap-3 font-black text-sm">
                            {p.name}
                            <button onClick={() => set(ref(db, `tournament/teams/${t.id}/playerIds`), pIds.filter((x:string) => x !== pid))} className="bg-black text-zinc-500 hover:text-rose-500 rounded-full p-1"><X size={14}/></button>
                          </div>
                        )
                      })}
                    </div>

                    {pIds.length < 4 ? (
                      <button onClick={() => setAssigningTeamId(t.id)} className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-zinc-700 text-emerald-500 py-4 rounded-xl font-black transition-all">
                        + TAP TO ADD PLAYER
                      </button>
                    ) : (
                      <div className="w-full bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-500 py-4 rounded-xl font-black text-center">
                        TEAM FULL
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* BOTTOM SHEET MODAL: ASSIGN PLAYER */}
      {assigningTeamId && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] border-2 border-zinc-800 p-6 flex flex-col max-h-[80vh] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-emerald-500">Select Player</h3>
              <button onClick={() => setAssigningTeamId(null)} className="text-zinc-500 hover:text-white bg-black p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto space-y-3 flex-1 pb-4">
              {unassignedPlayers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 font-black">ALL PLAYERS ASSIGNED</div>
              ) : (
                unassignedPlayers.map(p => (
                  <button key={p.id} onClick={() => assignPlayerToTeam(assigningTeamId, p.id)} className="w-full text-left p-5 bg-black rounded-2xl border-2 border-zinc-800 font-black hover:border-emerald-500 transition-colors active:scale-95 text-lg">
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}