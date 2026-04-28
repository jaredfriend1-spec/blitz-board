"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trophy, Swords } from 'lucide-react';
import Link from 'next/link';

export default function PayoutDetails() {
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any>({});
  const [matchups, setMatchups] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('final-teams');
    const s = localStorage.getItem('blitz-scores-v1');
    const m = localStorage.getItem('side-matchups');

    if (t) setTeams(JSON.parse(t));
    if (s) setScores(JSON.parse(s));
    if (m) setMatchups(JSON.parse(m));

    setIsLoaded(true);
  }, []);

  const getPlayerScore = (playerName: string, holeIdx: number): number => {
    let found = 0;
    teams.forEach(t => {
      const idx = t.members.indexOf(playerName);
      if (idx !== -1) found = scores[t.name]?.[holeIdx]?.[idx] || 0;
    });
    return found;
  };

  const getTeamScore = (teamName: string, holeIdx: number): number => {
    const hScores = (scores[teamName]?.[holeIdx] || []).filter((s: number) => s > 0);
    if (hScores.length < 2) return 0;
    const sorted = [...hScores].sort((a, b) => a - b);
    return sorted[0] + sorted[1];
  };

  const getSkinWinner = (holeIdx: number) => {
    let holeResults: { name: string, s: number }[] = [];
    teams.forEach(t => {
      t.members.forEach((m: string, idx: number) => {
        const val = scores[t.name]?.[holeIdx]?.[idx];
        if (val > 0) holeResults.push({ name: m, s: val });
      });
    });
    if (holeResults.length === 0) return null;
    const min = Math.min(...holeResults.map(x => x.s));
    const winners = holeResults.filter(x => x.s === min);
    return winners.length === 1 ? winners[0].name : "TIED";
  };

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <div className="max-w-7xl mx-auto space-y-12 pb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 font-black mb-8 opacity-60 hover:opacity-100 transition-all">
          <ChevronLeft /> Back to Hub
        </Link>

        <header className="border-b-4 border-amber-500 pb-4">
          <h1 className="text-4xl font-black italic text-amber-400">Payout Scorecards</h1>
          <p className="text-[10px] text-zinc-600 font-black tracking-[.4em] mt-2 italic uppercase">Hole-by-Hole Evidence</p>
        </header>

        {/* SKINS GRID */}
        <section className="space-y-6">
          <h2 className="text-xl font-black italic text-zinc-500 flex items-center gap-3">
            <Trophy size={20} className="text-amber-500" /> Individual Skins Log
          </h2>
          <div className="overflow-x-auto bg-zinc-900/40 rounded-[2.5rem] border border-zinc-800 p-8 shadow-2xl">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="p-4 text-left border-b border-zinc-800 min-w-[150px] text-[10px] text-zinc-600">PLAYER</th>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <th key={i} className="p-2 border-b border-zinc-800 text-center min-w-[45px] text-[10px] text-zinc-800 font-black">H{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.flatMap(t => t.members).filter(m => m !== "").map((player) => (
                  <tr key={player}>
                    <td className="p-4 border-b border-zinc-800 font-black text-xs text-zinc-300 italic">{player}</td>
                    {Array.from({ length: 18 }).map((_, h) => (
                      <td key={h} className="p-2 border-b border-zinc-800 text-center">
                        {getSkinWinner(h) === player ? (
                          <div className="w-8 h-8 bg-amber-500 rounded-full mx-auto flex items-center justify-center text-zinc-950 shadow-[0_0_15px_rgba(232,184,48,0.4)]">
                            <Trophy size={14} />
                          </div>
                        ) : <div className="w-1 h-1 bg-zinc-800 rounded-full mx-auto" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SIDE MATCHES WITH PLAYER SCORES */}
        <section className="space-y-6">
          <h2 className="text-xl font-black italic text-zinc-500 flex items-center gap-3">
            <Swords size={20} className="text-rose-500" /> Side Match Timeline
          </h2>
          <div className="space-y-8">
            {matchups.map((m, mIdx) => (
              <div key={mIdx} className="bg-zinc-900/60 border-2 border-zinc-800 rounded-[3rem] p-8 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
                  <div className="text-2xl font-black italic">{m.sideA} <span className="text-zinc-700 mx-2 text-sm">VS</span> {m.sideB}</div>
                  <div className="text-[10px] font-black text-zinc-600 tracking-widest italic">18-HOLE MATCHPLAY TRACKER</div>
                </div>

                {/* MATCHPLAY VISUAL (A/B) */}
                <div className="flex gap-1 mb-8 overflow-x-auto pb-4">
                  {Array.from({ length: 18 }).map((_, h) => {
                    const isTeamA = teams.some(t => t.name === m.sideA);
                    const isTeamB = teams.some(t => t.name === m.sideB);
                    const sA = isTeamA ? getTeamScore(m.sideA, h) : getPlayerScore(m.sideA, h);
                    const sB = isTeamB ? getTeamScore(m.sideB, h) : getPlayerScore(m.sideB, h);
                    const win = (sA > 0 && sB > 0) ? (sA < sB ? 'A' : (sB < sA ? 'B' : 'T')) : '-';

                    return (
                      <div key={h} className="flex-1 flex flex-col items-center gap-2 min-w-[34px]">
                        <span className="text-[8px] font-black text-zinc-700">H{h + 1}</span>
                        <div className={`w-full h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${win === 'A' ? 'bg-emerald-500 text-emerald-950' :
                            win === 'B' ? 'bg-rose-500 text-rose-950' : 'bg-zinc-950 text-zinc-800 border border-zinc-800'
                          }`}>
                          {win === 'T' ? '•' : win}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DETAILED PLAYER SCORES (NEW) */}
                <div className="space-y-2 bg-zinc-950/50 p-6 rounded-3xl border border-zinc-900">
                  <div className="flex gap-1">
                    <div className="w-24 text-[9px] font-black text-zinc-600 self-center">{m.sideA}</div>
                    {Array.from({ length: 18 }).map((_, h) => {
                      const isT = teams.some(t => t.name === m.sideA);
                      const score = isT ? getTeamScore(m.sideA, h) : getPlayerScore(m.sideA, h);
                      return <div key={h} className={`flex-1 text-center py-2 text-xs font-black ${score === 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>{score || '-'}</div>
                    })}
                  </div>
                  <div className="flex gap-1 border-t border-zinc-900 pt-2">
                    <div className="w-24 text-[9px] font-black text-zinc-600 self-center">{m.sideB}</div>
                    {Array.from({ length: 18 }).map((_, h) => {
                      const isT = teams.some(t => t.name === m.sideB);
                      const score = isT ? getTeamScore(m.sideB, h) : getPlayerScore(m.sideB, h);
                      return <div key={h} className={`flex-1 text-center py-2 text-xs font-black ${score === 0 ? 'text-zinc-900' : 'text-zinc-400'}`}>{score || '-'}</div>
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
