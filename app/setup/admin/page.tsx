"use client"
import { db } from '@/lib/firebase'
import { ref, set, get } from 'firebase/database'
import { ArrowLeft, Trash2, Archive, ShieldAlert, History, Eraser } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
  const runAction = async (type: 'WIPE_SCORES' | 'WIPE_ALL' | 'ARCHIVE') => {
    const pw = prompt(`ENTER ADMIN PASSWORD TO ${type.replace('_', ' ')}:`);
    if (pw !== "jeff") return alert("ACCESS DENIED"); 

    if (type === 'WIPE_SCORES') {
      if (confirm("CLEANING SCOREBOARD: This will zero out all scores but keep teams and matches. Proceed?")) {
        await set(ref(db, 'tournament/scores'), null);
        alert("LIVE SCORING WIPED.");
      }
    } else if (type === 'WIPE_ALL') {
      if (confirm("FULL SYSTEM RESET: This will wipe scores, teams, and all side bets. Roster will remain. Proceed?")) {
        await set(ref(db, 'tournament/scores'), null);
        await set(ref(db, 'tournament/teams'), null);
        await set(ref(db, 'tournament/matchups'), null);
        alert("ALL TOURNAMENT DATA WIPED.");
      }
    } else if (type === 'ARCHIVE') {
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

        {/* ARCHIVE & VIEW */}
        <div className="space-y-4 mb-12">
          <button 
            onClick={() => runAction('ARCHIVE')} 
            className="w-full bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2rem] flex items-center justify-center gap-4 font-black hover:border-blue-500 text-blue-500 shadow-xl uppercase transition-all"
          >
            <Archive size={20} /> PUSH TO HISTORY
          </button>

          <Link 
            href="/history" 
            className="w-full bg-zinc-900 border-2 border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-center gap-4 font-black hover:border-emerald-500 text-emerald-500 shadow-xl uppercase transition-all"
          >
            <History size={20} /> VIEW PAST ARCHIVES
          </Link>
        </div>

        {/* DESTRUCTIVE ACTIONS */}
        <div className="space-y-4 pt-8 border-t-2 border-zinc-900">
          <h2 className="text-[10px] text-zinc-600 font-black tracking-[0.2em] text-center mb-4">DESTRUCTIVE COMMANDS</h2>
          
          {/* SOFT WIPE: SCORES ONLY */}
          <button 
            onClick={() => runAction('WIPE_SCORES')} 
            className="w-full bg-amber-500/10 border-2 border-amber-500/30 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-amber-500 hover:bg-amber-500 hover:text-black shadow-xl uppercase transition-all"
          >
            <Eraser size={24} /> Wipe Live Scoring
          </button>

          {/* HARD WIPE: FULL RESET */}
          <button 
            onClick={() => runAction('WIPE_ALL')} 
            className="w-full bg-rose-500/10 border-2 border-rose-500/30 p-8 rounded-[2.5rem] flex items-center justify-center gap-4 font-black text-rose-500 hover:bg-rose-500 hover:text-black shadow-xl uppercase transition-all"
          >
            <Trash2 size={24} /> Wipe All Tournament Data
          </button>
        </div>

        <p className="text-center text-[10px] text-zinc-800 font-black tracking-widest mt-12">
          AUTHORIZED ACCESS ONLY • SENIOR MANAGEMENT CONSOLE
        </p>
      </div>
    </div>
  )
}