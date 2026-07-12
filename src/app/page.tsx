// Date: July 11, 2026
// File: src/app/page.tsx - LANDING PAGE REDESIGN
// ✅ NO SCROLL DESIGN - Everything fits in one view
// ✅ Mobile: 3x3 Grid with icon-only buttons
// ✅ Desktop: 3x2 Grid with full descriptions
// ✅ Fixed password screen for mobile
// ✅ Practice progress placeholder
// ✅ MAESTRO-UI-011: bottom content padding pb-44→pb-28, was overshooting the fixed nav's ~104-118px height

"use client"

import React, { useState, useEffect } from "react"
import { Guitar, Mic, Music, Settings, Headphones, Home, Users, User, GraduationCap, Wrench, Brain, Timer, Printer, ChevronDown, X, Sun, Moon, Palette, Play, Pause, Speaker, Feather, Piano } from "lucide-react"

// ✅ Fixed Import Path (case sensitive)
import TunerDial from '@/components/tuner/TunerDial'
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/alphaTab/supabase"

export type TabId = "home" | "songs" | "setlist" | "tools" | "profile"
export type ModuleId = "practice" | "singers" | "jam" | "lessons" | "build" | "ai-tab"

// ✅ Module type definition
type ModuleConfig = {
  id: ModuleId
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
  route: string | null
  emoji?: string
  customIcon?: string
}

// ✅ Fixed Metronome Component Structure
const Metronome = ({ onClose }: { onClose?: () => void }) => {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentBeat(prev => (prev + 1) % 4)
      }, (60 / bpm) * 1000)
    }

    return () => clearInterval(interval)
  }, [isPlaying, bpm])

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Metronome</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      <div className="text-center space-y-6">
        {/* BPM Display */}
        <div>
          <div className="text-6xl font-bold text-white mb-2">{bpm}</div>
          <div className="text-white/70">BPM</div>
        </div>

        {/* BPM Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setBpm(Math.max(40, bpm - 10))}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold"
          >
            -10
          </button>
          <button
            onClick={() => setBpm(Math.max(40, bpm - 1))}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold"
          >
            -1
          </button>
          <button
            onClick={() => setBpm(Math.min(200, bpm + 1))}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold"
          >
            +1
          </button>
          <button
            onClick={() => setBpm(Math.min(200, bpm + 10))}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold"
          >
            +10
          </button>
        </div>

        {/* Beat Indicator */}
        <div className="flex justify-center space-x-2 mb-6">
          {[0, 1, 2, 3].map((beat) => (
            <div
              key={beat}
              className={`w-4 h-4 rounded-full transition-colors ${currentBeat === beat && isPlaying
                ? 'bg-orange-500'
                : 'bg-white/30'
                }`}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`
            flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-lg
            ${isPlaying
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
          `}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          <span>{isPlaying ? 'Stop' : 'Start'}</span>
        </button>

        {/* Quick BPM Presets */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {[60, 80, 100, 120, 140, 160, 180, 200].map((preset) => (
            <button
              key={preset}
              onClick={() => setBpm(preset)}
              className={`
                p-2 rounded-lg text-sm font-medium transition-colors
                ${bpm === preset
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
                }
              `}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ✅ Print Component
const PrintComponent = ({ onClose }: { onClose: () => void }) => {
  const [printOptions, setPrintOptions] = useState({
    includeTabs: true,
    includeChords: true,
    includeMetronome: false,
    paperSize: 'letter'
  })

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Print Practice Sheet</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-white font-medium mb-3">Print Options</h4>
          <div className="space-y-3">
            {[
              { key: 'includeTabs', label: 'Include Tablature' },
              { key: 'includeChords', label: 'Include Chord Charts' },
              { key: 'includeMetronome', label: 'Include Metronome Markings' }
            ].map((option) => (
              <label key={option.key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={printOptions[option.key as keyof typeof printOptions] as boolean}
                  onChange={(e) => setPrintOptions(prev => ({
                    ...prev,
                    [option.key]: e.target.checked
                  }))}
                  className="w-5 h-5 rounded bg-white/20 border-white/30 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-3">Paper Size</h4>
          <select
            value={printOptions.paperSize}
            onChange={(e) => setPrintOptions(prev => ({ ...prev, paperSize: e.target.value }))}
            className="w-full p-3 rounded-xl bg-white/20 text-white border border-white/30 focus:ring-2 focus:ring-blue-500"
          >
            <option value="letter">Letter (8.5&quot; x 11&quot;)</option>
            <option value="a4">A4</option>
            <option value="legal">Legal (8.5&quot; x 14&quot;)</option>
          </select>
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <h4 className="text-white font-medium mb-2">Preview</h4>
          <div className="bg-white rounded-lg p-4 text-black text-sm">
            <div className="text-center mb-4">
              <h5 className="font-bold">Practice Session</h5>
              <p className="text-gray-600">Generated by Maestro.AI</p>
            </div>
            <div className="space-y-2">
              {printOptions.includeTabs && <div>📄 Tablature included</div>}
              {printOptions.includeChords && <div>🎸 Chord charts included</div>}
              {printOptions.includeMetronome && <div>⏱️ Metronome markings included</div>}
            </div>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-800 transition-colors">
          <Printer className="w-6 h-6 inline mr-2" />
          Print Practice Sheet
        </button>
      </div>
    </div>
  )
}

// ✅ MAIN APP COMPONENT
export default function MaestroApp(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [currentModule, setCurrentModule] = useState<ModuleId | null>(null)
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ✅ NEW: Tool Toggle System
  const [activeTool, setActiveTool] = useState<'none' | 'metronome' | 'tuner' | 'print' | 'settings'>('none')

  // ✅ AutoClose on Escape Key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTool('none')
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // ✅ Lock orientation to portrait on home page (PWA)
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('portrait');
        }
      } catch (err) {
        // Orientation lock not supported or failed - no problem
        console.log('Orientation lock not available');
      }
    };

    lockOrientation();

    // Unlock when leaving page
    return () => {
      try {
        const orientation = screen.orientation as any;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch (err) {
        // Silent fail
      }
    };
  }, []);

  // Theme and settings state
  const [theme, setTheme] = useState<string>('light')
  const [reducedMotion, setReducedMotion] = useState<boolean>(false)
  const [highContrast, setHighContrast] = useState<boolean>(false)
  const [handedness, setHandedness] = useState<string>('right')
  const [language, setLanguage] = useState<string>('en')
  const [buttonColorMode, setButtonColorMode] = useState<boolean>(true)

  // Load settings from sessionStorage
  useEffect(() => {
    const savedTheme = sessionStorage.getItem('maestro-theme') || 'light'
    const savedMotion = sessionStorage.getItem('maestro-reduced-motion') === 'true'
    const savedContrast = sessionStorage.getItem('maestro-high-contrast') === 'true'
    const savedHand = sessionStorage.getItem('maestro-handedness') || 'right'
    const savedLang = sessionStorage.getItem('maestro-language') || 'en'
    const savedButtonMode = sessionStorage.getItem('maestro-button-color-mode') !== 'false'

    setTheme(savedTheme)
    setReducedMotion(savedMotion)
    setHighContrast(savedContrast)
    setHandedness(savedHand)
    setLanguage(savedLang)
    setButtonColorMode(savedButtonMode)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) router.replace("/auth/sign-in")
      else setAuthChecked(true)
    })
    return () => { mounted = false }
  }, [router])

  // Language translations
  const translations = {
    en: {
      title: 'MAESTRO.AI',
      subtitle: 'Your Complete AI-Powered Music Practice Suite',
      modules: {
        practice: { title: 'Practice Generator', desc: 'AI-powered practice sessions' },
        singers: { title: "Singer's Corner", desc: 'Vocal training & exercises' },
        jam: { title: 'Jam Zone', desc: 'Interactive jam sessions' },
        lessons: { title: 'ProSound Mode', desc: 'Performance & playback' },
        build: { title: "Songwriter's Studio", desc: 'Composition tools' },
        'ai-tab': { title: 'AI Stem & Tab', desc: 'AI-powered transcription' }
      },
      nav: {
        songs: 'Songs',
        setlist: 'Setlist',
        home: 'Home',
        tools: 'Tools',
        profile: 'Profile'
      }
    },
    es: {
      title: 'MAESTRO.AI',
      subtitle: 'Tu Suite Completa de Práctica Musical con IA',
      modules: {
        practice: { title: 'Generador de Práctica', desc: 'Sesiones de práctica con IA' },
        singers: { title: 'Rincón del Cantante', desc: 'Entrenamiento vocal y ejercicios' },
        jam: { title: 'Zona de Jam', desc: 'Sesiones de jam interactivas' },
        lessons: { title: 'Modo ProSound', desc: 'Rendimiento y reproducción' },
        build: { title: 'Estudio de Compositores', desc: 'Herramientas de composición' },
        'ai-tab': { title: 'IA Stem y Tab', desc: 'Transcripción con IA' }
      },
      nav: {
        songs: 'Canciones',
        setlist: 'Lista',
        home: 'Inicio',
        tools: 'Herramientas',
        profile: 'Perfil'
      }
    }
  }

  const t = translations[language as keyof typeof translations] || translations.en

  // Theme functions
  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    sessionStorage.setItem('maestro-theme', newTheme)
  }

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion
    setReducedMotion(newValue)
    sessionStorage.setItem('maestro-reduced-motion', newValue.toString())
  }

  const toggleHighContrast = () => {
    const newValue = !highContrast
    setHighContrast(newValue)
    sessionStorage.setItem('maestro-high-contrast', newValue.toString())
  }

  const toggleButtonColorMode = () => {
    const newValue = !buttonColorMode
    setButtonColorMode(newValue)
    sessionStorage.setItem('maestro-button-color-mode', newValue.toString())
  }

  // Get module colors based on theme and button color mode
  const getModuleColor = (moduleId: string): string => {
    if (theme === 'crayon') {
      const colors: Record<string, string> = {
        practice: 'from-purple-500 to-purple-700 shadow-lg shadow-purple-500/25 text-white',
        singers: 'from-pink-500 to-rose-700 shadow-lg shadow-pink-500/25 text-white',
        jam: 'from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 text-white',
        lessons: 'from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25 text-white',
        build: 'from-orange-500 to-orange-700 shadow-lg shadow-orange-500/25 text-white',
        'ai-tab': 'from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/25 text-white'
      }
      return colors[moduleId] || colors.practice
    }

    if (buttonColorMode) {
      const colors: Record<string, string> = {
        practice: 'from-purple-500 to-purple-700 shadow-lg shadow-purple-500/25 text-white',
        singers: 'from-pink-500 to-rose-700 shadow-lg shadow-pink-500/25 text-white',
        jam: 'from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 text-white',
        lessons: 'from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25 text-white',
        build: 'from-orange-500 to-orange-700 shadow-lg shadow-orange-500/25 text-white',
        'ai-tab': 'from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/25 text-white'
      }
      return colors[moduleId] || colors.practice
    } else {
      switch (theme) {
        case 'dark':
          return 'from-gray-600 to-gray-700 shadow-lg shadow-gray-600/25 text-blue-100'
        case 'guitar-center':
          return 'from-red-700 to-red-800 shadow-lg shadow-red-700/25 text-red-100'
        case 'pro-studio':
          return 'from-blue-800 to-blue-900 shadow-lg shadow-blue-800/25 text-blue-100'
        default:
          return 'bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300'
      }
    }
  }

  const getThemeClasses = (): string => {
    const base = 'min-h-screen transition-colors duration-300'
    const motion = reducedMotion ? '' : 'transition-all duration-300'
    const contrast = highContrast ? 'contrast-125 saturate-125' : ''

    switch (theme) {
      case 'dark':
        return `${base} ${motion} ${contrast} bg-gray-900 text-white relative`
      case 'crayon':
        return `${base} ${motion} ${contrast} bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500 text-white`
      case 'guitar-center':
        return `${base} ${motion} ${contrast} bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 text-white`
      case 'pro-studio':
        return `${base} ${motion} ${contrast} bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white`
      default:
        return `${base} ${motion} ${contrast} bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white`
    }
  }

  const getTitleColor = (): string => {
    switch (theme) {
      case 'dark':
        return 'text-orange-500 font-bold tracking-wide'
      case 'crayon':
        return 'text-white'
      case 'guitar-center':
        return 'text-red-400'
      case 'pro-studio':
        return 'text-blue-400'
      default:
        return 'text-orange-500 font-bold tracking-wide'
    }
  }

  // Main modules configuration
  const modules: ModuleConfig[] = [
    {
      id: 'practice' as ModuleId,
      title: t.modules.practice.title,
      icon: Guitar,
      color: getModuleColor('practice'),
      description: t.modules.practice.desc,
      route: '/synth-player'
    },
    {
      id: 'singers' as ModuleId,
      title: t.modules.singers.title,
      icon: Mic,
      color: getModuleColor('singers'),
      description: t.modules.singers.desc,
      route: '/vocal'
    },
    {
      id: 'jam' as ModuleId,
      title: t.modules.jam.title,
      icon: Music,
      color: getModuleColor('jam'),
      description: t.modules.jam.desc,
      route: null
    },
    {
      id: 'lessons' as ModuleId,
      title: t.modules.lessons.title,
      icon: Speaker,
      color: getModuleColor('lessons'),
      description: t.modules.lessons.desc,
      route: '/playground'
    },
    {
      id: 'build' as ModuleId,
      title: t.modules.build.title,
      icon: Piano,
      color: getModuleColor('build'),
      description: t.modules.build.desc,
      route: null
    },
    {
      id: 'ai-tab' as ModuleId,
      title: t.modules['ai-tab'].title,
      icon: Brain,
      color: getModuleColor('ai-tab'),
      description: t.modules['ai-tab'].desc,
      route: null
    }
  ]

  if (!authChecked) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // ✅ MODULE TILE COMPONENT - RESPONSIVE
  const ModuleTile = ({ module, onClick }: { module: typeof modules[0]; onClick: () => void }) => {
    const animationClass = reducedMotion
      ? 'transform transition-colors duration-200'
      : 'transform transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95'

    if (module.route) {
      return (
        <a
          href={module.route}
          className={`
            relative overflow-hidden rounded-lg md:rounded-2xl cursor-pointer ${animationClass}
            focus:outline-none focus:ring-4 focus:ring-white/50
            bg-gradient-to-br ${module.color}
            p-3 sm:p-4 md:p-6
            min-h-[100px] sm:min-h-[120px] md:min-h-[140px]
            flex flex-col justify-between
            border border-white/10
            ${!reducedMotion ? 'hover:shadow-xl hover:-translate-y-1' : ''}
            block no-underline
          `}
          aria-label={`Open ${module.title}`}
        >
          {/* Mobile Layout: Icon + Title only */}
          <div className="flex flex-col items-center justify-center h-full md:block md:h-auto">
            {module.customIcon ? (
              <img
                src={module.customIcon}
                alt=""
                className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-0 drop-shadow-lg brightness-0 invert"
              />
            ) : module.emoji ? (
              <span className="text-4xl mb-2 md:mb-0 drop-shadow-lg">{module.emoji}</span>
            ) : (
              <module.icon className="w-8 h-8 md:w-10 md:h-10 text-white/90 drop-shadow-lg mb-2 md:mb-0" />
            )}

            {/* Desktop: Icon in corner */}
            <div className="hidden md:block w-2 h-2 bg-white/30 rounded-full shadow-inner absolute top-6 right-6"></div>

            <div className="text-center md:text-left md:mt-4">
              <h3 className="text-sm sm:text-base md:text-xl font-bold font-sans drop-shadow-md">
                {module.title}
              </h3>
              {/* Hide description on mobile */}
              <p className="hidden md:block text-sm font-sans leading-relaxed drop-shadow-sm mt-2">
                {module.description}
              </p>
            </div>
          </div>

          <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
        </a>
      )
    }

    return (
      <div
        className={`
          relative overflow-hidden rounded-lg md:rounded-2xl cursor-pointer ${animationClass}
          focus:outline-none focus:ring-4 focus:ring-white/50
          bg-gradient-to-br ${module.color}
          p-3 sm:p-4 md:p-6
          min-h-[100px] sm:min-h-[120px] md:min-h-[140px]
          flex flex-col justify-between
          border border-white/10
          ${!reducedMotion ? 'hover:shadow-xl hover:-translate-y-1' : ''}
        `}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Open ${module.title}`}
      >
        {/* Mobile Layout: Icon + Title only */}
        <div className="flex flex-col items-center justify-center h-full md:block md:h-auto">
          {module.customIcon ? (
            <img
              src={module.customIcon}
              alt=""
              className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-0 drop-shadow-lg brightness-0 invert"
            />
          ) : module.emoji ? (
            <span className="text-4xl mb-2 md:mb-0 drop-shadow-lg">{module.emoji}</span>
          ) : (
            <module.icon className="w-8 h-8 md:w-10 md:h-10 text-white/90 drop-shadow-lg mb-2 md:mb-0" />
          )}

          {/* Desktop: Icon in corner */}
          <div className="hidden md:block w-2 h-2 bg-white/30 rounded-full shadow-inner absolute top-6 right-6"></div>

          <div className="text-center md:text-left md:mt-4">
            <h3 className="text-sm sm:text-base md:text-xl font-bold font-sans drop-shadow-md">
              {module.title}
            </h3>
            {/* Hide description on mobile */}
            <p className="hidden md:block text-sm font-sans leading-relaxed drop-shadow-sm mt-2">
              {module.description}
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
      </div>
    )
  }

  const renderMainContent = (): React.JSX.Element => {
    if (currentModule) {
      const moduleData = modules.find(m => m.id === currentModule)
      if (!moduleData) {
        return (
          <div className="flex-1 p-6 pb-24">
            <div className="text-center text-white">Module not found</div>
          </div>
        )
      }

      return (
        <div className="flex-1 p-6 pb-24 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setCurrentModule(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors mr-4"
              >
                <Home className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {moduleData.title}
                </h1>
                <p className="text-white/70">{moduleData.description}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="text-center py-12">
                <moduleData.icon className="w-16 h-16 text-white/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  {moduleData.title} Module
                </h3>
                <p className="text-white/70 mb-6">
                  This module is under development. Coming soon with full functionality!
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // ✅ MAIN HOME SCREEN - NO SCROLL DESIGN
    return (
      <div className="fixed inset-0 flex flex-col">
        {/* Header Section - FIXED HEIGHT */}
        <div
          className="flex-shrink-0 px-4 pb-2 md:pb-4 relative z-1"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}
        >
          <div className="text-center max-w-4xl mx-auto">
            <h1 className={`flex items-center justify-center mb-3 md:mb-4 text-4xl sm:text-5xl md:text-6xl font-bold tracking-wide bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent`}>
              <span className="mr-3 md:mr-4">🎸</span>
              {t.title}
            </h1>
            {/* Mobile: Two lines, Desktop: One line */}
            <div className="md:hidden">
              <p className="text-white/80 text-lg font-sans leading-relaxed">
                Your Complete AI-Powered Music
              </p>
              <p className="text-white/80 text-lg font-sans leading-relaxed mb-4">
                Practice Suite
              </p>
            </div>
            <p className="hidden md:block text-white/80 text-xl lg:text-2xl font-sans leading-relaxed">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Main Content Area - NO CLIPPING */}
        <div className="flex-1 px-4 pb-28 md:pb-8">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Module Grid - 2x3 Mobile, 3x2 Desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 md:mb-4 relative z-50">
              {modules.map((module) => (
                <ModuleTile
                  key={module.id}
                  module={module}
                  onClick={() => setCurrentModule(module.id as ModuleId)}
                />
              ))}
            </div>

            {/* ✅ Practice Progress Section - PLACEHOLDER - COMPACT MOBILE */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/20 mt-6 md:mt-6 mb-24 md:mb-0">
              <div className="flex items-center mb-2 md:mb-4">
                <div className="text-lg md:text-2xl mr-2">📊</div>
                <h3 className="text-sm md:text-xl font-bold text-white">Your Progress</h3>
              </div>

              {/* Practice Stats */}
              <div className="space-y-2 md:space-y-3">
                <div>
                  <div className="flex justify-between text-xs md:text-sm text-white/80 mb-1">
                    <span className="truncate mr-2">Practice Time Today</span>
                    <span className="whitespace-nowrap">42 / 60 min</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 md:h-3">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs md:text-sm text-white/80 mb-1">
                    <span className="truncate mr-2">Weekly Goal</span>
                    <span className="whitespace-nowrap">3 / 7 days</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 md:h-3">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full" style={{ width: '43%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={getThemeClasses()}>
      <div className="fixed inset-0 bg-gradient-to-br from-black/30 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-tl from-black/30 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 h-screen overflow-hidden">
        {renderMainContent()}

        {/* ✅ TOOL RENDERING */}
        {activeTool === 'metronome' && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setActiveTool('none')}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <Metronome onClose={() => setActiveTool('none')} />
            </div>
          </div>
        )}

        {activeTool === 'tuner' && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setActiveTool('none')}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <TunerDial onClose={() => setActiveTool('none')} />
            </div>
          </div>
        )}

        {activeTool === 'print' && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setActiveTool('none')}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <PrintComponent onClose={() => setActiveTool('none')} />
            </div>
          </div>
        )}

        {/* Bottom Navigation - FIXED */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-30 safe-area-pb">
          <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
            {[
              { id: 'songs', icon: Music, label: t.nav.songs },
              { id: 'setlist', icon: Users, label: t.nav.setlist },
              { id: 'home', icon: Home, label: t.nav.home },
              { id: 'tools', icon: Settings, label: t.nav.tools },
              { id: 'profile', icon: User, label: t.nav.profile }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'tools') {
                    setToolDrawerOpen(!toolDrawerOpen)
                  } else if (item.id === 'home') {
                    setActiveTab('home')
                    setCurrentModule(null)
                    setActiveTool('none')
                  } else if (item.id === 'profile') {
                    router.push('/profile')
                  } else {
                    setActiveTab(item.id as TabId)
                  }
                }}
                className={`
                  flex flex-col items-center p-3 rounded-xl transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
                  ${activeTab === item.id
                    ? 'text-blue-400 bg-blue-400/20'
                    : 'text-white hover:text-white/80'
                  }
                `}
              >
                <item.icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium font-sans tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tool Drawer */}
        <div className={`
          fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300
          ${toolDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
        `}>
          <div className="bg-white/10 backdrop-blur-lg rounded-t-3xl p-6 border-t border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Practice Tools</h3>
              <button
                onClick={() => setToolDrawerOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronDown className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => {
                  setActiveTool('metronome')
                  setToolDrawerOpen(false)
                }}
                className="flex flex-col items-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Timer className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Metronome</span>
              </button>

              <button
                onClick={() => {
                  setActiveTool('tuner')
                  setToolDrawerOpen(false)
                }}
                className="flex flex-col items-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Headphones className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Tuner</span>
              </button>

              <button
                onClick={() => {
                  setActiveTool('print')
                  setToolDrawerOpen(false)
                }}
                className="flex flex-col items-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Printer className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Print</span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(true)
                  setToolDrawerOpen(false)
                }}
                className="flex flex-col items-center p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Settings className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <div className={`
          fixed inset-0 z-50 flex items-center justify-center p-4
          ${settingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          transition-opacity duration-300
        `}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setSettingsOpen(false)} />

          <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md border border-white/20 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <h4 className="text-white font-medium mb-3">Theme</h4>
                <div className="space-y-2">
                  {[
                    { id: 'light', label: 'Purple/Orange V29', icon: Sun },
                    { id: 'dark', label: 'Dark Mode', icon: Moon },
                    { id: 'crayon', label: 'Crayon Colors', icon: Palette },
                    { id: 'guitar-center', label: 'Guitar Center Red', icon: Guitar },
                    { id: 'pro-studio', label: 'Pro Studio Blue', icon: Headphones }
                  ].map((themeOption) => (
                    <button
                      key={themeOption.id}
                      onClick={() => changeTheme(themeOption.id)}
                      className={`
                        w-full flex items-center p-3 rounded-xl transition-colors
                        ${theme === themeOption.id
                          ? 'bg-blue-500/30 text-white ring-2 ring-blue-400'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }
                      `}
                    >
                      <themeOption.icon className="w-5 h-5 mr-3" />
                      {themeOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Color Mode */}
              <div>
                <h4 className="text-white font-medium mb-3">Multi-Color Buttons</h4>
                <button
                  onClick={toggleButtonColorMode}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-xl transition-colors
                    ${buttonColorMode
                      ? 'bg-green-500/30 text-white'
                      : 'bg-orange-500/30 text-white'
                    }
                  `}
                >
                  <span>{buttonColorMode ? 'Multi-Color: ON' : 'Multi-Color: OFF'}</span>
                  <div className={`w-12 h-6 rounded-full transition-colors ${buttonColorMode ? 'bg-green-500' : 'bg-orange-500'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${buttonColorMode ? 'translate-x-6 ml-1' : 'ml-0.5'}`} />
                  </div>
                </button>
              </div>

              {/* Accessibility */}
              <div>
                <h4 className="text-white font-medium mb-3">Accessibility</h4>
                <div className="space-y-2">
                  <button
                    onClick={toggleReducedMotion}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-xl transition-colors
                      ${reducedMotion
                        ? 'bg-green-500/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }
                    `}
                  >
                    <span>Reduce Motion</span>
                    <div className={`w-12 h-6 rounded-full transition-colors ${reducedMotion ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${reducedMotion ? 'translate-x-6 ml-1' : 'ml-0.5'}`} />
                    </div>
                  </button>

                  <button
                    onClick={toggleHighContrast}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-xl transition-colors
                      ${highContrast
                        ? 'bg-green-500/30 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }
                    `}
                  >
                    <span>High Contrast</span>
                    <div className={`w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${highContrast ? 'translate-x-6 ml-1' : 'ml-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Guitar Orientation */}
              <div>
                <h4 className="text-white font-medium mb-3">Guitar Orientation</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'right', label: 'Right-Handed' },
                    { id: 'left', label: 'Left-Handed' }
                  ].map((hand) => (
                    <button
                      key={hand.id}
                      onClick={() => {
                        setHandedness(hand.id)
                        sessionStorage.setItem('maestro-handedness', hand.id)
                      }}
                      className={`
                        p-3 rounded-xl transition-colors text-center
                        ${handedness === hand.id
                          ? 'bg-blue-500/30 text-white ring-2 ring-blue-400'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }
                      `}
                    >
                      {hand.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <h4 className="text-white font-medium mb-3">Language</h4>
                <div className="space-y-2">
                  {[
                    { id: 'en', label: 'English', flag: '🇺🇸' },
                    { id: 'es', label: 'Español', flag: '🇪🇸' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id)
                        sessionStorage.setItem('maestro-language', lang.id)
                      }}
                      className={`
                        w-full flex items-center p-3 rounded-xl transition-colors
                        ${language === lang.id
                          ? 'bg-blue-500/30 text-white ring-2 ring-blue-400'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }
                      `}
                    >
                      <span className="mr-3 text-xl">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out */}
              <div>
                <button
                  onClick={() => {
                    supabase.auth.signOut().then(() => router.replace('/auth/sign-in'))
                  }}
                  className="w-full flex items-center justify-center p-3 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}