import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center uppercase font-sans">
      <div className="flex flex-col items-center">
        <h1 className="text-6xl font-black italic text-emerald-500 mb-2 text-center tracking-tighter">
          BLITZ BOARD
        </h1>
        <p className="text-[10px] text-zinc-500 font-black mb-12 tracking-[0.3em]">
          LIVE TOURNAMENT ENGINE
        </p>
      </div>
      
      <div className="grid gap-4 w-full max-w-sm">
        <Link 
          href="/scorer" 
          className="bg-emerald-600 p-6 rounded-3xl text-center font-black italic hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
        >
          LIVE SCORER
        </Link>
        
        <Link 
          href="/results" 
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center font-black italic hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
        >
          LEADERBOARD
        </Link>
      </div>
      
      <footer className="mt-20 flex flex-col items-center gap-1 opacity-20">
        <div className="h-px w-12 bg-zinc-700 mb-2" />
        <p className="text-[8px] text-zinc-500 font-bold tracking-widest text-center">
          MCC SPECIAL EDITION • 2026
        </p>
      </footer>
    </main>
  )
}
