import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// The one way back. Every setup page — players, money, format, course,
// pairings, side matches — shows this same link in the same place, with
// the name of the page you are on beside it.
export default function SetupBack({ here }: { here: string }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm normal-case not-italic">
      <Link href="/setup" className="text-emerald-400 font-semibold inline-flex items-center gap-2 hover:text-emerald-300">
        <ArrowLeft size={16}/> Tournament setup
      </Link>
      <span className="text-zinc-600">/</span>
      <span className="text-zinc-400">{here}</span>
    </nav>
  )
}
