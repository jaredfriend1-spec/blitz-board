"use client"
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Trash2, Shield } from 'lucide-react'
import Link from 'next/link'

export default function RosterPage() {
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    onValue(ref(db, 'tournament/teams'), (snap) => snap.val() && setTeams(Object.values(snap.val())))
  }, [])

  const deleteTeam = (id: string) => {
    if (confirm("Permanently delete team from cloud?")) {
      set(ref(db, `tournament/teams/${id}`), null).then(() => alert("TEAM DELETED"))
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block"><ArrowLeft size={18} className="inline mr-2"/> BACK</Link>
      <h1 className="text-5xl font-black italic text-emerald-500 mb-12 tracking-tighter">Blitz Roster</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {teams.map((t) => (
          <div key={t.id} className="relative bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-800 group shadow-xl">
            <button onClick={() => deleteTeam(t.id)} className="absolute top-6 right-6 text-zinc-700 hover:text-rose-500 transition-colors"><Trash2 /></button>
            <div className="flex items-center gap-3 mb-6 text-emerald-500 font-black italic"><Shield /> {t.name}</div>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-black/50 p-4 rounded-xl text-xs font-black italic text-zinc-500 border border-zinc-800 flex justify-between">
                  <span>Slot {i+1}</span><span className="text-zinc-300">{t.playerIds?.[i] || "---"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}