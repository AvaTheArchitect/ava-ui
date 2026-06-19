'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/alphaTab/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let mounted = true

    // If the recovery session is already established (e.g. page refresh after
    // the SDK exchanged the PKCE code), the session will be present here.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) setReady(true)
    })

    // The SDK fires PASSWORD_RECOVERY after auto-exchanging the code in the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' && session) setReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="text-gray-700 font-semibold text-lg">Password updated!</p>
          <p className="text-gray-500 text-sm">Redirecting to the app…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Verifying reset link…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            🎸 Maestro.AI
          </h1>
          <p className="text-gray-700 font-medium mt-2">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full p-4 border-2 border-gray-300 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat new password"
              className="w-full p-4 border-2 border-gray-300 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
