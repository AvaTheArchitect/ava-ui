// 🧪 Create this as /src/app/test-audio/page.tsx
'use client';

import React, { useState } from 'react';

export default function SimpleAudioTest() {
    const [status, setStatus] = useState('Ready');
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    // Test 1: Simple HTML5 Audio (no Tone.js)
    const testSimpleAudio = () => {
        try {
            setStatus('Testing simple HTML5 audio...');

            const audio = new Audio('/audio/guitar-practice.mp3');
            setAudioElement(audio);

            audio.addEventListener('loadstart', () => setStatus('Audio loading...'));
            audio.addEventListener('canplay', () => setStatus('✅ Audio ready to play!'));
            audio.addEventListener('playing', () => setStatus('🎵 Playing!'));
            audio.addEventListener('error', (e) => {
                console.error('Audio error:', e);
                setStatus(`❌ Audio error: ${e.type}`);
            });

            audio.play()
                .then(() => setStatus('🎵 HTML5 audio playing!'))
                .catch(err => {
                    console.error('Play failed:', err);
                    setStatus(`❌ Play failed: ${err.message}`);
                });

        } catch (err) {
            setStatus(`❌ Error: ${err}`);
        }
    };

    // Test 2: Tone.js Initialization
    const testToneJS = async () => {
        try {
            setStatus('Testing Tone.js...');

            // ✅ Fixed import - Tone.js uses named export, not default
            const Tone = await import('tone');

            setStatus('Tone.js imported, starting context...');

            await Tone.start();
            setStatus(`✅ Tone.js context: ${Tone.context.state}`);

            // Test simple oscillator
            const osc = new Tone.Oscillator(440, 'sine').toDestination();
            osc.start();
            setTimeout(() => osc.stop(), 1000);

            setStatus('🎵 Tone.js test tone played!');

        } catch (err) {
            console.error('Tone.js error:', err);
            setStatus(`❌ Tone.js error: ${err}`);
        }
    };

    // Test 3: Check File Access
    const testFileAccess = async () => {
        try {
            setStatus('Testing file access...');

            const response = await fetch('/audio/guitar-practice.mp3', { method: 'HEAD' });

            if (response.ok) {
                setStatus(`✅ File accessible: ${response.status}`);
            } else {
                setStatus(`❌ File not found: ${response.status}`);
            }

        } catch (err) {
            setStatus(`❌ File access error: ${err}`);
        }
    };

    const stopAudio = () => {
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
            setStatus('⏹️ Stopped');
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-orange-500 mb-6">
                🧪 Simple Audio Test
            </h1>

            {/* Status Display */}
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <h2 className="font-semibold mb-2">🔍 Test Status</h2>
                <div className="p-3 bg-white rounded border font-mono text-sm">
                    {status}
                </div>
            </div>

            {/* Test Buttons */}
            <div className="space-y-4">
                <h2 className="font-semibold">🧪 Run Tests</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={testFileAccess}
                        className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
                    >
                        1️⃣ Test File Access
                    </button>

                    <button
                        onClick={testSimpleAudio}
                        className="px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                    >
                        2️⃣ Test HTML5 Audio
                    </button>

                    <button
                        onClick={testToneJS}
                        className="px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold"
                    >
                        3️⃣ Test Tone.js
                    </button>

                    <button
                        onClick={stopAudio}
                        className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
                    >
                        ⏹️ Stop Audio
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <h3 className="font-semibold text-blue-800 mb-2">📝 Test Order:</h3>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li><strong>Test File Access</strong> - Check if guitar-practice.mp3 exists</li>
                    <li><strong>Test HTML5 Audio</strong> - Try basic audio without Tone.js</li>
                    <li><strong>Test Tone.js</strong> - Check if Tone.js can initialize</li>
                </ol>

                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <strong>💡 Expected Results:</strong><br />
                    ✅ All tests pass → Your usePlaybackControls should work<br />
                    ❌ File access fails → Check MP3 file location<br />
                    ❌ HTML5 fails → Browser audio permission issue<br />
                    ❌ Tone.js fails → Library or context issue
                </div>
            </div>
        </div>
    );
}