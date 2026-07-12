'use client'

import React, { useState, useEffect, useRef } from 'react'
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

  // [MAESTRO-FIXED-INSET-PROBE] Debug-gated cold-launch viewport probe. Silent unless
  // localStorage.maestro_fixed_inset_probe === '1'. Logs primitives only — never DOM/api
  // references. Checks whether this page's `fixed inset-0` wrappers resolve against the
  // same short/buggy iOS PWA live viewport already confirmed in MAESTRO-UI-009A (Synth
  // Player). Two refs since the loading gate and the main content are separate
  // top-level wrappers; only one is ever mounted, so exactly one ref is non-null at a
  // time — that determines the logged `branch`.
  const loadingWrapperRef = useRef<HTMLDivElement>(null)
  const mainWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('maestro_fixed_inset_probe') !== '1') return

    const logProbe = (trigger: string) => {
      const wrapper = loadingWrapperRef.current ?? mainWrapperRef.current
      const branch = loadingWrapperRef.current ? 'loading' : mainWrapperRef.current ? 'profile-main' : null
      const wrapperRect = wrapper?.getBoundingClientRect() ?? null
      const wrapperStyle = wrapper ? window.getComputedStyle(wrapper) : null
      console.log('[MAESTRO-FIXED-INSET-PROBE]', {
        page: 'profile',
        branch,
        trigger,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        innerHeight: window.innerHeight,
        outerHeight: window.outerHeight,
        screenHeight: window.screen?.height ?? null,
        visualViewportHeight: window.visualViewport?.height ?? null,
        docClientHeight: document.documentElement.clientHeight,
        bodyHeight: document.body.getBoundingClientRect().height,
        wrapperTop: wrapperRect?.top ?? null,
        wrapperBottom: wrapperRect?.bottom ?? null,
        wrapperHeight: wrapperRect?.height ?? null,
        wrapperComputedPosition: wrapperStyle?.position ?? null,
        wrapperComputedTop: wrapperStyle?.top ?? null,
        wrapperComputedBottom: wrapperStyle?.bottom ?? null,
        wrapperComputedHeight: wrapperStyle?.height ?? null,
        wrapperComputedMinHeight: wrapperStyle?.minHeight ?? null,
        orientationType: window.screen?.orientation?.type ?? null,
        isLandscape: window.matchMedia('(orientation: landscape)').matches,
      })
    }

    logProbe('mount')
    const raf = requestAnimationFrame(() => logProbe('raf'))
    const t250 = setTimeout(() => logProbe('timeout-250'), 250)
    const t1000 = setTimeout(() => logProbe('timeout-1000'), 1000)
    const onResize = () => logProbe('window-resize')
    const onOrientation = () => logProbe('orientationchange')
    const onVvResize = () => logProbe('visualViewport-resize')

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrientation)
    window.visualViewport?.addEventListener('resize', onVvResize)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t250)
      clearTimeout(t1000)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientation)
      window.visualViewport?.removeEventListener('resize', onVvResize)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/sign-in')
  }

  if (loading) {
    return (
      <div ref={loadingWrapperRef} className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={mainWrapperRef} className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 overflow-hidden">
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
