import Link from 'next/link'
import SetupBack from '@/components/SetupBack'

// ─────────────────────────────────────────────────────────────────────
// HOW TO SET UP A TOURNAMENT
// The written directions for the Tournament setup screen, linked from
// that screen so they are one click away while setting up.
// ─────────────────────────────────────────────────────────────────────

function Part({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-emerald-500 text-black text-sm font-semibold flex items-center justify-center flex-shrink-0">{n}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-zinc-300 leading-relaxed sm:pl-10">{children}</div>
    </section>
  )
}

const B = ({ children }: { children: React.ReactNode }) => <span className="font-semibold text-white">{children}</span>

export default function SetupHelp() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-28">
        <SetupBack here="How to set up a tournament"/>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">How to set up a tournament</h1>
        <p className="text-zinc-400 mt-3 mb-8 leading-relaxed">
          Everything happens on one screen, <Link href="/setup" className="text-emerald-400 hover:text-emerald-300 underline">Tournament setup</Link>.
          The left side is what you decide once for the whole trip. The right side has a row for each day.
          You can set up the whole week before anyone tees off, and change any of it later.
        </p>

        <div className="space-y-4">

          <Part n={1} title="Get the courses and players into the app">
            <p>Do this first, because the later steps pick from these lists.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><B>Courses.</B> Open the <Link href="/courses" className="text-emerald-400 underline">course library</Link> and add every course you will play. You can type the pars and handicap holes or scan a photo of the scorecard.</li>
              <li><B>Players.</B> They are added in step 3, either typed in or pulled from your saved roster.</li>
            </ul>
          </Part>

          <Part n={2} title="Name the tournament and set the number of days">
            <p>On Tournament setup, under <B>The tournament</B>, choose <B>Name and days</B>. Type the name, pick how many days of golf, and save.</p>
            <p>A row for each day appears on the right. To add or remove a day later, edit this again.</p>
          </Part>

          <Part n={3} title="Add the players and build the teams">
            <p>Choose <B>Players and teams</B>. Add every player with a handicap, create the teams, and put each player on a team.</p>
            <p>Teams stay the same for the whole tournament. Who plays with whom each day is set separately, in step 6.</p>
          </Part>

          <Part n={4} title="Set the money">
            <p>Choose <B>Money</B> and enter the entry fee per player. If part of it goes to skins, enter that too; otherwise leave skins at 0.</p>
            <p>Then pick how the team money is paid:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><B>Whole tournament.</B> One prize paid at the end, on each team&apos;s combined score across every day. Type the dollar amount for each finishing place, for example 1000 for first and 600 for second. The page tells you whether the amounts add up to the pot.</li>
              <li><B>Each day.</B> The team pot is paid every day, half on the front nine and half on the back nine.</li>
            </ul>
            <p>Save before leaving the page.</p>
          </Part>

          <Part n={5} title="Check the team scoring format">
            <p>Choose <B>Team scoring format</B> only if you want something other than the one shown. Most trips leave this alone.</p>
          </Part>

          <Part n={6} title="Plan each day">
            <p>Under <B>The days</B>, work across each day&apos;s row. Any day can be planned ahead of time.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><B>Course.</B> Pick it from the list. Each day can be a different course.</li>
              <li><B>Pairings.</B> Click it, choose <B>Add a group</B>, then click players to put them in that group. Add a tee time if you like. <B>Copy from</B> reuses another day&apos;s groups as a starting point.</li>
              <li><B>Side matches.</B> Optional. Click it to add one-on-one, two-on-two, team or wheel matches for that day. A day can be played with none.</li>
            </ul>
            <p>Nothing you plan for a later day affects the day being played until you open that day.</p>
          </Part>

          <Part n={7} title="On the day: open it and score">
            <p>The day marked <B>Open for scoring</B> is the one the scorer, results and payouts show. To play a different day, choose <B>Open</B> on its row.</p>
            <p>Opening a day never loses anything. The day you leave keeps its scores, pairings and side matches, and you can open it again.</p>
            <p>The scorer shows the cards by pairing, so each group keeps its own. A bar at the top of the scorer, results and payouts always says which day and course you are on, and you can switch days from there too.</p>
          </Part>

          <Part n={8} title="When the golf is done: finish">
            <p>Finishing saves a day to History as the permanent record and locks its scores. You never have to finish a day to move on to the next one.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><B>Finish day</B>, on a day&apos;s row, saves just that day. It lets you set the date the round was played.</li>
              <li><B>Finish tournament</B>, at the top, saves every day that is not finished yet and ends the tournament. It shows what will happen to each day before you confirm.</li>
            </ul>
            <p>Fix any scorecard mistakes before finishing. Team standings for the whole tournament are on the Results page under Team, and count every day whether it is finished or not.</p>
          </Part>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <h2 className="text-lg font-semibold mb-3">If you need to undo something</h2>
            <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
              <p>At the bottom of Tournament setup, open <B>Sample data, clear scores or start over</B>.</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><B>Clear today&apos;s scores</B> removes the scores on the open day only.</li>
                <li><B>Start over from Day 1</B> is for clearing practice rounds. It removes every score and this tournament&apos;s finished days, and keeps players, teams, courses, pairings, side matches and money.</li>
                <li><B>Fill with sample data</B> adds made-up pairings, matches and scores so you can look the screens over before the trip. Start over from Day 1 removes it.</li>
                <li><B>Start a new tournament</B> clears the trip and teams for next time. Players and past results stay.</li>
              </ul>
              <p>Starting over cannot be reversed, so it asks you to type a confirmation first.</p>
            </div>
          </section>
        </div>

        <Link href="/setup" className="mt-8 inline-flex bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-3 rounded-xl font-semibold text-sm">
          Go to Tournament setup
        </Link>
      </div>
    </div>
  )
}
