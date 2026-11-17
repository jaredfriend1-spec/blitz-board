import { set as fbSet, update as fbUpdate } from 'firebase/database'

// ─────────────────────────────────────────────────────────────────────
// SAVE CONFIRMATION
// Most setup pages save the moment something is tapped, with no Save
// button — which leaves people wondering whether it worked. These are
// drop-in replacements for Firebase's set() and update() that show a
// small "Saved" note when the write lands, and say so plainly when it
// does not (for example when a sign-in has expired).
// ─────────────────────────────────────────────────────────────────────

let el: HTMLDivElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export function showSaved(text = 'Saved', ok = true) {
  if (typeof document === 'undefined') return
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.className = `fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 px-4 py-2.5 rounded-full text-sm font-semibold shadow-lg pointer-events-none max-w-[90vw] text-center ${ok ? 'bg-emerald-500 text-black' : 'bg-rose-600 text-white'}`
  el.textContent = ok ? `✓ ${text}` : text
  el.style.opacity = '1'
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { if (el) el.style.opacity = '0' }, ok ? 1800 : 7000)
}

function confirmWrite(p: Promise<void>): Promise<void> {
  return p.then(
    () => showSaved(),
    e => {
      const m = String(e?.message || e)
      showSaved(/permission/i.test(m) ? 'Not saved. Sign out, sign back in, and try again.' : `Not saved. ${m}`, false)
      throw e
    },
  )
}

export const set: typeof fbSet = (r, v) => confirmWrite(fbSet(r, v))
export const update: typeof fbUpdate = (r, v) => confirmWrite(fbUpdate(r, v))
