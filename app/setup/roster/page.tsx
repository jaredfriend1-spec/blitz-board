"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, UserPlus, Trash2, Users, X, Check, Pencil } from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: "", handicap: 0 })
  const [newTeamName, setNewTeamName] = useState("")

  // Inline handicap editing state
  const [editingHcp, setEditingHcp] = useState<string | null>(null)
  const [editingHcpValue, setEditingHcpValue] = useState<number>(0)

  // Toast state
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const addPlayer = () => {
    if (!newPlayer.name.trim()) return
    const pRef = push(ref(db, 'tournament/roster'))
    set(pRef, { id: pRef.key, name: newPlayer.name.trim(), handicap: newPlayer.handicap })
    setNewPlayer({ name: "", handicap: 0 })
  }

  const startEditHcp = (player: any) => {
    setEditingHcp(player.id)
    setEditingHcpValue(player.handicap || 0)
  }

  const saveHcp = async (playerId: string) => {
    await set(ref(db, `tournament/roster/${playerId}/handicap`), editingHcpValue)
    setEditingHcp(null)
    showToast('✓ Handicap updated')
  }

  const cancelEditHcp = () => {
    setEditingHcp(null)
  }

  const createTeam = () => {
    if (!newTeamName.trim()) return
    const tRef = push(ref(db, 'tournament/teams'))
    set(tRef, { id: tRef.key, name: newTeamName.trim(), playerIds: [] })
    setNewTeamName("")
  }

  const togglePlayerOnTeam = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    let pIds = [...(team.playerIds || [])]
    const isAlreadyOnThisTeam = pIds.includes(playerId)
    const onOtherTeam = teams.some(t => t.id !== teamId && (t.playerIds || []).includes(playerId))
    if (onOtherTeam && !isAlreadyOnThisTeam) {
      const otherTeam = teams.find(t => t.id !== teamId && (t.playerIds || []).includes(playerId))
      showToast(`Already on ${otherTeam?.name}`)
      return
    }
    if (isAlreadyOnThisTeam) {
      pIds = pIds.filter(id => id !== playerId)
    } else {
      if (pIds.length >= 4) { showToast('Team is full (4 max)'); return }
      pIds.push(playerId)
    }
    set(ref(db, `tournament/teams/${teamId}/playerIds`), pIds)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl">
          {toast}
        </div>
      )}

      <Link href="/setup/admin" className="text-emerald-500 font-black mb-8 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* ── ROSTER ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-emerald-500">
            <UserPlus size={32}/><h2 className="text-4xl font-black">Roster</h2>
          </div>

          {/* Add player form */}
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 space-y-4">
            <input
              value={newPlayer.name}
              onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500 transition-colors"
              placeholder="PLAYER NAME"
            />
            <div className="flex gap-4">
              <input
                type="number"
                value={newPlayer.handicap}
                onChange={e => setNewPlayer({...newPlayer, handicap: Number(e.target.value)})}
                className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none focus:border-emerald-500 transition-colors"
                placeholder="HCP"
              />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-8 rounded-xl font-black hover:bg-emerald-400 transition-colors">
                ADD
              </button>
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-2">
            {players.length === 0 && (
              <p className="text-zinc-700 text-sm font-black text-center py-8">NO PLAYERS YET</p>
            )}
            {players.map(p => {
              const teamName = teams.find(t => (t.playerIds || []).includes(p.id))?.name
              const isEditingThis = editingHcp === p.id

              return (
                <div key={p.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center gap-3">

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-lg truncate">{p.name}</span>
                      {teamName && (
                        <span className="text-[9px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-lg tracking-wider">
                          {teamName}
                        </span>
                      )}
                    </div>

                    {/* Handicap — inline editable */}
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingThis ? (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs font-black">HCP</span>
                          <input
                            type="number"
                            value={editingHcpValue}
                            onChange={e => setEditingHcpValue(Number(e.target.value))}
                            onKeyDown={e => { if (e.key === 'Enter') saveHcp(p.id); if (e.key === 'Escape') cancelEditHcp() }}
                            className="w-16 bg-black border border-emerald-500 text-emerald-400 px-2 py-1 rounded-lg font-black text-sm text-center outline-none"
                            autoFocus
                            min={0}
                            max={54}
                          />
                          <button onClick={() => saveHcp(p.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Check size={16}/>
                          </button>
                          <button onClick={cancelEditHcp} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            <X size={16}/>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditHcp(p)}
                          className="flex items-center gap-1.5 text-emerald-500 text-xs font-black hover:text-emerald-400 transition-colors group"
                          title="Tap to edit handicap"
                        >
                          <span>HCP {p.handicap ?? 0}</span>
                          <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => set(ref(db, `tournament/roster/${p.id}`), null)}
                    className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={20}/>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── TEAMS ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500">
            <Users size={32}/><h2 className="text-4xl font-black">Teams</h2>
          </div>

          {/* Create team form */}
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 flex gap-4">
            <input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white outline-none focus:border-blue-500 transition-colors"
              placeholder="TEAM NAME"
            />
            <button onClick={createTeam} className="bg-blue-600 text-white px-8 rounded-xl font-black hover:bg-blue-500 transition-colors">
              CREATE
            </button>
          </div>

          {/* Team cards */}
          <div className="space-y-4">
            {teams.length === 0 && (
              <p className="text-zinc-700 text-sm font-black text-center py-8">NO TEAMS YET</p>
            )}
            {teams.map(t => {
              const memberCount = (t.playerIds || []).length
              const isFull = memberCount >= 4
              return (
                <div key={t.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-zinc-800">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-2xl font-black">{t.name}</h3>
                      <span className={`text-xs font-black ${isFull ? 'text-rose-500' : 'text-zinc-600'}`}>
                        {memberCount}/4 {isFull ? '· FULL' : ''}
                      </span>
                    </div>
                    <button onClick={() => set(ref(db, `tournament/teams/${t.id}`), null)} className="text-zinc-700 hover:text-rose-500 transition-colors">
                      <X size={20}/>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {players.map(p => {
                      const isCurrent = (t.playerIds || []).includes(p.id)
                      const isTaken = teams.some(other => other.id !== t.id && (other.playerIds || []).includes(p.id))
                      const isTeamFull = isFull && !isCurrent

                      return (
                        <button
                          key={p.id}
                          disabled={isTaken || isTeamFull}
                          onClick={() => togglePlayerOnTeam(t.id, p.id)}
                          className={`p-3 rounded-xl font-black text-[10px] text-left border-2 transition-all ${
                            isCurrent
                              ? 'bg-blue-600 border-blue-400 text-white'
                              : isTaken
                              ? 'bg-zinc-950 border-transparent text-zinc-800 opacity-30 cursor-not-allowed'
                              : isTeamFull
                              ? 'bg-black border-zinc-800 text-zinc-800 cursor-not-allowed'
                              : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-white'
                          }`}
                        >
                          <div>{p.name}</div>
                          <div className={`text-[9px] mt-0.5 ${isCurrent ? 'text-blue-300' : 'text-zinc-700'}`}>
                            HCP {p.handicap ?? 0}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}