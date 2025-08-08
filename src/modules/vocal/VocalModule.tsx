// src/modules/vocal/VocalModule.tsx
// 🎤 Enhanced Vocal AI Practice Module - TypeScript + Future AI Ready

import React, { useState, useCallback, useRef } from 'react';

// 🔧 TypeScript Interfaces
export interface VocalAnalysisResult {
  pitch: {
    accuracy: number;
    note: string;
    cents: number;
  };
  tempo: {
    sync: number;
    bpm: number;
    deviation: number;
  };
  overall: {
    score: number;
    feedback: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  };
}

export interface VocalModuleProps {
  onAnalysisComplete?: (result: VocalAnalysisResult) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  className?: string;
  disabled?: boolean;
}

// 🎵 Feedback message templates
const FEEDBACK_MESSAGES = {
  excellent: [
    "⚡ Thunder Tracked! You cracked glass and nailed tempo like Sebastian Bach!",
    "🔥 Absolute fire! Your pitch control is legendary!",
    "🎯 Bullseye! That's professional-level vocal precision!"
  ],
  good: [
    "🎯 Great pitch! Stay locked on rhythm.",
    "💪 Strong performance! Fine-tune that tempo sync.",
    "🎤 Nice work! Your pitch accuracy is on point."
  ],
  needsWork: [
    "🎤 Let's tune it up — try again with breath support and posture tips.",
    "📈 Good foundation! Focus on pitch stability and timing.",
    "🎵 Keep practicing! Try breathing exercises for better control."
  ]
};

const VocalModule: React.FC<VocalModuleProps> = ({
  onAnalysisComplete,
  onRecordingStart,
  onRecordingStop,
  className = '',
  disabled = false
}) => {
  // 🔧 FIXED: Proper state typing
  const [analysis, setAnalysis] = useState<VocalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');

  // Future AI integration refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // 🎯 Generate random feedback message
  const getFeedbackMessage = useCallback((score: number): string => {
    let messages: string[];

    if (score >= 90) {
      messages = FEEDBACK_MESSAGES.excellent;
    } else if (score >= 70) {
      messages = FEEDBACK_MESSAGES.good;
    } else {
      messages = FEEDBACK_MESSAGES.needsWork;
    }

    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  // 🎤 Analyze vocal performance (placeholder with realistic data)
  const handleAnalyze = useCallback(async () => {
    if (disabled || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      setError('');

      // 🔊 Future: Replace with actual AI model call
      // const analysisResult = await brainInterface.analyzeVocal(audioData);

      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate realistic placeholder data
      const pitchAccuracy = 60 + Math.random() * 40; // 60-100%
      const tempoSync = 50 + Math.random() * 50; // 50-100%
      const overallScore = (pitchAccuracy + tempoSync) / 2;

      const analysisResult: VocalAnalysisResult = {
        pitch: {
          accuracy: Math.round(pitchAccuracy * 10) / 10,
          note: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)] + '4',
          cents: Math.round((Math.random() - 0.5) * 50) // -25 to +25 cents
        },
        tempo: {
          sync: Math.round(tempoSync * 10) / 10,
          bpm: 120 + Math.round((Math.random() - 0.5) * 40), // 100-140 BPM
          deviation: Math.round((Math.random() - 0.5) * 10 * 10) / 10 // -5 to +5 BPM
        },
        overall: {
          score: Math.round(overallScore * 10) / 10,
          feedback: getFeedbackMessage(overallScore),
          level: overallScore >= 90 ? 'pro' : overallScore >= 75 ? 'advanced' : overallScore >= 60 ? 'intermediate' : 'beginner'
        }
      };

      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('Vocal analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [disabled, isAnalyzing, getFeedbackMessage, onAnalysisComplete]);

  // 🎙️ Start recording (future AI integration)
  const handleStartRecording = useCallback(async () => {
    try {
      setError('');

      // Future: Initialize audio recording
      // const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // mediaRecorderRef.current = new MediaRecorder(stream);

      setIsRecording(true);
      onRecordingStart?.();

      console.log('🎙️ Recording started (placeholder)');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recording failed';
      setError(errorMessage);
      console.error('Recording error:', err);
    }
  }, [onRecordingStart]);

  // 🛑 Stop recording
  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    onRecordingStop?.();

    // Future: Stop actual recording
    // mediaRecorderRef.current?.stop();

    console.log('🛑 Recording stopped (placeholder)');
  }, [onRecordingStop]);

  // 🎨 Get score color class
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  // 🏅 Get level badge
  const getLevelBadge = (level: string): string => {
    const badges = {
      beginner: '🌱',
      intermediate: '🎯',
      advanced: '🏆',
      pro: '⚡'
    };
    return badges[level as keyof typeof badges] || '🎤';
  };

  return (
    <div className={`p-6 bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl shadow-xl space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-orange-400 flex items-center gap-2">
          🎤 Vocal AI Practice Module
          {isRecording && <span className="animate-pulse text-red-400">🔴 REC</span>}
        </h2>

        {analysis && (
          <div className="flex items-center gap-2 text-sm">
            <span>{getLevelBadge(analysis.overall.level)}</span>
            <span className="text-gray-400">{analysis.overall.level.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-200">
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={disabled || isAnalyzing}
          className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? '🛑 Stop Recording' : '🎙️ Start Recording'}
        </button>

        <button
          onClick={handleAnalyze}
          disabled={disabled || isAnalyzing || isRecording}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-full text-white font-semibold transition-all duration-200 flex items-center gap-2"
          aria-label="Analyze vocal performance"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            '🎯 Analyze Vocal Take'
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4 bg-gray-800/50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-orange-300">📊 Analysis Results</h3>

          {/* Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pitch Analysis */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-300 mb-2">🎵 Pitch Analysis</h4>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className={`font-bold ${getScoreColor(analysis.pitch.accuracy)}`}>
                    {analysis.pitch.accuracy}%
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Note:</span>
                  <span className="font-mono text-yellow-300">{analysis.pitch.note}</span>
                </p>
                <p className="flex justify-between">
                  <span>Deviation:</span>
                  <span className="font-mono text-gray-300">{analysis.pitch.cents} cents</span>
                </p>
              </div>
            </div>

            {/* Tempo Analysis */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-green-300 mb-2">⏱️ Tempo Analysis</h4>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span>Sync:</span>
                  <span className={`font-bold ${getScoreColor(analysis.tempo.sync)}`}>
                    {analysis.tempo.sync}%
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>BPM:</span>
                  <span className="font-mono text-yellow-300">{analysis.tempo.bpm}</span>
                </p>
                <p className="flex justify-between">
                  <span>Deviation:</span>
                  <span className="font-mono text-gray-300">{analysis.tempo.deviation} BPM</span>
                </p>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-4">
            <h4 className="font-semibold text-purple-300 mb-2">🏆 Overall Performance</h4>
            <div className="flex items-center justify-between mb-3">
              <span>Score:</span>
              <span className={`text-2xl font-bold ${getScoreColor(analysis.overall.score)}`}>
                {analysis.overall.score}%
              </span>
            </div>
            <p className="italic text-green-400 leading-relaxed">
              {analysis.overall.feedback}
            </p>
          </div>

          {/* Future AI Integration Placeholder */}
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-blue-200 text-sm">
            🤖 <strong>Coming Soon:</strong> Real-time AI analysis, personalized coaching tips, and vocal training exercises powered by Cipher Brain AI.
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-gray-800/30 rounded-lg p-4">
        <h4 className="font-semibold text-gray-300 mb-2">💡 Quick Tips</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Maintain proper posture and breath support</li>
          <li>• Practice with a metronome for better timing</li>
          <li>• Warm up your voice before intensive practice</li>
          <li>• Record yourself regularly to track progress</li>
        </ul>
      </div>
    </div>
  );
};

export default VocalModule;