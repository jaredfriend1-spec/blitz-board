"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Sword } from 'lucide-react';
import Link from 'next/link';

export default function SideMatchups() {
  const [config, setConfig] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);

  useEffect(() => {
    const savedConfig = localStorage.getItem('tournament-config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    const savedMatches = localStorage.getItem('side-matchups');
    if (savedMatches) setMatchups(JSON.parse(savedMatches));
  }, []);

  const createMatch = (sideA: string, sideB: string) => {
    const newMatch = { id: Date.now(), sideA, sideB, scoreA: 0, scoreB: 0 };
    const updated = [...matchups, newMatch];
    setMatchups(updated);
    localStorage.setItem('side-matchups', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <Link href="/" className="text-emerald-500 font-black italic mb-8 inline-block">Back</Link>
      <h1 className="text-5xl font-black italic text-rose-500 mb-12">Matchups</h1>

      {/* MATCHUP LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchups.map(m => (
          <div key={m.id} className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center shadow-xl">
            <div className="text-center flex-1">
              <p className="text-lg font-black italic">{m.sideA}</p>
              <p className="text-4xl font-black text-emerald-500 mt-2">{m.scoreA}</p>
            </div>
            <Sword className="text-zinc-800" size={24} />
            <div className="text-center flex-1">
              <p className="text-lg font-black italic">{m.sideB}</p>
              <p className="text-4xl font-black text-rose-500 mt-2">{m.scoreB}</p>
            </div>
          </div>
        ))}

        {/* ADD MATCHUP (Simplified for now) */}
        <button onClick={() => createMatch("TEAM 1", "TEAM 2")} className="bg-zinc-900 border-4 border-dashed border-zinc-800 p-8 rounded-[2rem] flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all">
          <Plus /> <span className="font-black italic">NEW MATCHUP</span>
        </button>
      </div>
    </div>
  );
}