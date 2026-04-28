"use client";
import React from 'react';
import { Trophy, ChevronLeft, Flag } from 'lucide-react';
import Link from 'next/link';

const players = ["Rick Sovero", "Jeff Perkins", "Tony Zamostny", "George Blyth IV"];
const mockScores: Record<string, number[]> = {
  "Rick Sovero": [4, 4, 4, 4, 4, 4, 4, 4, 4],
  "Jeff Perkins": [5, 4, 3, 4, 6, 4, 5, 4, 3],
  "Tony Zamostny": [4, 4, 4, 4, 4, 4, 4, 4, 3],
  "George Blyth IV": [4, 5, 6, 4, 5, 6, 4, 5, 6]
};

export default function BigBoard() {
  const getHoleSkin = (holeIdx: number) => {
    const scores = Object.values(mockScores).map(s => s[holeIdx]);
    const min = Math.min(...scores);
    return scores.filter(s => s === min).length === 1 ? min : null;
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans uppercase tracking-tight">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-emerald-500 font-black italic opacity-50 hover:opacity-100"><ChevronLeft size={20} /> Back to Hub</Link>
      <header className="flex justify-between items-end mb-12 border-b-4 border-emerald-500 pb-6">
        <h1 className="text-6xl font-black italic text-emerald-500 tracking-tighter">BLITZ BOARD</h1>
        <div className="text-right flex items-center gap-4 text-zinc-600 font-bold text-xl"><Flag size={24} className="text-emerald-500" /> ROLLING ROAD</div>
      </header>
      <div className="bg-zinc-900/30 rounded-[2rem] border-2 border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-800/40 text-zinc-500 border-b border-zinc-800 text-lg font-black italic">
              <th className="p-8">Player</th>
              {Array.from({ length: 9 }).map((_, i) => (<th key={i} className="text-center opacity-30">H{i + 1}</th>))}
              <th className="p-8 text-right text-emerald-400">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-zinc-900 font-black italic uppercase">
            {players.map(player => (
              <tr key={player}>
                <td className="p-8 text-3xl">{player}</td>
                {mockScores[player].map((score, idx) => {
                  const isSkin = score === getHoleSkin(idx);
                  return (
                    <td key={idx} className={`text-center text-4xl ${isSkin ? 'text-amber-400' : 'text-zinc-800'}`}>
                      <div className="relative inline-block px-2">{score}{isSkin && <Trophy className="absolute -top-6 -right-4 text-amber-400" size={20} />}</div>
                    </td>
                  );
                })}
                <td className="p-8 text-right text-6xl text-emerald-500">{mockScores[player].reduce((a, b) => a + b, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
