'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/alphaTab/supabase'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) router.push('/')
      else setChecking(false)
    })
    return () => { mounted = false }
  }, [router])

  // [MAESTRO-AUTH-GUTTER-PROBE] Debug-gated cold-launch viewport probe. Silent unless
  // localStorage.maestro_auth_gutter_probe === '1'. Logs primitives only. Checks whether
  // this page's `fixed inset-0` wrapper resolves against the same short/buggy iOS PWA
  // live viewport already confirmed in MAESTRO-UI-009A (Synth Player). wrapperRef is
  // attached to whichever top-level wrapper div is currently rendered (checking vs. main).
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('maestro_auth_gutter_probe') !== '1') return

    const logProbe = (trigger: string) => {
      const wrapper = wrapperRef.current
      const wrapperRect = wrapper?.getBoundingClientRect() ?? null
      const wrapperStyle = wrapper ? window.getComputedStyle(wrapper) : null
      console.log('[MAESTRO-AUTH-GUTTER-PROBE]', {
        page: 'sign-in',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // TODO: if !rememberMe, consider session-only persistence (Phase 2)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  if (checking) {
    return (
      <div ref={wrapperRef} className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            🎸 Maestro.AI
          </h1>
          <p className="text-gray-600 text-lg mt-1">Guitar Practice Suite</p>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

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
              className="w-full p-4 border-2 border-gray-300 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full p-4 border-2 border-gray-300 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <a
              href="/auth/reset-password"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Forgot password?
            </a>
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
