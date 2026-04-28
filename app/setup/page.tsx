import Link from 'next/link';

export default function SetupPage() {
  return (
    <div className="p-8 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-emerald-400">Setup Center</h1>
      <div className="grid gap-4">
        <Link href="/setup/roster" className="p-4 border border-zinc-800 rounded hover:bg-zinc-900">Manage Roster</Link>
        <Link href="/setup/course" className="p-4 border border-zinc-800 rounded hover:bg-zinc-900">Course Config</Link>
        <Link href="/setup/money" className="p-4 border border-zinc-800 rounded hover:bg-zinc-900">Money & Units</Link>
      </div>
    </div>
  );
}
