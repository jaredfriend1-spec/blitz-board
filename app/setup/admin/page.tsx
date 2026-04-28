"use client"
import { db } from '@/lib/firebase'
import { ref, set, onValue, get } from 'firebase/database'
import { ArrowLeft, Trash2, Archive, ShieldAlert, History } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const runAction = async (type: 'WIPE' | 'ARCHIVE') => {
    const pw = prompt(`ENTER ADMIN PASSWORD TO ${type}:`);
    if (pw !== "jeff") return alert("ACCESS DENIED"); 

    if (type === 'WIPE') {
      if (confirm("THIS WILL PERMANENTLY WIPE ALL LIVE SCORES AND MATCHUPS. PROCEED?")) {
        await set(ref(db, 'tournament/scores'), null);
        await set(ref(db, 'tournament/matchups'), null);
        alert("LIVE BOARD WIPED.");
      }
    } else {
      // ARCHIVE LOGIC: Capture a snapshot of the current tournament state
      const snap = await get(ref(db, 'tournament'));
      if (snap.exists()) {
        const id = Date.now();
        await set(ref(db, `history/${id}`), snap.val());
        alert("TOURNAMENT SNAPSHOT PUSHED TO HISTORY.");
      } else {
        alert("ERROR: NO DATA FOUND TO ARCHIVE.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans uppercase italic">
      <Link href="/setup" className="text-emerald-500 font-black mb-12 inline-block flex items-center gap-2 hover:text-emerald-400 transition-colors">
        <ArrowLeft size={18} /> BACK TO SETUP
      </Link>
      
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3 text-rose-500 mb-8 font-black italic text-4xl tracking-tighter uppercase">
          <ShieldAlert size={40} /> 
          <h1>Admin Control</h1>
        </div>

        {/* ACTION: PUSH TO HISTORY */}
        <button 
          onClick={() => runAction('ARCHIVE')} 
          className="w-full bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black hover:border-blue-500 text-blue-500 shadow-xl uppercase transition-all active:scale-95"
        >
          <Archive size={24} /> PUSH TO HISTORY
        </button>

        {/* NAVIGATION: VIEW HISTORY LEDGER */}
        <Link 
          href="/history" 
          className="w-full bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black hover:border-emerald-500 text-emerald-500 shadow-xl uppercase transition-all active:scale-95"
        >
          <History size={24} /> VIEW PAST ARCHIVES
        </Link>

        {/* ACTION: DESTRUCTIVE WIPE */}
        <button 
          onClick={() => runAction('WIPE')} 
          className="w-full bg-rose-500/10 border-2 border-rose-500/30 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-rose-500 hover:bg-rose-500 hover:text-black shadow-xl uppercase transition-all active:scale-95 mt-12"
        >
          <Trash2 size={24} /> WIPE LIVE BOARD
        </button>

        <p className="text-center text-[10px] text-zinc-700 font-black tracking-widest mt-12">
          AUTHORIZED ACCESS ONLY • SENIOR MANAGEMENT CONSOLE
        </p>
      </div>
    </div>
  )
}