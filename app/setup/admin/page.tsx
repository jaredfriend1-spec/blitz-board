"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Archive, Trash2, RotateCcw, History, PlayCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminCenter() {
  const [history, setHistory] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const savedHistory = localStorage.getItem('blitz-history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // 1. ARCHIVE: Save current state to history
  const archiveTournament = () => {
    const course = JSON.parse(localStorage.getItem('tournament-course') || '{}');
    const teams = JSON.parse(localStorage.getItem('final-teams') || '[]');
    const scores = JSON.parse(localStorage.getItem('blitz-scores-v1') || '{}');
    const matchups = JSON.parse(localStorage.getItem('side-matchups') || '[]');
    const money = JSON.parse(localStorage.getItem('tournament-money') || '{}');

    if (!course.name && teams.length === 0) {
      alert("No active tournament data found to archive.");
      return;
    }

    const snapshot = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      course,
      teams,
      scores,
      matchups,
      money
    };

    const updatedHistory = [snapshot, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('blitz-history', JSON.stringify(updatedHistory));
    alert("🚀 ARCHIVED: This round is now in your history.");
  };

  // 2. RESTORE: Load history into active slots
  const restoreHistory = (item: any) => {
    if (confirm(`Load "${item.course?.name || 'Tournament'}" data? This will overwrite any current active scores.`)) {
      localStorage.setItem('tournament-course', JSON.stringify(item.course));
      localStorage.setItem('final-teams', JSON.stringify(item.teams));
      localStorage.setItem('blitz-scores-v1', JSON.stringify(item.scores));
      localStorage.setItem('side-matchups', JSON.stringify(item.matchups));
      localStorage.setItem('tournament-money', JSON.stringify(item.money));

      // Also update the master roster list so setup pages stay in sync
      const roster = item.teams.flatMap((t: any) => t.members).filter((m: any) => m !== "");
      localStorage.setItem('master-roster', JSON.stringify(roster));

      alert("🔄 RESTORED: App is now displaying this historical round.");
      router.push('/'); // Send back to Hub to see the results
    }
  };

  // 3. RESET: Wipe active slots only
  const resetCurrent = () => {
    if (confirm("Wipe current active round? History will remain safe.")) {
      localStorage.removeItem('tournament-course');
      localStorage.removeItem('final-teams');
      localStorage.removeItem('blitz-scores-v1');
      localStorage.removeItem('side-matchups');
      localStorage.removeItem('master-roster');
      alert("✨ RESET COMPLETE: Ready for a new tournament.");
      window.location.reload();
    }
  };

  const deleteHistoryItem = (id: number) => {
    if (confirm("Delete this history record forever?")) {
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem('blitz-history', JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <Link href="/setup" className="inline-flex items-center gap-2 text-emerald-500 font-black mb-8 opacity-60 hover:opacity-100">
          <ChevronLeft /> Back to Setup
        </Link>

        <header className="border-b-4 border-rose-600 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black italic text-rose-600">Admin Control</h1>
            <p className="text-[10px] text-zinc-600 font-black tracking-widest mt-2 uppercase">Lifecycle Management</p>
          </div>
          <div className="bg-rose-600/10 border border-rose-600/20 p-3 rounded-2xl flex items-center gap-3 text-rose-500">
            <AlertCircle size={20} />
            <span className="text-[8px] font-black leading-tight">ACTIVE DATA IS <br />TEMPORARY</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={archiveTournament} className="bg-emerald-600 text-emerald-950 p-8 rounded-[2.5rem] font-black italic flex flex-col items-center text-center gap-4 hover:bg-emerald-500 transition-all shadow-2xl active:scale-95">
            <Archive size={40} />
            <div>
              <p className="text-xl leading-none">Finalize & Archive</p>
              <p className="text-[9px] opacity-70 mt-2">Save current session to history</p>
            </div>
          </button>

          <button onClick={resetCurrent} className="bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2.5rem] font-black italic flex flex-col items-center text-center gap-4 hover:border-rose-600 text-rose-600 transition-all shadow-2xl active:scale-95">
            <RotateCcw size={40} />
            <div>
              <p className="text-xl leading-none">New Tournament</p>
              <p className="text-[9px] opacity-50 mt-2">Wipe active data for fresh start</p>
            </div>
          </button>
        </div>

        <section className="space-y-6 pt-12 border-t border-zinc-900">
          <h2 className="text-2xl font-black italic text-zinc-500 flex items-center gap-3 uppercase">
            <History size={24} /> Tournament History
          </h2>

          <div className="space-y-4">
            {history.map((h) => (
              <div key={h.id} className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 flex justify-between items-center group hover:border-emerald-500/50 transition-all">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 mb-1">{h.date}</p>
                  <p className="text-2xl font-black italic text-emerald-500">
                    {h.course?.name || "MCC BLITZ"}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-500 mt-1">{h.teams?.length || 0} Teams • Settled</p>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => restoreHistory(h)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-6 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-emerald-500 hover:text-emerald-950 hover:border-emerald-500 transition-all"
                  >
                    <PlayCircle size={16} /> VIEW & RESTORE
                  </button>
                  <button onClick={() => deleteHistoryItem(h.id)} className="p-3 text-zinc-800 hover:text-rose-600 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-20 bg-zinc-900/10 rounded-[3rem] border-2 border-dashed border-zinc-900 text-zinc-800 font-black italic">
                Archive a round to see it here.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
