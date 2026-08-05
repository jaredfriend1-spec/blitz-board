import { auth, db } from './firebase'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User
} from 'firebase/auth'
import { ref, get, set } from 'firebase/database'

export type UserRole = 'master' | 'scorer' | 'player' | 'guest' | null

// Players share one Firebase account. The group code IS its password, so a
// player must know the code to read anything — the database rules require a
// signed-in user. This account's role is 'player', which the rules block from
// writing, so a shared credential can never edit a scorecard.
export const PLAYER_EMAIL = 'players@blitzboard.app'

export async function getUserRole(uid: string): Promise<UserRole> {
  try {
    const snap = await get(ref(db, `users/${uid}/role`))
    return snap.val() as UserRole
  } catch {
    return null
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User; role: UserRole }> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  const role = await getUserRole(result.user.uid)
  return { user: result.user, role }
}

// Sign in with the shared player code. Throws if the code is wrong.
export async function signInAsPlayer(code: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, PLAYER_EMAIL, code)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export { onAuthStateChanged, auth }