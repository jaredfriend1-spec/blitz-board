"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BLITZ_TEAMS } from '@/lib/data';

export default function TeamBetsPage() {
  const [scores, setScores] = useState<Record<string, Record<number, number[]>>>({});

  useEffect(() => {
    const saved = localStorage.getItem('blitz-scores-v1');
    if (saved) setScores(JSON.parse(saved));
  }, []);

  const calculateTeamHole = (teamId: string, holeIdx: number) => {
    const holeScores = scores[teamId]?.[holeIdx] || [0, 0, 0, 0];
    const valid = holeScores.filter(s => s > 0);
    if (valid.length < 2) return "-";
    const sorted = [...valid].sort((a, b) => a - b);
    return sorted[0] + sorted[1];
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans uppercase">
      <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 font-black italic mb-8"><ChevronLeft size={20} /> Back</Link>
      <h1 className="text-5xl font-black italic text-emerald-500 mb-12">Team Bets</h1>
      <div className="space-y-6">
        {BLITZ_TEAMS.map(team => (
          <div key={team.id} className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 shadow-xl">
            <h2 className="text-3xl font-black italic text-zinc-100 mb-4">{team.name}</h2>
            <div className="flex overflow-x-auto gap-2 pb-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="min-w-[60px] bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-center">
                  <p className="text-[8px] font-bold text-zinc-600">H{i + 1}</p>
                  <p className="text-xl font-black">{calculateTeamHole(team.id, i)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}