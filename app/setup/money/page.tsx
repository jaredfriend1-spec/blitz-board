"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Save, DollarSign, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function MoneySetup() {
  const [config, setConfig] = useState({
    entryFee: 10,       // Default Blitz entry
    matchUnit: 5,       // Default Side Bet (from your sheet)
    skinsCarry: true    // Rolling skins
  });

  useEffect(() => {
    const saved = localStorage.getItem('tournament-money');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const saveMoney = () => {
    localStorage.setItem('tournament-money', JSON.stringify(config));
    alert("✅ ECONOMY INITIALIZED");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans uppercase">
      <Link href="/setup" className="inline-flex items-center gap-2 text-emerald-500 font-black mb-8"><ChevronLeft size={20} /> Back</Link>

      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-5xl font-black italic text-emerald-500 border-b-4 border-emerald-500 pb-4">Money Config</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-400 font-black italic"><Wallet size={20} /> BLITZ POT</div>
            <p className="text-[10px] text-zinc-500 font-bold">Entry Fee per Player</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-zinc-700">$</span>
              <input
                type="number" value={config.entryFee}
                onChange={e => setConfig({ ...config, entryFee: parseInt(e.target.value) })}
                className="bg-transparent text-5xl font-black italic text-emerald-500 outline-none w-full"
              />
            </div>
          </div>

          <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-500 font-black italic"><DollarSign size={20} /> SIDE BETS</div>
            <p className="text-[10px] text-zinc-500 font-bold">Standard Bet / Press Unit</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-zinc-700">$</span>
              <input
                type="number" value={config.matchUnit}
                onChange={e => setConfig({ ...config, matchUnit: parseInt(e.target.value) })}
                className="bg-transparent text-5xl font-black italic text-rose-500 outline-none w-full"
              />
            </div>
          </div>
        </div>

        <button onClick={saveMoney} className="w-full bg-emerald-500 text-emerald-950 p-6 rounded-2xl font-black italic shadow-2xl flex justify-center gap-3">
          <Save size={24} /> SAVE SETTINGS
        </button>
      </div>
    </div>
  );
}
