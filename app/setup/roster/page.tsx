"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue, push, get } from 'firebase/database'
import { ArrowLeft, Trash2, Shield, Plus } from 'lucide-react'
import Link from 'next/link'

export default function RosterPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [newTeamName, setNewTeamName] = useState("")

  useEffect(() => {
    onValue(ref(db, 'tournament/teams'), (snap) => {
      setTeams(snap.val() ? Object.values(snap.val()) : [])
    })
  }, [])

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`DELETE ${name}? THIS WILL ALSO WIPE THEIR MATCHUPS.`)) return;
    
    // Delete Team
    await set(ref(db, `tournament/teams/${id}`), null);
    
    // Cascade Delete: Scrub Matchups
    const mSnap = await get(ref(db, 'tournament/matchups'));
    if (mSnap.exists()) {
      const data = mSnap.val();
      Object.keys(data).forEach(key => {
        if (data[key].sideA === name || data[key].sideB === name) {
          set(ref(db, `tournament/matchups/${key}`), null);
        }
      });
    }
  }

  const addTeam = () => {
    if (!newTeamName) return;
    const tRef = push(ref(db, 'tournament/teams'));
    set(tRef, { id: tRef.key, name: newTeamName, playerIds: ["", "", "", ""] });
    setNewTeamName("");
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-8 inline-block"><ArrowLeft size={18} /> BACK</Link>
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-12 bg-zinc-900 p-6 rounded-3xl border-2 border-zinc-800">
          <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="TEAM NAME" className="flex-1 bg-black border border-zinc-800 p-4 rounded-xl font-black text-emerald-400 focus:border-emerald-500 outline-none" />
          <button onClick={addTeam} className="bg-emerald-500 text-black px-8 rounded-xl font-black italic flex items-center gap-2 transition-transform active:scale-95"><Plus /> ADD</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((t) => (
            <div key={t.id} className="relative bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 shadow-2xl group hover:border-zinc-700 transition-all">
              <button onClick={() => deleteTeam(t.id, t.name)} className="absolute top-6 right-6 text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 size={24}/></button>
              <div className="flex items-center gap-3 mb-6 text-emerald-500 font-black italic text-2xl uppercase"><Shield /> {t.name}</div>
              <div className="space-y-2 font-black italic text-zinc-500 text-xs">
                {[1, 2, 3, 4].map(i => <div key={i} className="bg-black/50 p-4 rounded-xl border border-zinc-800 flex justify-between"><span>SLOT {i}</span><span>UNASSIGNED</span></div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}