"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, resetPassword } from '@/lib/auth'
import { Shield, Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return setError('Please enter email and password')
    setLoading(true)
    setError('')
    try {
      const { role } = await signIn(email.trim(), password)
      if (role === 'master') router.push('/master')
      else if (role === 'scorer') router.push('/?role=scorer')
      else setError('Your account does not have access to this app.')
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        setError('Incorrect email or password')
      } else if (e.code === 'auth/user-not-found') {
        setError('No account found with that email')
      } else if (e.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.')
      } else {
        setError('Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!resetEmail.trim()) return
    try {
      await resetPassword(resetEmail.trim())
      setResetSent(true)
    } catch {
      setError('Could not send reset email. Check the address.')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-6 pt-16">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-4">
            <Shield size={28} className="text-emerald-400"/>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            BLITZ<span className="text-emerald-400">BOARD</span>
          </h1>
          <p className="text-zinc-600 text-xs font-medium normal-case mt-1">Admin Sign In</p>
        </div>

        {!showReset ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="text-zinc-500 text-[10px] font-semibold tracking-widest block mb-2">EMAIL</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  placeholder="you@email.com"
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 pl-9 pr-4 py-3.5 rounded-xl text-white text-sm font-medium outline-none transition-colors placeholder:text-zinc-700"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-zinc-500 text-[10px] font-semibold tracking-widest block mb-2">PASSWORD</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"/>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  placeholder="••••••••"
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 pl-9 pr-10 py-3.5 rounded-xl text-white text-sm font-medium outline-none transition-colors placeholder:text-zinc-700"
                  autoComplete="current-password"
                />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                <p className="text-rose-400 text-xs font-semibold">{error}</p>
              </div>
            )}

            {/* Sign in button */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-4 rounded-xl font-black text-sm transition-colors">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Forgot password */}
            <button
              onClick={() => { setShowReset(true); setResetEmail(email) }}
              className="w-full text-zinc-600 hover:text-zinc-400 text-xs font-medium transition-colors py-1">
              Forgot password?
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <button onClick={() => setShowReset(false)}
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs font-semibold transition-colors mb-2">
              <ArrowLeft size={14}/> Back
            </button>
            <h2 className="font-bold text-white">Reset Password</h2>
            <p className="text-zinc-500 text-xs font-medium normal-case">
              Enter your email and we'll send a reset link.
            </p>
            {!resetSent ? (
              <>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-black border border-zinc-700 focus:border-emerald-500 px-4 py-3.5 rounded-xl text-white text-sm font-medium outline-none transition-colors"
                />
                <button onClick={handleReset}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black text-sm transition-colors">
                  Send Reset Email
                </button>
              </>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                <p className="text-emerald-400 text-sm font-semibold">✓ Reset email sent! Check your inbox.</p>
              </div>
            )}
          </div>
        )}

        <Link href="/"
          className="block text-center text-zinc-700 hover:text-zinc-500 text-xs font-medium mt-6 transition-colors">
          ← Back to app
        </Link>
      </div>
    </div>
  )
}