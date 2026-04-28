"use client"
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Trash2, Archive, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const runAction = (type: 'WIPE' | 'ARCHIVE') => {
    const pw = prompt(`ENTER ADMIN PASSWORD TO ${type}:`);
    if (pw !== "jeff") return alert("ACCESS DENIED"); 

    if (type === 'WIPE') {
      if (confirm("PERMANENTLY WIPE ALL SCORES AND MATCHUPS?")) {
        set(ref(db, 'tournament/scores'), null);
        set(ref(db, 'tournament/matchups'), null);
        alert("BOARD WIPED.");
      }
    } else {
      const id = Date.now();
      onValue(ref(db, 'tournament'), snap => {
        if (snap.val()) {
          set(ref(db, `history/${id}`), snap.val());
          alert("TOURNAMENT PUSHED TO HISTORY.");
        }
      }, { onlyOnce: true });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block"><ArrowLeft size={18} /> BACK</Link>
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 text-rose-500 mb-8 font-black italic text-3xl tracking-tighter uppercase">
          <ShieldAlert size={32} /> Admin Tools
        </div>
        <button onClick={() => runAction('ARCHIVE')} className="w-full bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl flex items-center justify-center gap-4 font-black italic hover:border-blue-500 text-blue-500 shadow-xl uppercase transition-all">
          <Archive /> PUSH TO HISTORY
        </button>
        <button onClick={() => runAction('WIPE')} className="w-full bg-rose-500/10 border-2 border-rose-500/30 p-8 rounded-3xl flex items-center justify-center gap-4 font-black italic text-rose-500 hover:bg-rose-500 hover:text-black shadow-xl uppercase transition-all">
          <Trash2 /> WIPE LIVE BOARD
        </button>
      </div>
    </div>
  )
}