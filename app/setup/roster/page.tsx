"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, UserPlus, Trash2, Users, X, CheckCircle2, Lock } from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [newPlayer, setNewPlayer] = useState({ name: "", handicap: 0 })
  const [newTeamName, setNewTeamName] = useState("")
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
    set(pRef, { id: pRef.key, ...newPlayer })
    setNewPlayer({ name: "", handicap: 0 })
  }

  const createTeam = () => {
    if (!newTeamName.trim()) return
    const tRef = push(ref(db, 'tournament/teams'))
    set(tRef, { id: tRef.key, name: newTeamName, playerIds: [] })
    setNewTeamName("")
  }

  const togglePlayerOnTeam = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    let pIds = [...(team.playerIds || [])]
    const isAlreadyOnThisTeam = pIds.includes(playerId)

    const otherTeam = teams.find(t => t.id !== teamId && (t.playerIds || []).includes(playerId))
    if (otherTeam && !isAlreadyOnThisTeam) {
      showToast(`${players.find(p => p.id === playerId)?.name} is already on ${otherTeam.name}`)
      return
    }

    if (isAlreadyOnThisTeam) {
      pIds = pIds.filter(id => id !== playerId)
    } else {
      if (pIds.length >= 4) {
        showToast(`${team.name} is full (4 players max)`)
        return
      }
      pIds.push(playerId)
    }
    set(ref(db, `tournament/teams/${teamId}/playerIds`), pIds)
  }

  // Helper: which team name is a player on (if any)
  const getPlayerTeamName = (playerId: string) =>
    teams.find(t => (t.playerIds || []).includes(playerId))?.name || null

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans uppercase italic">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl animate-pulse">
          {toast}
        </div>
      )}

      <Link href="/setup" className="text-emerald-500 font-black mb-8 inline-block">
        <ArrowLeft size={18} className="inline mr-2"/> HUB
      </Link>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* ── ROSTER ── */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-emerald-500">
            <UserPlus size={32}/>
            <h2 className="text-4xl font-black">Roster</h2>
          </div>

          {/* Add player form */}
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 space-y-4">
            <input
              value={newPlayer.name}
              onChange={e => setNewPlayer({...newPlayer, name: e.target.value})}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
              className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-black text-white text-lg"
              placeholder="PLAYER NAME"
            />
            <div className="flex gap-4">
              <input
                type="number"
                value={newPlayer.handicap}
                onChange={e => setNewPlayer({...newPlayer, handicap: Number(e.target.value)})}
                className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white text-lg"
                placeholder="HCP"
              />
              <button onClick={addPlayer} className="bg-emerald-500 text-black px-8 rounded-xl font-black text-lg hover:bg-emerald-400 transition-colors">
                ADD
              </button>
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-2">
            {players.map(p => {
              const teamName = getPlayerTeamName(p.id)
              return (
                <div key={p.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-black text-xl">{p.name}</span>
                    <span className="text-emerald-500 text-sm ml-3">HCP {p.handicap}</span>
                    {teamName && (
                      <span className="ml-3 text-[10px] font-black bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg tracking-wider">
                        {teamName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => set(ref(db, `tournament/roster/${p.id}`), null)}
                    className="text-zinc-700 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={20}/>
                  </button>
                </div>
              )
            })}
            {players.length === 0 && (
              <p className="text-zinc-700 text-sm font-black text-center py-8">NO PLAYERS YET</p>
            )}
          </div>
        </section>

        {/* ── TEAMS ── */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 text-blue-500">
            <Users size={32}/>
            <h2 className="text-4xl font-black">Teams</h2>
          </div>

          {/* Create team form */}
          <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800 flex gap-4">
            <input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-white text-lg"
              placeholder="TEAM NAME"
            />
            <button onClick={createTeam} className="bg-blue-600 text-white px-8 rounded-xl font-black text-lg hover:bg-blue-500 transition-colors">
              CREATE
            </button>
          </div>

          {/* Team cards */}
          <div className="space-y-6">
            {teams.map(t => {
              const memberIds: string[] = t.playerIds || []
              const isFull = memberIds.length >= 4
              const members = players.filter(p => memberIds.includes(p.id))
              const available = players.filter(p => !memberIds.includes(p.id) && !teams.some(ot => ot.id !== t.id && (ot.playerIds || []).includes(p.id)))
              const taken = players.filter(p => !memberIds.includes(p.id) && teams.some(ot => ot.id !== t.id && (ot.playerIds || []).includes(p.id)))

              return (
                <div key={t.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-zinc-800">

                  {/* Team header */}
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-2xl font-black">{t.name}</h3>
                      <span className={`text-xs font-black tracking-widest ${isFull ? 'text-rose-500' : 'text-zinc-500'}`}>
                        {memberIds.length}/4 PLAYERS {isFull ? '· FULL' : ''}
                      </span>
                    </div>
                    <button onClick={() => set(ref(db, `tournament/teams/${t.id}`), null)} className="text-zinc-700 hover:text-rose-500 transition-colors">
                      <X size={20}/>
                    </button>
                  </div>

                  {/* Current members */}
                  {members.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">ON THIS TEAM</p>
                      {members.map(p => (
                        <button
                          key={p.id}
                          onClick={() => togglePlayerOnTeam(t.id, p.id)}
                          className="w-full flex justify-between items-center bg-blue-600/20 border border-blue-500/40 text-blue-300 p-3 rounded-xl font-black text-sm hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 transition-all group"
                        >
                          <span>{p.name} <span className="text-blue-500/60 text-xs ml-1">HCP {p.handicap}</span></span>
                          <span className="text-[10px] group-hover:hidden"><CheckCircle2 size={16} className="text-blue-500"/></span>
                          <span className="text-[10px] hidden group-hover:block text-rose-400 font-black">REMOVE</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Available to add */}
                  {!isFull && available.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-zinc-600 tracking-widest mb-2">ADD PLAYER</p>
                      {available.map(p => (
                        <button
                          key={p.id}
                          onClick={() => togglePlayerOnTeam(t.id, p.id)}
                          className="w-full flex justify-between items-center bg-black border border-zinc-700 text-zinc-300 p-3 rounded-xl font-black text-sm hover:border-emerald-500 hover:text-white transition-all"
                        >
                          <span>{p.name} <span className="text-zinc-600 text-xs ml-1">HCP {p.handicap}</span></span>
                          <span className="text-emerald-500 text-xs">+ ADD</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Team full message */}
                  {isFull && (
                    <div className="mt-3 text-center text-xs font-black text-rose-500/60 tracking-widest py-2 border border-rose-500/10 rounded-xl bg-rose-500/5">
                      TEAM FULL
                    </div>
                  )}

                  {/* Players on other teams (greyed out reference) */}
                  {taken.length > 0 && !isFull && (
                    <div className="mt-4 space-y-1">
                      <p className="text-[10px] font-black text-zinc-700 tracking-widest mb-2">ASSIGNED ELSEWHERE</p>
                      {taken.map(p => {
                        const otherTeam = teams.find(ot => ot.id !== t.id && (ot.playerIds || []).includes(p.id))
                        return (
                          <div key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-zinc-900 opacity-40">
                            <span className="font-black text-sm text-zinc-600">{p.name}</span>
                            <span className="text-[10px] text-zinc-700 flex items-center gap-1">
                              <Lock size={10}/> {otherTeam?.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              )
            })}
            {teams.length === 0 && (
              <p className="text-zinc-700 text-sm font-black text-center py-8">NO TEAMS YET</p>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}