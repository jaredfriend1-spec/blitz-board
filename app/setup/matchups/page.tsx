"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Users, Sword, Trash2, Save } from 'lucide-react';
import Link from 'next/link';

export default function MatchupCenter() {
  const [roster, setRoster] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    setRoster(JSON.parse(localStorage.getItem('master-roster') || '[]'));
    setTeams(JSON.parse(localStorage.getItem('final-teams') || '[]'));
    setMatches(JSON.parse(localStorage.getItem('side-matchups') || '[]'));
  }, []);

  const addMatch = (type: 'PvP' | 'TvT') => {
    setMatches([...matches, { id: Date.now(), type, sideA: "", sideB: "", stake: 17 }]);
  };

  const saveMatches = () => {
    localStorage.setItem('side-matchups', JSON.stringify(matches));
    alert("✅ MATCHUPS SAVED");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <Link href="/setup" className="text-emerald-500 font-black italic mb-12 inline-block"><ChevronLeft size={20} /> Back</Link>
      <h1 className="text-5xl font-black italic text-rose-500 mb-12">Matchup Manager</h1>

      <div className="flex gap-4 mb-12">
        <button onClick={() => addMatch('PvP')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black italic flex flex-col items-center gap-4 hover:border-emerald-500 transition-all shadow-xl">
          <User size={32} className="text-emerald-500" /> ADD PLAYER VS PLAYER
        </button>
        <button onClick={() => addMatch('TvT')} className="flex-1 bg-zinc-900 border-2 border-zinc-800 p-8 rounded-[2rem] font-black italic flex flex-col items-center gap-4 hover:border-blue-500 transition-all shadow-xl">
          <Users size={32} className="text-blue-500" /> ADD TEAM VS TEAM
        </button>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {matches.map((m, idx) => (
          <div key={m.id} className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 flex items-center gap-6 shadow-xl">
            <select value={m.sideA} onChange={e => { const nm = [...matches]; nm[idx].sideA = e.target.value; setMatches(nm); }} className="flex-1 bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-black text-[10px] appearance-none">
              <option value="">SIDE A</option>
              {m.type === 'PvP' ? roster.map(p => <option key={p} value={p}>{p}</option>) : teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <Sword className="text-zinc-800" />
            <select value={m.sideB} onChange={e => { const nm = [...matches]; nm[idx].sideB = e.target.value; setMatches(nm); }} className="flex-1 bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-black text-[10px] appearance-none">
              <option value="">SIDE B</option>
              {m.type === 'PvP' ? roster.map(p => <option key={p} value={p}>{p}</option>) : teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <button onClick={() => setMatches(matches.filter(i => i.id !== m.id))} className="text-rose-900"><Trash2 /></button>
          </div>
        ))}
        {matches.length > 0 && <button onClick={saveMatches} className="w-full bg-rose-500 text-white p-6 rounded-2xl font-black italic shadow-2xl mt-12"><Save /> PUBLISH MATCHUPS</button>}
      </div>
    </div>
  );
}
