'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/alphaTab/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return
      if (!user) {
        router.replace('/auth/sign-in')
      } else {
        setEmail(user.email ?? null)
        setUserId(user.id)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/sign-in')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            🎸 Maestro.AI
          </h1>
          <p className="text-gray-700 font-semibold mt-2 text-lg">Profile</p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Signed in as</p>
            <p className="text-gray-800 font-medium break-all">{email}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">User ID</p>
            <p className="text-gray-600 text-sm font-mono break-all">{userId}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-xl text-base font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-300"
          >
            ← Back to App
          </button>
          <button
            onClick={handleSignOut}
            className="w-full bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-base font-semibold hover:bg-red-100 transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
