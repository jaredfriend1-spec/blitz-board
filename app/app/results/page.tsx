"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trophy, Target } from 'lucide-react';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';

export default function CloudResults() {
  const [data, setData] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const tournamentRef = ref(db, 'active-tournament');
    const unsubscribe = onValue(tournamentRef, (snapshot) => {
      setData(snapshot.val());
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isLoaded) return <div className="bg-black min-h-screen p-10 text-zinc-700 font-black italic">CONNECTING TO MCC CLOUD...</div>;
  if (!data) return <div className="bg-black min-h-screen p-10 text-zinc-700 font-black italic">NO LIVE DATA FOUND. HIT 'PUBLISH' IN SETUP.</div>;

  const teams = data.teams || [];
  const scores = data.scores || {};

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <div className="max-w-7xl mx-auto">
        <header className="border-b-4 border-emerald-500 pb-6 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black italic text-emerald-500">LIVE RESULTS</h1>
            <p className="text-[10px] text-zinc-600 font-black tracking-widest mt-2">REAL-TIME DATA SYNC</p>
          </div>
          <Link href="/" className="bg-zinc-900 px-6 py-3 rounded-xl border border-zinc-800 text-[10px] font-black hover:bg-emerald-500 transition-all">BACK</Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((t: any, i: number) => (
            <div key={i} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
              <h2 className="text-xl font-black italic mb-4">{t.name}</h2>
              <div className="grid grid-cols-4 gap-2">
                {t.members.map((m: string) => (
                  <div key={m} className="text-[8px] font-bold text-zinc-500 truncate">{m || "EMPTY"}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
