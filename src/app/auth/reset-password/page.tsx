'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/alphaTab/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/update-password',
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setStatus('success')
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            🎸 Maestro.AI
          </h1>
          <p className="text-gray-700 font-medium mt-2">Reset your password</p>
          <p className="text-gray-500 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📧</div>
            <p className="text-gray-700 font-semibold">Check your email</p>
            <p className="text-gray-500 text-sm">
              We sent a password reset link to <strong>{email}</strong>.
            </p>
            <a
              href="/auth/sign-in"
              className="block w-full text-center bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
            >
              Back to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full p-4 border-2 border-gray-300 rounded-xl text-base focus:border-purple-500 focus:outline-none"
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
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <a
              href="/auth/sign-in"
              className="block text-center text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Back to Sign In
            </a>
          </form>
        )}
      </div>
    </div>
  )
}
