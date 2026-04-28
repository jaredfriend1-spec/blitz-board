"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push } from 'firebase/database'
import { ArrowLeft, User, Users, Sword, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function MatchupCenter() {
  const [matches, setMatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'tournament/matchups'), snap => setMatches(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/roster'), snap => setPlayers(snap.val() ? Object.values(snap.val()) : []))
    onValue(ref(db, 'tournament/teams'), snap => setTeams(snap.val() ? Object.values(snap.val()) : []))
  }, [])

  const createMatch = (type: 'PvP' | 'TvT') => {
    const mRef = push(ref(db, 'tournament/matchups'));
    set(mRef, { id: mRef.key, type, sideA: "", sideB: "" }); // Uses sideBetAmount on payouts page
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block"><ArrowLeft size={18} className="inline mr-2"/> BACK</Link>
      <div className="flex gap-4 mb-12 max-w-4xl mx-auto">
        <button onClick={() => createMatch('PvP')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-emerald-500 transition-all"><User size={32} className="text-emerald-500" /> Add Player Bet</button>
        <button onClick={() => createMatch('TvT')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black flex flex-col items-center gap-4 hover:border-blue-500 transition-all"><Users size={32} className="text-blue-500" /> Add Team Bet</button>
      </div>
      <div className="max-w-4xl mx-auto space-y-4">
        {matches.map((m) => (
          <div key={m.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border-2 border-zinc-800 flex items-center gap-6 shadow-xl">
            <select value={m.sideA} onChange={e => set(ref(db, `tournament/matchups/${m.id}/sideA`), e.target.value)} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-emerald-400 outline-none">
              <option value="">SIDE A</option>
              {m.type === 'PvP' ? players.map(p => <option key={p.id} value={p.name}>{p.name}</option>) : teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <Sword className="text-zinc-700" />
            <select value={m.sideB} onChange={e => set(ref(db, `tournament/matchups/${m.id}/sideB`), e.target.value)} className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-emerald-400 outline-none">
              <option value="">SIDE B</option>
              {m.type === 'PvP' ? players.map(p => <option key={p.id} value={p.name}>{p.name}</option>) : teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
            <button onClick={() => set(ref(db, `tournament/matchups/${m.id}`), null)} className="text-rose-900 hover:text-rose-500"><Trash2 /></button>
          </div>
        ))}
      </div>
    </div>
  )
}