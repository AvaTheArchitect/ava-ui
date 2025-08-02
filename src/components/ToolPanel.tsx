// 🎸 REUSABLE TOOL PANEL COMPONENT
// Drop this into any page: Practice Generator, Singers Corner, Jam Track, etc.

"use client"

import React, { useState, useEffect } from "react"
import {
    Timer,
    Headphones,
    Printer,
    Settings,
    X,
    Play,
    Pause,
    Volume2
} from "lucide-react"

// ✅ Import your Cipher components
import TunerDial from '@/components/Cipher/TunerDial'
import KeySwitcherStore from '@/store/KeySwitcherStore'


// ✅ Tool Types
export type ToolType = 'none' | 'metronome' | 'tuner' | 'print' | 'key-change' | 'settings'

// ✅ Metronome Component (standalone)
const Metronome = ({ onClose }: { onClose?: () => void }) => {
    const [bpm, setBpm] = useState(120)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentBeat, setCurrentBeat] = useState(0)
    const bpmPresets = [60, 80, 100, 120, 140, 160, 180, 200]

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
                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                )}
            </div>

            <div className="text-center space-y-6">
                <div>
                    <div className="text-6xl font-bold text-white mb-2">{bpm}</div>
                    <div className="text-white/70">BPM</div>
                </div>

                <div className="flex items-center justify-center space-x-4">
                    <button onClick={() => setBpm(Math.max(40, bpm - 10))} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold">-10</button>
                    <button onClick={() => setBpm(Math.max(40, bpm - 1))} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold">-1</button>
                    <button onClick={() => setBpm(Math.min(200, bpm + 1))} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold">+1</button>
                    <button onClick={() => setBpm(Math.min(200, bpm + 10))} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold">+10</button>
                </div>

                <div className="flex justify-center space-x-2 mb-6">
                    {[0, 1, 2, 3].map((beat) => (
                        <div key={beat} className={`w-4 h-4 rounded-full transition-colors ${currentBeat === beat && isPlaying ? 'bg-orange-500' : 'bg-white/30'}`} />
                    ))}
                </div>

                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-lg ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    <span>{isPlaying ? 'Stop' : 'Start'}</span>
                </button>

                <div className="grid grid-cols-4 gap-2 mt-6">
                    {[60, 80, 100, 120, 140, 160, 180, 200].map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setBpm(preset)}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors ${bpm === preset ? 'bg-blue-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ✅ Print Component (standalone)
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
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
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
                                    onChange={(e) => setPrintOptions(prev => ({ ...prev, [option.key]: e.target.checked }))}
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
                        <option value="letter">Letter (8.5" x 11")</option>
                        <option value="a4">A4</option>
                        <option value="legal">Legal (8.5" x 14")</option>
                    </select>
                </div>

                <button className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-800 transition-colors">
                    <Printer className="w-6 h-6 inline mr-2" />
                    Print Practice Sheet
                </button>
            </div>
        </div>
    )
}

// ✅ MAIN REUSABLE TOOL PANEL COMPONENT
interface ToolPanelProps {
    className?: string
    showTools?: ToolType[]  // Optional: limit which tools to show
}

export default function ToolPanel({ className = "", showTools }: ToolPanelProps) {
    const [activeTool, setActiveTool] = useState<ToolType>('none')
    const [toolDrawerOpen, setToolDrawerOpen] = useState(false)

    // ✅ Escape key to close tools
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActiveTool('none')
                setToolDrawerOpen(false)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [])

    // ✅ Available tools configuration
    const allTools = [
        { id: 'metronome' as ToolType, icon: Timer, label: 'Metronome' },
        { id: 'tuner' as ToolType, icon: Headphones, label: 'Tuner' },
        { id: 'key-change' as ToolType, icon: Settings, label: 'Key Change' },
        { id: 'print' as ToolType, icon: Printer, label: 'Print' }
    ]

    // ✅ Filter tools if specified
    const tools = showTools ? allTools.filter(tool => showTools.includes(tool.id)) : allTools

    return (
        <div className={`relative ${className}`}>
            {/* ✅ Tool Toggle Button */}
            <button
                onClick={() => setToolDrawerOpen(!toolDrawerOpen)}
                className="fixed bottom-20 right-4 z-30 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200"
                aria-label="Open Practice Tools"
            >
                <Settings className="w-6 h-6" />
            </button>

            {/* ✅ Tool Drawer */}
            <div className={`
        fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-300
        ${toolDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
      `}>
                <div className="bg-white/10 backdrop-blur-lg rounded-t-3xl p-6 border-t border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Practice Tools</h3>
                        <button
                            onClick={() => setToolDrawerOpen(false)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                    setActiveTool(tool.id)
                                    setToolDrawerOpen(false)
                                }}
                                className="flex flex-col items-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <tool.icon className="w-6 h-6 text-white mb-1" />
                                <span className="text-white text-xs font-medium">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ✅ Tool Overlays */}
            {activeTool === 'metronome' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActiveTool('none')}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <Metronome onClose={() => setActiveTool('none')} />
                    </div>
                </div>
            )}

            {activeTool === 'tuner' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActiveTool('none')}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <TunerDial freq={440} cents={0} />
                    </div>
                </div>
            )}

            {activeTool === 'key-change' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActiveTool('none')}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">Key & Scale Changer</h3>
                                <button onClick={() => setActiveTool('none')} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>
                            <KeySwitcherStore />
                        </div>
                    </div>
                </div>
            )}

            {activeTool === 'print' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setActiveTool('none')}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <PrintComponent onClose={() => setActiveTool('none')} />
                    </div>
                </div>
            )}
        </div>
    )
}

// ✅ USAGE EXAMPLES:

// 🔹 Basic Usage (all tools):
// <ToolPanel />

// 🔹 Limited Tools (only metronome and tuner):
// <ToolPanel showTools={['metronome', 'tuner']} />

// 🔹 Custom Styling:
// <ToolPanel className="my-custom-class" showTools={['metronome', 'key-change']} />

// 🔹 In Practice Generator Page:
// import ToolPanel from '@/components/ToolPanel'
// 
// export default function PracticeGenerator() {
//   return (
//     <div className="min-h-screen">
//       {/* Your practice generator content */}
//       <ToolPanel showTools={['metronome', 'tuner', 'key-change']} />
//     </div>
//   )
// }

// 🔹 In Singers Corner Page:
// import ToolPanel from '@/components/ToolPanel'
// 
// export default function SingersCorner() {
//   return (
//     <div className="min-h-screen">
//       {/* Your singers corner content */}
//       <ToolPanel showTools={['metronome', 'key-change']} />
//     </div>
//   )
// }