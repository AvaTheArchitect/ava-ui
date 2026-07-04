'use client';

/**
 * MobileToolsSlideout.tsx V6 - Panel Coordination + Landscape Block
 * Date: January 5th, 2026
 * 
 * 🔧 V6 FIXES:
 * ✅ Added onOtherPanelOpened callback for panel coordination
 * ✅ LANDSCAPE MODE: Completely disabled in landscape view
 * ✅ LANDSCAPE MODE: Auto-closes when switching to landscape
 * ✅ LANDSCAPE MODE: Prevented from appearing when switching back to portrait
 * ✅ Orange edge tab hidden in landscape mode
 * ✅ No interference with landscape mode rendering
 * 
 * 🔒 PRESERVED FROM V5:
 * ✅ Sound selector inline collapsible drawer
 * ✅ Swipe from right edge to open
 * ✅ Smart Metronome integration
 * ✅ Count-in mode selector
 * ✅ Auto-disable metronome in YouTube mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface MobileToolsSlideoutProps {
    // Count In props
    isCountInEnabled: boolean;
    onCountInToggle: () => void;

    // Metronome props
    isMetronomeEnabled?: boolean;
    onMetronomeToggle?: () => void;
    currentBPM?: number;
    audioSource?: 'synth' | 'original';

    // Metronome settings (inline controls)
    metronomeVolume?: number;
    onMetronomeVolumeChange?: (volume: number) => void;
    metronomeBalance?: number;
    onMetronomeBalanceChange?: (balance: number) => void;
    metronomeSubdivision?: number;
    onMetronomeSubdivisionChange?: (subdivision: number) => void;
    metronomeSoundType?: string;
    onMetronomeSoundTypeChange?: (sound: string) => void;
    metronomeAccentEnabled?: boolean;
    onMetronomeAccentToggle?: () => void;

    // Count-in mode
    countInMode?: 'three-beat' | 'four-beat';
    onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;

    // UI options
    showEdgeTab?: boolean;

    // Audio arming function from hook
    onArmMetronome?: () => Promise<void>;

    // 🆕 V6: Panel coordination
    onOtherPanelOpened?: () => void;

    // 🆕 V6: Landscape mode detection
    isMobileLandscape?: boolean;
}

export const MobileToolsSlideout: React.FC<MobileToolsSlideoutProps> = ({
    isCountInEnabled,
    onCountInToggle,
    isMetronomeEnabled = false,
    onMetronomeToggle,
    currentBPM = 120,
    audioSource = 'synth',
    metronomeVolume = 0.7,
    onMetronomeVolumeChange,
    metronomeBalance = 0,
    onMetronomeBalanceChange,
    metronomeSubdivision = 1,
    onMetronomeSubdivisionChange,
    metronomeSoundType = 'woodblock',
    onMetronomeSoundTypeChange,
    metronomeAccentEnabled = true,
    onMetronomeAccentToggle,
    countInMode = 'three-beat',
    onCountInModeChange,
    showEdgeTab = true,
    onArmMetronome,
    onOtherPanelOpened,
    isMobileLandscape = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showVisualAid, setShowVisualAid] = useState(true);
    const [isMetronomeDrawerOpen, setIsMetronomeDrawerOpen] = useState(false);
    const [isSoundSelectorOpen, setIsSoundSelectorOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchStartTime = useRef<number>(0);
    // [MAESTRO-UI-003] Tracks whether the in-flight touch series started on a
    // valid swipe surface (not excluded chrome, not outside the active breakpoint).
    // touchend consults this instead of re-deriving target/breakpoint state, so a
    // gesture that started off-limits can never produce an open on release.
    const touchStartAllowedRef = useRef<boolean>(false);

    // 🆕 V6: LANDSCAPE MODE - Auto-close when switching to landscape
    useEffect(() => {
        if (isMobileLandscape && isOpen) {
            console.log('🔄 V6: Closing slideout - switched to landscape mode');
            setIsOpen(false);
            setIsMetronomeDrawerOpen(false);
            setIsSoundSelectorOpen(false);
        }
    }, [isMobileLandscape, isOpen]);

    // Sound options
    const SOUND_OPTIONS = [
        { id: 'woodblock', name: 'Woodblock', freq: 800 },
        { id: 'click', name: 'Click', freq: 1200 },
        { id: 'beep', name: 'Beep', freq: 1000 },
        { id: 'drum-stick', name: 'Drum Stick', freq: 2000 },
        { id: 'kick-drum', name: 'Kick Drum', freq: 80 },
        { id: 'snare-drum', name: 'Snare Drum', freq: 200 },
        { id: 'electronic', name: 'Electronic', freq: 440 },
    ];

    // Metronome toggle with audio arming
    const handleMetronomeToggle = async () => {
        if (onArmMetronome) {
            await onArmMetronome();
        }
        if (onMetronomeToggle) {
            onMetronomeToggle();
        }
    };

    // Preview sound when selecting
    const playPreviewSound = useCallback((soundId: string) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const sound = SOUND_OPTIONS.find(s => s.id === soundId);
            if (!sound) return;

            oscillator.frequency.value = sound.freq;
            oscillator.type = (soundId === 'kick-drum' || soundId === 'snare-drum') ? 'triangle'
                : (soundId === 'electronic') ? 'sine' : 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

            console.log(`🔊 Preview sound: ${soundId}`);
        } catch (error) {
            console.warn('Preview sound failed:', error);
        }
    }, []);

    // Handle sound selection - now auto-collapses
    const handleSoundSelect = (soundId: string) => {
        onMetronomeSoundTypeChange?.(soundId);
        playPreviewSound(soundId);
        setIsSoundSelectorOpen(false);
    };

    // 🆕 V6: Toggle with panel coordination
    const handleToggle = () => {
        // Don't allow opening in landscape mode
        if (isMobileLandscape) {
            console.log('🚫 V6: Blocked slideout opening - in landscape mode');
            return;
        }

        const newState = !isOpen;
        setIsOpen(newState);

        // Notify other panels when opening
        if (newState && onOtherPanelOpened) {
            onOtherPanelOpened();
        }
    };

    // [MAESTRO-UI-003] Only visible/interactive at portrait mobile widths; matches
    // the breakpoint the rest of the app chrome uses to decide the drawer is on screen.
    const MOBILE_SWIPE_MEDIA_QUERY = '(max-width: 649px)';

    // [MAESTRO-UI-003] Chrome/interactive-region guard for OPEN gestures only. A left
    // swipe starting on app chrome (top tray, footer controls, other drawers) should
    // never arm this drawer — only a swipe that begins on plain content counts. Not
    // applied to CLOSE gestures: closing starts on this drawer's own panel, which is
    // itself one of the excluded selectors, so a uniform gate would break swipe-to-close.
    const isExcludedFromOpenSwipe = useCallback((target: EventTarget | null): boolean => {
        if (!(target instanceof Element)) return false;
        // [MAESTRO-UI-003.2] The closed-state orange reveal handle is itself a
        // <button> and lives inside the drawer's fixed-position wrapper, so it would
        // otherwise match the generic 'button' selector below. It must stay a valid
        // open-swipe start, so it's allowed before the broader exclusion check runs.
        if (target.closest('[data-swipe-reveal-handle]')) return false;
        return !!target.closest(
            [
                '[data-top-menu-tray]',
                '[data-mobile-tools-slideout]',
                '[data-mobile-tools-slideout-backdrop]',
                '[data-mobile-drawer]',
                '[data-mobile-drawer-backdrop]',
                '[data-maestro-control-panel]',
                '[data-transport-bar]',
                'button',
                'a',
                'input',
                'select',
                'textarea',
                '[role="button"]',
                '[aria-haspopup]',
                '[data-no-swipe-reveal]',
            ].join(', ')
        );
    }, []);

    // Handle touch start
    const handleTouchStart = (e: TouchEvent) => {
        // 🆕 V6: Block touch events in landscape mode
        if (isMobileLandscape) {
            touchStartAllowedRef.current = false;
            return;
        }

        // [MAESTRO-UI-003] Opening gestures must not start on excluded chrome.
        // Closing gestures legitimately start on this drawer's own panel, so the
        // exclusion only applies while the drawer is closed.
        if (!isOpen && isExcludedFromOpenSwipe(e.target)) {
            touchStartAllowedRef.current = false;
            return;
        }

        touchStartAllowedRef.current = true;
        touchStartX.current = e.touches[0].clientX;
        touchStartTime.current = Date.now();
    };

    // Handle touch move/end (swipe detection)
    const handleTouchEnd = (e: TouchEvent) => {
        // 🆕 V6: Block touch events in landscape mode
        if (isMobileLandscape) return;

        // [MAESTRO-UI-003] An excluded/ignored touchstart can never produce an open
        // (or a spurious close) on release.
        if (!touchStartAllowedRef.current) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchDuration = Date.now() - touchStartTime.current;
        const swipeDistance = touchStartX.current - touchEndX;
        const screenWidth = window.innerWidth;

        // Swipe from right edge to open (within 50px from edge)
        if (!isOpen && touchStartX.current > screenWidth - 50 && swipeDistance > 50 && touchDuration < 300) {
            handleToggle();
        }

        // Swipe right to close (when drawer is open)
        if (isOpen && swipeDistance < -50 && touchDuration < 300) {
            setIsOpen(false);
        }
    };

    // Add touch listeners
    useEffect(() => {
        // 🆕 V6: Don't add listeners in landscape mode
        if (isMobileLandscape) return;

        const mql = window.matchMedia(MOBILE_SWIPE_MEDIA_QUERY);
        let listenersAttached = false;

        const clearInFlightGesture = () => {
            // [MAESTRO-UI-003] Crossing above the breakpoint must invalidate any
            // gesture already in progress so it cannot complete after listeners
            // are removed (touchend would otherwise never fire to reset state).
            touchStartAllowedRef.current = false;
            touchStartX.current = 0;
            touchStartTime.current = 0;
        };

        const attachListeners = () => {
            if (listenersAttached) return;
            document.addEventListener('touchstart', handleTouchStart, { passive: true });
            document.addEventListener('touchend', handleTouchEnd, { passive: true });
            listenersAttached = true;
        };

        const detachListeners = () => {
            if (!listenersAttached) return;
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
            listenersAttached = false;
            clearInFlightGesture();
        };

        const syncToBreakpoint = () => {
            if (mql.matches) {
                attachListeners();
            } else {
                detachListeners();
            }
        };

        syncToBreakpoint();
        mql.addEventListener('change', syncToBreakpoint);

        return () => {
            mql.removeEventListener('change', syncToBreakpoint);
            detachListeners();
        };
    }, [isOpen, isMobileLandscape]);

    // Close drawer when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Check if metronome should be disabled
    const isMetronomeDisabled = audioSource === 'original';

    // 🆕 V6: COMPLETELY HIDE in landscape mode
    if (isMobileLandscape) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    data-mobile-tools-slideout-backdrop
                    className="fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer Container */}
            <div
                ref={drawerRef}
                className={`
                    fixed right-0 bottom-[90px] z-[9999]
                    w-[280px] h-[calc(100vh-180px)] max-h-[600px]
                    bg-gray-900/98 backdrop-blur-md
                    border-l border-t border-b border-purple-500/40 
                    rounded-l-2xl shadow-2xl
                    transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-[280px]'}
                `}
            >
                {/* Edge Tab - V6: Only show in portrait mode */}
                {showEdgeTab && showVisualAid && (
                    <button
                        onClick={handleToggle}
                        data-swipe-reveal-handle
                        className={`
                            absolute -left-3 bottom-4 
                            w-3 h-20
                            flex items-center justify-center
                            transition-opacity duration-300
                            ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        `}
                    >
                        <div className="w-1 h-full bg-gradient-to-b from-orange-500/80 via-orange-400 to-orange-500/80 rounded-full shadow-lg shadow-orange-500/50" />
                    </button>
                )}

                {/* Drawer Content */}
                <div data-mobile-tools-slideout className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <h3 className="text-white font-bold text-sm uppercase tracking-wide">Tools</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            aria-label="Close drawer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">

                        {/* Count In Toggle */}
                        <div className="bg-gray-800/60 border-2 border-gray-700/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className={isCountInEnabled ? 'text-green-400' : 'text-gray-400'}
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <text x="12" y="17" fontSize="12" fill="currentColor" textAnchor="middle" className="fill-gray-900 font-bold">3</text>
                                    </svg>
                                    <span className={`text-sm font-bold ${isCountInEnabled ? 'text-green-300' : 'text-white'}`}>
                                        Count In
                                    </span>
                                </div>
                                <button
                                    onClick={onCountInToggle}
                                    className={`
                                        relative w-12 h-6 rounded-full transition-colors
                                        ${isCountInEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                    `}
                                >
                                    <div className={`
                                        absolute top-0.5 w-5 h-5 rounded-full bg-white
                                        transition-transform duration-200
                                        ${isCountInEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                                    `} />
                                </button>
                            </div>

                            {/* Mode Selector */}
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onCountInModeChange?.('three-beat')}
                                    className={`
                                        flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors
                                        ${countInMode === 'three-beat'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700/50 text-gray-300'
                                        }
                                    `}
                                >
                                    3 Beats
                                </button>
                                <button
                                    onClick={() => onCountInModeChange?.('four-beat')}
                                    className={`
                                        flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors
                                        ${countInMode === 'four-beat'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700/50 text-gray-300'
                                        }
                                    `}
                                >
                                    4 Beats
                                </button>
                            </div>
                        </div>

                        {/* Smart Metronome - Collapsible */}
                        <div className={`bg-gray-800/60 border-2 border-gray-700/50 rounded-xl overflow-hidden ${isMetronomeDisabled ? 'opacity-50' : ''}`}>
                            {/* Header with Toggle */}
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className={isMetronomeEnabled && !isMetronomeDisabled ? 'text-green-400' : 'text-blue-400'}
                                        >
                                            <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                                            <path d="M10.5 12L12 8l1.5 4z" />
                                        </svg>
                                        <div>
                                            <span className={`text-sm font-bold block ${isMetronomeEnabled && !isMetronomeDisabled ? 'text-green-300' : 'text-white'}`}>
                                                Metronome
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {isMetronomeDisabled ? 'Synth mode only' : `${currentBPM} BPM`}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleMetronomeToggle}
                                        disabled={isMetronomeDisabled}
                                        className={`
                                            relative w-12 h-6 rounded-full transition-colors
                                            ${isMetronomeEnabled && !isMetronomeDisabled ? 'bg-green-500' : 'bg-gray-600'}
                                            ${isMetronomeDisabled ? 'cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-0.5 w-5 h-5 rounded-full bg-white
                                            transition-transform duration-200
                                            ${isMetronomeEnabled && !isMetronomeDisabled ? 'translate-x-6' : 'translate-x-0.5'}
                                        `} />
                                    </button>
                                </div>

                                {/* Expand/Collapse Button */}
                                {!isMetronomeDisabled && (
                                    <button
                                        onClick={() => setIsMetronomeDrawerOpen(prev => !prev)}
                                        className="w-full flex items-center justify-center gap-2 mt-2 py-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                                    >
                                        <span className="text-xs text-gray-300">Options</span>
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className={`text-gray-400 transition-transform ${isMetronomeDrawerOpen ? 'rotate-180' : ''}`}
                                        >
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </button>
                                )}

                                {isMetronomeDisabled && (
                                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="text-xs text-yellow-300">
                                            ⚠️ Switch to Synth mode
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Collapsible Options */}
                            {isMetronomeDrawerOpen && !isMetronomeDisabled && (
                                <div className="px-3 pb-3 space-y-3 border-t border-gray-700/30">

                                    {/* Sound Selection - Inline Collapsible */}
                                    <div className="pt-3">
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Sound</label>

                                        {/* Sound Button */}
                                        <button
                                            onClick={() => setIsSoundSelectorOpen(prev => !prev)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="text-white text-sm capitalize">{metronomeSoundType.replace('-', ' ')}</span>
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className={`text-gray-400 transition-transform ${isSoundSelectorOpen ? 'rotate-90' : ''}`}
                                            >
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </button>

                                        {/* Inline Sound Options */}
                                        {isSoundSelectorOpen && (
                                            <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto bg-gray-800/80 rounded-lg p-2">
                                                {SOUND_OPTIONS.map((sound) => (
                                                    <button
                                                        key={sound.id}
                                                        onClick={() => handleSoundSelect(sound.id)}
                                                        className={`
                                                            w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between text-sm
                                                            ${metronomeSoundType === sound.id
                                                                ? 'bg-orange-500 text-white font-bold'
                                                                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                                            }
                                                        `}
                                                    >
                                                        <span>{sound.name}</span>
                                                        {metronomeSoundType === sound.id && (
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Accent Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-300 block">Accent</label>
                                            <p className="text-xs text-gray-500">Emphasize beats</p>
                                        </div>
                                        <button
                                            onClick={onMetronomeAccentToggle}
                                            className={`
                                                relative w-10 h-5 rounded-full transition-colors
                                                ${metronomeAccentEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-0.5 w-4 h-4 rounded-full bg-white
                                                transition-transform duration-200
                                                ${metronomeAccentEnabled ? 'translate-x-5' : 'translate-x-0.5'}
                                            `} />
                                        </button>
                                    </div>

                                    {/* Volume */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-semibold text-gray-300">Volume</label>
                                            <span className="text-xs text-gray-400">{Math.round((metronomeVolume || 0.7) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={Math.round((metronomeVolume || 0.7) * 100)}
                                            onChange={(e) => onMetronomeVolumeChange?.(parseInt(e.target.value) / 100)}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>

                                    {/* Balance */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-semibold text-gray-300">Balance</label>
                                            <span className="text-xs text-gray-400">
                                                {(metronomeBalance || 0) === 0 ? 'C' : (metronomeBalance || 0) < 0 ? `L${Math.abs(Math.round((metronomeBalance || 0) * 100))}` : `R${Math.round((metronomeBalance || 0) * 100)}`}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-100"
                                            max="100"
                                            value={Math.round((metronomeBalance || 0) * 100)}
                                            onChange={(e) => onMetronomeBalanceChange?.(parseInt(e.target.value) / 100)}
                                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>

                                    {/* Subdivision */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Subdivision</label>
                                        <div className="flex gap-2">
                                            {[0.5, 1, 2].map((sub) => (
                                                <button
                                                    key={sub}
                                                    onClick={() => onMetronomeSubdivisionChange?.(sub)}
                                                    className={`
                                                        flex-1 py-2 rounded-lg text-xs font-bold transition-colors
                                                        ${metronomeSubdivision === sub
                                                            ? 'bg-cyan-500 text-white'
                                                            : 'bg-gray-700/50 text-gray-300'
                                                        }
                                                    `}
                                                >
                                                    {sub}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Visual Aid Toggle */}
                        {showEdgeTab && (
                            <div className="bg-gray-800/60 border-2 border-gray-700/50 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-bold text-white block">Visual Aid</span>
                                        <span className="text-xs text-gray-400">Orange edge tab</span>
                                    </div>
                                    <button
                                        onClick={() => setShowVisualAid(prev => !prev)}
                                        className={`
                                            relative w-12 h-6 rounded-full transition-colors
                                            ${showVisualAid ? 'bg-orange-500' : 'bg-gray-600'}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-0.5 w-5 h-5 rounded-full bg-white
                                            transition-transform duration-200
                                            ${showVisualAid ? 'translate-x-6' : 'translate-x-0.5'}
                                        `} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};