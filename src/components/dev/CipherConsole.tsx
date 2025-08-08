import React, { useState, useEffect } from 'react';
import TunerPanel from '@/components/tuner/TunerPanel';
import { initTunerVoice } from '@/utils/initTunerVoice';
import { useSimonPrime } from '@/hooks/simonprime/useSimonPrime';
import SimonPrime from '@/components/simonprime/SimonPrime';

// Type declarations for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface AppLog {
  timestamp: string;
  type: 'simon' | 'voice' | 'tuner' | 'app' | 'debug';
  message: string;
  data?: any;
}

export default function CipherConsole() {
  // Simon Prime Integration
  const {
    askSimon,
    isThinking,
    lastResponse,
    queryHistory,
    clearHistory,
    isHumorMode
  } = useSimonPrime('intermediate');

  // UI State
  const [tunerVisible, setTunerVisible] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const [simonVisible, setSimonVisible] = useState(true);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [appMetrics, setAppMetrics] = useState({
    voiceCommands: 0,
    simonQueries: 0,
    tunerSessions: 0,
    uptime: Date.now()
  });

  // Add log entry
  const addLog = (type: AppLog['type'], message: string, data?: any) => {
    const newLog: AppLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [...prev.slice(-24), newLog]); // Keep last 25 logs
  };

  // SimonPrime interaction using the official hook
  const askSimonPrime = async (query: string) => {
    try {
      addLog('simon', `Query: ${query}`);
      setAppMetrics(prev => ({ ...prev, simonQueries: prev.simonQueries + 1 }));

      const response = await askSimon(query);

      // ✅ Fix: Handle null response properly
      if (response) {
        addLog('simon', `${isHumorMode ? '🔥' : '🎓'} ${response.answer.substring(0, 50)}...`);
        return response;
      } else {
        addLog('debug', 'Simon returned no response');
        return {
          answer: 'Simon encountered an error. Check the debug logs.',
          confidence: 0,
          elements: [],
          humorMode: isHumorMode
        };
      }
    } catch (error) {
      addLog('debug', `Simon error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        answer: 'Simon encountered an error. Check the debug logs.',
        confidence: 0,
        elements: [],
        humorMode: isHumorMode
      };
    }
  };

  // Voice command with Simon integration
  const startVoice = async () => {
    try {
      addLog('voice', 'Starting voice command...');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        addLog('voice', 'Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognition();

      // Enhanced voice recognition for Simon
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;

        if (event.results[last].isFinal) {
          addLog('voice', `Recognized: "${text}"`);

          // Check if it's a Simon query
          if (text.toLowerCase().includes('simon') || text.toLowerCase().includes('help')) {
            await askSimonPrime(text);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        addLog('voice', `Voice error: ${event.error}`);
      };

      // Initialize voice tuner
      initTunerVoice(recognition, setTunerVisible);

      recognition.start();
      setAppMetrics(prev => ({ ...prev, voiceCommands: prev.voiceCommands + 1 }));
      addLog('voice', 'Voice recognition active - say "Simon" for music help');

    } catch (error) {
      addLog('voice', `Voice start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Quick Simon questions for music development (Official Examples)
  const quickSimonQuestions = [
    "How's my guitar technique?",
    "Give me feedback on this chord progression",
    "Help me improve my vibrato",
    "What should I focus on in practice?",
    "Rate my playing performance"
  ];

  // App health monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Monitor app performance
      const performance = (window as any).performance;
      if (performance && performance.memory) {
        addLog('app', `Memory: ${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB`);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getUptimeString = () => {
    const minutes = Math.floor((Date.now() - appMetrics.uptime) / 60000);
    return `${minutes}m`;
  };

  return (
    <div className="cipher-console p-4 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🎵 CipherConsole - Music App Dev Tool</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-blue-600">
            Simon: {isHumorMode ? 'Humor Mode 🔥' : 'Professional 🎓'}
          </span>
          <span className="px-2 py-1 rounded bg-green-600">
            Uptime: {getUptimeString()}
          </span>
          <span className="px-2 py-1 rounded bg-purple-600">
            Queries: {appMetrics.simonQueries}
          </span>
          {isThinking && (
            <span className="px-2 py-1 rounded bg-orange-600 animate-pulse">
              Simon thinking...
            </span>
          )}
        </div>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button
          onClick={() => setTunerVisible(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
        >
          🎵 Activate Tuner
        </button>

        <button
          onClick={startVoice}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          🗣 Voice + Simon
        </button>

        <button
          onClick={() => setConsoleVisible(!consoleVisible)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          📊 {consoleVisible ? 'Hide' : 'Show'} Debug
        </button>

        <button
          onClick={() => setSimonVisible(!simonVisible)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
        >
          🧠 {simonVisible ? 'Hide' : 'Show'} Simon
        </button>

        <button
          onClick={() => askSimonPrime("Quick analysis request")}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
          disabled={isThinking}
        >
          🎸 Ask Simon
        </button>
      </div>

      {/* Simon Prime Interface */}
      {simonVisible && (
        <div className="mb-6">
          <SimonPrime
            userLevel="intermediate"
            showFeedback={true}
            onModeChange={(humorMode: boolean) => {
              addLog('simon', `Humor mode ${humorMode ? 'enabled' : 'disabled'}`);
            }}
          />
        </div>
      )}

      {/* Quick Simon Interactions */}
      <div className="bg-gray-800 rounded p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">🎸 Quick Simon Interactions</h3>

        {/* Quick Questions */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Ask Simon:</h4>
          <div className="flex flex-wrap gap-2">
            {quickSimonQuestions.map((question: string, index: number) => (
              <button
                key={index}
                onClick={() => askSimonPrime(question)}
                disabled={isThinking}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Last Response Display */}
        {lastResponse && (
          <div className="bg-black rounded p-3">
            <h4 className="text-sm font-medium mb-2">Latest Simon Response:</h4>
            <div className="text-sm">
              <div className="text-green-400 mb-1">{lastResponse.answer}</div>
              <div className="text-gray-500 text-xs flex justify-between">
                <span>Confidence: {Math.round(lastResponse.confidence * 100)}%</span>
                <span>Mode: {lastResponse.humorMode ? 'Humor 🔥' : 'Professional 🎓'}</span>
                {lastResponse.vibratoScore && (
                  <span>Vibrato: {lastResponse.vibratoScore}/100</span>
                )}
              </div>
              {lastResponse.elements.length > 0 && (
                <div className="text-xs text-blue-400 mt-1">
                  Elements: {lastResponse.elements.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Recent Queries:</h4>
              <button
                onClick={clearHistory}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-1">
              {/* ✅ Fix: Properly map QueryHistoryItem objects */}
              {queryHistory.slice(-3).map((historyItem, index) => (
                <div key={index} className="text-xs text-gray-400 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-mono">Q:</span>
                    <span>{historyItem.query}</span>
                  </div>
                  <div className="flex items-start gap-2 ml-4">
                    <span className="text-green-400 font-mono">A:</span>
                    <span>{historyItem.response.answer.substring(0, 60)}...</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    {new Date(historyItem.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debug Console */}
      {consoleVisible && (
        <div className="bg-black rounded p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">🔧 App Debug Console</h3>
            <button
              onClick={() => setLogs([])}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              Clear
            </button>
          </div>

          <div className="h-48 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No debug logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-400">[{log.timestamp}]</span>
                  <span className={`ml-2 ${log.type === 'simon' ? 'text-blue-400' :
                    log.type === 'voice' ? 'text-green-400' :
                      log.type === 'tuner' ? 'text-purple-400' :
                        log.type === 'app' ? 'text-yellow-400' :
                          'text-gray-300'
                    }`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="ml-2">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* App Metrics */}
      {consoleVisible && (
        <div className="bg-gray-800 rounded p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">📊 App Metrics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Voice Commands:</div>
              <div className="text-green-400">{appMetrics.voiceCommands}</div>
            </div>
            <div>
              <div className="text-gray-400">Simon Queries:</div>
              <div className="text-blue-400">{appMetrics.simonQueries}</div>
            </div>
            <div>
              <div className="text-gray-400">Tuner Sessions:</div>
              <div className="text-purple-400">{appMetrics.tunerSessions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tuner Panel */}
      <TunerPanel
        visible={tunerVisible}
        onClose={() => {
          setTunerVisible(false);
          setAppMetrics(prev => ({ ...prev, tunerSessions: prev.tunerSessions + 1 }));
          addLog('tuner', 'Tuner session completed');
        }}
      />
    </div>
  );
}