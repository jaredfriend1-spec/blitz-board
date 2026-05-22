"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import {
  ArrowLeft, UserPlus, Trash2, Users, Check, Pencil,
  X, ChevronRight, AlertTriangle, CheckCircle2, RotateCcw
} from 'lucide-react'
import Link from 'next/link'

export default function RosterManager() {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])

  // Add player form
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerHcp, setNewPlayerHcp] = useState<number|string>("")

  // Inline HCP editing
  const [editingHcp, setEditingHcp] = useState<string|null>(null)
  const [editingHcpValue, setEditingHcpValue] = useState<number>(0)

  // Team builder wizard
  const [showTeamBuilder, setShowTeamBuilder] = useState(false)
  const [builderStep, setBuilderStep] = useState<'count'|'names'|'done'>('count')
  const [teamCount, setTeamCount] = useState<number>(2)
  const [teamNames, setTeamNames] = useState<string[]>(['Team 1', 'Team 2'])

  // Toast
  const [toast, setToast] = useState<string|null>(null)

  useEffect(() => {
    onValue(ref(db,'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db,'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null), 2500) }

  // ── PLAYERS ───────────────────────────────────────────────────
  const addPlayer = () => {
    if (!newPlayerName.trim()) return
    const pRef = push(ref(db,'tournament/roster'))
    set(pRef, { id: pRef.key, name: newPlayerName.trim().toUpperCase(), handicap: Number(newPlayerHcp) || 0 })
    setNewPlayerName("")
    setNewPlayerHcp("")
  }

  const deletePlayer = (id: string) => {
    set(ref(db,`tournament/roster/${id}`), null)
    // Remove from any team
    teams.forEach(t => {
      if ((t.playerIds||[]).includes(id)) {
        set(ref(db,`tournament/teams/${t.id}/playerIds`), (t.playerIds||[]).filter((pid:string)=>pid!==id))
      }
    })
  }

  const startEditHcp = (p: any) => { setEditingHcp(p.id); setEditingHcpValue(p.handicap||0) }
  const saveHcp = async (id: string) => {
    await set(ref(db,`tournament/roster/${id}/handicap`), editingHcpValue)
    setEditingHcp(null)
    showToast('✓ Handicap updated')
  }

  // ── TEAM ASSIGNMENT ───────────────────────────────────────────
  const assignPlayerToTeam = (playerId: string, teamId: string) => {
    // Remove from current team first
    teams.forEach(t => {
      if ((t.playerIds||[]).includes(playerId)) {
        const updated = (t.playerIds||[]).filter((pid:string) => pid !== playerId)
        set(ref(db,`tournament/teams/${t.id}/playerIds`), updated.length ? updated : null)
      }
    })
    // Add to new team (if not "unassign")
    if (teamId !== 'none') {
      const target = teams.find(t => t.id === teamId)
      if (!target) return
      const current = target.playerIds || []
      set(ref(db,`tournament/teams/${teamId}/playerIds`), [...current, playerId])
    }
  }

  const getPlayerTeam = (playerId: string) => teams.find(t => (t.playerIds||[]).includes(playerId))

  // ── TEAM BUILDER WIZARD ───────────────────────────────────────
  const openTeamBuilder = () => {
    setTeamCount(2)
    setTeamNames(['Team 1', 'Team 2'])
    setBuilderStep('count')
    setShowTeamBuilder(true)
  }

  const handleTeamCountSelect = (n: number) => {
    setTeamCount(n)
    const defaults = Array.from({length:n}, (_,i) => `Team ${i+1}`)
    setTeamNames(defaults)
  }

  const handleTeamCountNext = () => {
    setBuilderStep('names')
  }

  const createTeams = async () => {
    // Wipe existing teams
    await set(ref(db,'tournament/teams'), null)
    // Create new ones
    for (const name of teamNames) {
      const tRef = push(ref(db,'tournament/teams'))
      await set(tRef, { id: tRef.key, name: name.trim() || `Team ${teamNames.indexOf(name)+1}`, playerIds: [] })
    }
    setShowTeamBuilder(false)
    showToast(`✓ ${teamCount} teams created`)
  }

  // Distribution info
  const playerCount = players.length
  const perTeam = teamCount > 0 ? Math.floor(playerCount / teamCount) : 0
  const remainder = teamCount > 0 ? playerCount % teamCount : 0
  const isEven = remainder === 0
  const distributionMsg = playerCount > 0
    ? isEven
      ? `${playerCount} players ÷ ${teamCount} teams = ${perTeam} per team ✓`
      : `${playerCount} players ÷ ${teamCount} teams = ${perTeam}-${perTeam+1} per team (uneven)`
    : `${teamCount} teams will be created`

  // Unassigned players
  const assignedIds = new Set(teams.flatMap(t => t.playerIds || []))
  const unassigned = players.filter(p => !assignedIds.has(p.id))

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 font-sans uppercase italic">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-600 text-white text-sm font-black px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in">
          {toast}
        </div>
      )}

      <Link href="/setup/admin" className="text-emerald-500 font-black mb-6 inline-flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18}/> CHECKLIST
      </Link>

      <div className="max-w-2xl mx-auto space-y-8">

        <h1 className="text-4xl font-black tracking-tight">Roster & Teams</h1>

        {/* ── STEP 1: ADD PLAYERS ── */}
        <section className="bg-zinc-900 rounded-[2rem] border-2 border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-sm">1</div>
              <h2 className="font-black text-lg">Add Players</h2>
            </div>
            <span className="text-zinc-600 text-xs font-black">{playerCount} ADDED</span>
          </div>

          <div className="p-6 space-y-3">
            {/* Add form */}
            <div className="flex gap-3">
              <input
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                className="flex-1 bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-white outline-none transition-colors text-sm"
                placeholder="PLAYER NAME"
              />
              <input
                type="number"
                value={newPlayerHcp}
                onChange={e => setNewPlayerHcp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                className="w-20 bg-black border border-zinc-700 focus:border-emerald-500 p-3 rounded-xl font-black text-emerald-400 outline-none transition-colors text-sm text-center"
                placeholder="HCP"
                min={0} max={54}
              />
              <button onClick={addPlayer}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 rounded-xl font-black text-sm transition-colors">
                ADD
              </button>
            </div>

            {/* Player list */}
            {players.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {players.map(p => {
                  const playerTeam = getPlayerTeam(p.id)
                  const isEditingThis = editingHcp === p.id
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-black rounded-xl px-4 py-3 border border-zinc-800">
                      {/* Name */}
                      <span className="flex-1 font-black text-sm truncate">{p.name}</span>

                      {/* Team badge */}
                      {playerTeam && (
                        <span className="text-[9px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-lg flex-shrink-0">
                          {playerTeam.name}
                        </span>
                      )}

                      {/* HCP inline edit */}
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="number"
                            value={editingHcpValue}
                            onChange={e => setEditingHcpValue(Number(e.target.value))}
                            onKeyDown={e => { if(e.key==='Enter') saveHcp(p.id); if(e.key==='Escape') setEditingHcp(null) }}
                            className="w-14 bg-zinc-900 border border-emerald-500 text-emerald-400 px-2 py-1 rounded-lg font-black text-sm text-center outline-none"
                            autoFocus min={0} max={54}
                          />
                          <button onClick={() => saveHcp(p.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
                          <button onClick={() => setEditingHcp(null)} className="text-zinc-600 hover:text-zinc-400"><X size={14}/></button>
                        </div>
                      ) : (
                        <button onClick={() => startEditHcp(p)}
                          className="flex items-center gap-1 text-emerald-500 text-xs font-black hover:text-emerald-400 transition-colors group flex-shrink-0">
                          <span>HCP {p.handicap ?? 0}</span>
                          <Pencil size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                        </button>
                      )}

                      <button onClick={() => deletePlayer(p.id)} className="text-zinc-700 hover:text-rose-500 transition-colors flex-shrink-0">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {players.length === 0 && (
              <p className="text-zinc-700 text-xs font-black text-center py-4">ADD PLAYERS ABOVE TO GET STARTED</p>
            )}
          </div>
        </section>

        {/* ── STEP 2: BUILD TEAMS ── */}
        <section className="bg-zinc-900 rounded-[2rem] border-2 border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-sm">2</div>
              <h2 className="font-black text-lg">Build Teams</h2>
            </div>
            <div className="flex items-center gap-2">
              {teams.length > 0 && (
                <span className="text-zinc-600 text-xs font-black">{teams.length} TEAMS</span>
              )}
              <button onClick={openTeamBuilder}
                className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 px-3 py-1.5 rounded-xl font-black text-xs transition-all">
                <RotateCcw size={12}/>
                {teams.length > 0 ? 'REBUILD' : 'CREATE TEAMS'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {teams.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-600 text-xs font-black mb-4">NO TEAMS YET</p>
                <button onClick={openTeamBuilder}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-colors flex items-center gap-2 mx-auto">
                  <Users size={16}/> CREATE TEAMS
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Unassigned players */}
                {unassigned.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                    <p className="text-amber-400 text-[10px] font-black tracking-widest mb-2">
                      UNASSIGNED PLAYERS ({unassigned.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unassigned.map(p => (
                        <span key={p.id} className="bg-amber-500/20 text-amber-300 text-xs font-black px-3 py-1.5 rounded-xl">
                          {p.name} · HCP {p.handicap??0}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team cards with player assignment */}
                {teams.map(t => {
                  const members = (t.playerIds||[]).map((pid:string) => players.find(p=>p.id===pid)).filter(Boolean)
                  return (
                    <div key={t.id} className="bg-black rounded-2xl border border-zinc-800 overflow-hidden">
                      {/* Team header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"/>
                          <span className="font-black text-sm">{t.name}</span>
                          <span className="text-zinc-600 text-[10px] font-black">({members.length} players)</span>
                        </div>
                        <button onClick={() => set(ref(db,`tournament/teams/${t.id}`), null)}
                          className="text-zinc-700 hover:text-rose-500 transition-colors">
                          <X size={16}/>
                        </button>
                      </div>

                      {/* Members */}
                      <div className="p-3 space-y-1.5">
                        {members.map((p:any) => (
                          <div key={p.id} className="flex items-center justify-between bg-zinc-900 rounded-xl px-3 py-2">
                            <div>
                              <span className="font-black text-sm text-white">{p.name}</span>
                              <span className="text-zinc-500 text-[10px] font-black ml-2">HCP {p.handicap??0}</span>
                            </div>
                            <button onClick={() => assignPlayerToTeam(p.id, 'none')}
                              className="text-zinc-600 hover:text-rose-500 transition-colors">
                              <X size={14}/>
                            </button>
                          </div>
                        ))}

                        {/* Add player to this team */}
                        {unassigned.length > 0 && (
                          <select
                            value=""
                            onChange={e => { if(e.target.value) assignPlayerToTeam(e.target.value, t.id) }}
                            className="w-full bg-zinc-900/50 border border-dashed border-zinc-700 hover:border-blue-500 text-zinc-500 text-xs font-black p-2 rounded-xl outline-none transition-colors cursor-pointer"
                          >
                            <option value="">+ ADD PLAYER TO {t.name.toUpperCase()}</option>
                            {unassigned.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (HCP {p.handicap??0})</option>
                            ))}
                          </select>
                        )}

                        {members.length === 0 && unassigned.length === 0 && (
                          <p className="text-zinc-700 text-[10px] font-black text-center py-2">NO PLAYERS AVAILABLE</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Summary */}
        {teams.length > 0 && players.length > 0 && (
          <div className={`rounded-2xl p-4 border ${unassigned.length === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center gap-2">
              {unassigned.length === 0
                ? <CheckCircle2 size={16} className="text-emerald-400"/>
                : <AlertTriangle size={16} className="text-amber-400"/>
              }
              <p className={`text-xs font-black ${unassigned.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {unassigned.length === 0
                  ? `ALL ${players.length} PLAYERS ASSIGNED ACROSS ${teams.length} TEAMS`
                  : `${unassigned.length} PLAYER${unassigned.length>1?'S':''} NOT YET ASSIGNED TO A TEAM`
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── TEAM BUILDER WIZARD MODAL ── */}
      {showTeamBuilder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-700 shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-400"/>
                <h2 className="font-black text-lg">
                  {builderStep === 'count' ? 'How Many Teams?' : 'Name Your Teams'}
                </h2>
              </div>
              <button onClick={() => setShowTeamBuilder(false)}>
                <X size={20} className="text-zinc-500 hover:text-white transition-colors"/>
              </button>
            </div>

            <div className="p-6 space-y-5">

              {builderStep === 'count' && (
                <>
                  {/* Team count picker */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">NUMBER OF TEAMS</label>
                    <div className="flex gap-3">
                      {[2,3,4].map(n => (
                        <button key={n} onClick={() => handleTeamCountSelect(n)}
                          className={`flex-1 py-4 rounded-2xl font-black text-2xl border-2 transition-all ${
                            teamCount === n
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Distribution preview */}
                  <div className={`rounded-2xl p-4 border ${isEven || playerCount === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    <div className="flex items-center gap-2">
                      {isEven || playerCount === 0
                        ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0"/>
                        : <AlertTriangle size={14} className="text-amber-400 flex-shrink-0"/>
                      }
                      <p className={`text-xs font-black normal-case ${isEven || playerCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {distributionMsg}
                      </p>
                    </div>
                    {!isEven && playerCount > 0 && (
                      <p className="text-amber-300/70 text-[10px] font-black normal-case mt-1.5 ml-5">
                        Teams won't be equal in size — that's OK if intentional.
                      </p>
                    )}
                  </div>

                  {/* Warning if existing teams */}
                  {teams.length > 0 && (
                    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                      <AlertTriangle size={14} className="text-rose-400 flex-shrink-0"/>
                      <p className="text-rose-400 text-[10px] font-black normal-case">
                        This will replace your existing {teams.length} teams. Player assignments will be cleared.
                      </p>
                    </div>
                  )}

                  <button onClick={handleTeamCountNext}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors">
                    NEXT — NAME TEAMS <ChevronRight size={16}/>
                  </button>
                </>
              )}

              {builderStep === 'names' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest block mb-3">TEAM NAMES</label>
                    <div className="space-y-2">
                      {teamNames.map((name, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-zinc-600 font-black text-sm w-6 text-center">{i+1}</span>
                          <input
                            value={name}
                            onChange={e => {
                              const updated = [...teamNames]
                              updated[i] = e.target.value
                              setTeamNames(updated)
                            }}
                            className="flex-1 bg-black border border-zinc-700 focus:border-blue-500 p-3 rounded-xl font-black text-white outline-none transition-colors text-sm"
                            placeholder={`Team ${i+1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setBuilderStep('count')}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-2xl font-black text-sm transition-colors">
                      ← BACK
                    </button>
                    <button onClick={createTeams}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2">
                      <Check size={16}/> CREATE TEAMS
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}