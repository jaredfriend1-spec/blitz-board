"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Cloud } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Scorer() {
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<any>({});

  useEffect(() => {
    const t = localStorage.getItem('final-teams');
    if (t) setTeams(JSON.parse(t));

    const scoresRef = ref(db, 'live-scores');
    return onValue(scoresRef, (snapshot) => {
      if (snapshot.val()) setScores(snapshot.val());
    });
  }, []);

  const update = (team: string, hole: number, player: number, val: string) => {
    const num = parseInt(val) || 0;
    const next = { ...scores };
    if (!next[team]) next[team] = {};
    if (!next[team][hole]) next[team][hole] = [0, 0, 0, 0];
    next[team][hole][player] = num;
    set(ref(db, 'live-scores'), next);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans uppercase">
      <Link href="/" className="text-emerald-500 font-bold mb-4 inline-block">HUB</Link>
      <div className="space-y-4">
        {teams.map((team: any) => (
          <div key={team.name} className="border border-zinc-800 p-4 rounded-xl">
            <h2 className="text-emerald-500 mb-4">{team.name}</h2>
            {team.members.map((m: string, pIdx: number) => (
              <div key={pIdx} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] w-20 truncate">{m || "PLAYER"}</span>
                <div className="flex gap-1 overflow-x-auto">
                  {[...Array(18)].map((_, hIdx) => (
                    <input
                      key={hIdx}
                      type="number"
                      value={scores[team.name]?.[hIdx]?.[pIdx] || ""}
                      onChange={(e) => update(team.name, hIdx, pIdx, e.target.value)}
                      className="w-7 h-7 bg-zinc-900 border border-zinc-700 text-center text-[10px]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
