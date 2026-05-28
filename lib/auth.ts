import { auth, db } from './firebase'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User
} from 'firebase/auth'
import { ref, get } from 'firebase/database'

export type UserRole = 'master' | 'scorer' | 'guest' | null

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

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export { onAuthStateChanged, auth }