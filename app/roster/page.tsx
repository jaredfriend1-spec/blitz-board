"use client";
import React, { useState, useEffect } from 'react';
import { UserPlus, Save, ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function RosterSetup() {
  const [roster, setRoster] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    const r = localStorage.getItem('master-roster');
    const t = localStorage.getItem('final-teams');
    if (r) setRoster(JSON.parse(r));
    if (t) setTeams(JSON.parse(t));
    else setTeams([{ name: "Team 1", members: ["", "", "", ""] }]);
  }, []);

  const saveAll = () => {
    localStorage.setItem('master-roster', JSON.stringify(roster));
    localStorage.setItem('final-teams', JSON.stringify(teams));
    alert("✅ ROSTER & TEAMS PUBLISHED");
  };

  const assigned = teams.flatMap(t => t.members).filter(m => m !== "");
  const available = roster.filter(p => !assigned.includes(p));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <Link href="/setup" className="inline-flex items-center gap-2 text-emerald-500 font-black mb-8"><ChevronLeft size={20} /> Back</Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800 h-fit shadow-2xl">
          <h2 className="text-2xl font-black italic text-emerald-500 mb-6">1. Master Player List</h2>
          <div className="flex gap-2 mb-6">
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} className="flex-1 bg-zinc-950 border border-zinc-800 p-4 rounded-xl font-black" placeholder="ADD PLAYER..." />
            <button onClick={() => { if (playerName) { setRoster([...roster, playerName]); setPlayerName(""); } }} className="bg-emerald-500 text-emerald-950 px-6 rounded-xl font-black">ADD</button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
            {roster.map(p => (
              <div key={p} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                <span className="text-[10px] font-black italic">{p}</span>
                <button onClick={() => setRoster(roster.filter(i => i !== p))} className="text-rose-900 group-hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black italic text-blue-400">2. 4-Man Teams</h2>
            <button onClick={() => setTeams([...teams, { name: `Team ${teams.length + 1}`, members: ["", "", "", ""] }])} className="text-[10px] bg-zinc-800 px-4 py-2 rounded-lg font-black">+ TEAM</button>
          </div>
          {teams.map((t, tIdx) => (
            <div key={tIdx} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
              <input value={t.name} onChange={e => { const nt = [...teams]; nt[tIdx].name = e.target.value; setTeams(nt); }} className="bg-transparent border-b border-zinc-800 mb-4 w-full font-black italic text-emerald-500 outline-none text-xl" />
              <div className="grid grid-cols-2 gap-2">
                {t.members.map((m: any, mIdx: number) => (
                  <select key={mIdx} value={m} onChange={e => { const nt = [...teams]; nt[tIdx].members[mIdx] = e.target.value; setTeams(nt); }} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-[10px] font-black appearance-none">
                    <option value="">EMPTY</option>
                    {m && <option value={m}>{m}</option>}
                    {available.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ))}
              </div>
            </div>
          ))}
          <button onClick={saveAll} className="w-full bg-emerald-500 text-emerald-950 p-6 rounded-2xl font-black italic shadow-2xl flex justify-center gap-3"><Save /> PUBLISH TOURNAMENT TEAMS</button>
        </div>
      </div>
    </div>
  );
}
