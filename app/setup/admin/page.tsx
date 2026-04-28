"use client"
import { db } from '@/lib/firebase'
import { ref, set, onValue } from 'firebase/database'
import { ArrowLeft, Trash2, Archive } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const runAction = (type: 'WIPE' | 'ARCHIVE') => {
    const pw = prompt(`ENTER PASSWORD TO ${type}:`);
    if (pw !== "jeff") return alert("WRONG PASSWORD");
    if (type === 'WIPE') {
      if (confirm("Wipe all live scores?")) {
        set(ref(db, 'tournament/scores'), null);
        alert("WIPED.");
      }
    } else {
      const id = new Date().getTime();
      onValue(ref(db, 'tournament'), (snap) => {
        set(ref(db, `history/${id}`), snap.val());
        alert("ARCHIVED TO HISTORY.");
      }, { onlyOnce: true });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block"><ArrowLeft size={18} className="inline mr-2"/> BACK</Link>
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-4xl font-black italic text-rose-500 mb-8">Admin</h1>
        <button onClick={() => runAction('ARCHIVE')} className="w-full bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl flex items-center justify-center gap-4 font-black italic hover:border-blue-500 text-blue-500"><Archive /> PUSH TO HISTORY</button>
        <button onClick={() => runAction('WIPE')} className="w-full bg-rose-500/10 border-2 border-rose-500/30 p-8 rounded-3xl flex items-center justify-center gap-4 font-black italic text-rose-500 hover:bg-rose-500 hover:text-black transition-all"><Trash2 /> WIPE LIVE BOARD</button>
      </div>
    </div>
  )
}