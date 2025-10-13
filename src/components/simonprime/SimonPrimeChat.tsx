// 🎸 SIMON PRIME CHAT - Interactive Chat Interface with Avatar & Voice
// File: src/components/simonprime/SimonPrimeChat.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSimonPrime } from '@/hooks/simonprime/useSimonPrime';
import useSimonPrimeVoice from '@/hooks/simonprime/useSimonPrimeVoice';
import { SimonPrimePersonalityEngine } from '@/utils/simon/simonPrimePersonality';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'simon';
  timestamp: number;
  confidence?: number;
  animation?: string;
  emotion?: 'excited' | 'professional' | 'encouraging';
}

interface SimonPrimeChatProps {
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  context?: 'practice' | 'vocal' | 'songwriting' | 'theory';
  genre?: 'rock' | 'country' | 'blues' | 'metal' | 'christian' | 'bluesrock';
  compactMode?: boolean;
}

// 🤖 Simon Prime Avatar Component with Animation States
const SimonAvatar = ({
  state = 'normal',
  size = 'md',
  className = ''
}: {
  state?: 'normal' | 'thinking' | 'speaking' | 'celebrating' | 'roasting';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const animationClasses = {
    normal: 'hover:scale-105',
    thinking: 'animate-pulse scale-105',
    speaking: 'animate-bounce',
    celebrating: 'animate-bounce scale-110',
    roasting: 'animate-pulse scale-105'
  };

  const glowClasses = {
    normal: 'shadow-lg shadow-simon-purple-shadow/40',
    thinking: 'shadow-xl shadow-blue-400/60',
    speaking: 'shadow-xl shadow-emerald-400/60',
    celebrating: 'shadow-2xl shadow-yellow-400/80',
    roasting: 'shadow-xl shadow-orange-400/60'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`
        ${sizeClasses[size]} 
        rounded-full 
        overflow-hidden 
        transition-all 
        duration-300 
        ${animationClasses[state]} 
        ${glowClasses[state]}
        border-2 border-simon-blue-light/30
      `}>
        {/* Replace this src with your actual avatar image path */}
        <img
          src="/images/simon-prime-avatar.png"
          alt="Simon Prime - Virtual Music Mentor"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to emoji if image doesn't load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback emoji - hidden by default */}
        <div className="hidden w-full h-full bg-gradient-to-br from-simon-blue to-simon-purple flex items-center justify-center text-xl">
          🎸
        </div>
      </div>

      {/* Status Indicators */}
      {state === 'thinking' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse flex items-center justify-center text-xs">
          💭
        </div>
      )}

      {state === 'speaking' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-xs animate-pulse">
          🎤
        </div>
      )}

      {state === 'celebrating' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs animate-bounce">
          🎉
        </div>
      )}

      {state === 'roasting' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-xs animate-pulse">
          🔥
        </div>
      )}
    </div>
  );
};

export default function SimonPrimeChat({
  userLevel = 'intermediate',
  context = 'practice',
  genre = 'rock',
  compactMode = false
}: SimonPrimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [simonState, setSimonState] = useState<'normal' | 'thinking' | 'speaking' | 'celebrating' | 'roasting'>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    askSimon,
    isThinking,
    lastResponse,
    isHumorMode,
    toggleHumor,
    setGenre
  } = useSimonPrime(userLevel);

  // 🔊 Voice Integration
  const {
    speak,
    speakSimonResponse,
    stopSpeaking,
    toggleVoice,
    isSpeaking,
    isVoiceSupported,
    synthConfig
  } = useSimonPrimeVoice();

  // 🎸 Quick test commands for voice-over content
  const quickTestCommands = [
    "terrible performance",
    "excellent performance",
    "masterful performance",
    "needsWork performance",
    "good performance"
  ];

  // 🤖 Update Simon's avatar state based on activity
  useEffect(() => {
    if (isSpeaking) {
      setSimonState('speaking');
    } else if (isThinking || isTyping) {
      setSimonState('thinking');
    } else {
      setSimonState('normal');
    }
  }, [isSpeaking, isThinking, isTyping]);

  // 🎯 Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔥 Add Simon's welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      text: isHumorMode
        ? "🔥 Simon Prime locked and loaded! Ready to roast... I mean coach... your performance! What's cooking?"
        : "🎸 Simon Prime at your service! I'm here to help you level up your musical journey. What would you like to work on?",
      sender: 'simon',
      timestamp: Date.now(),
      emotion: isHumorMode ? 'excited' : 'professional'
    };
    setMessages([welcomeMessage]);

    // Auto-speak welcome message if voice is enabled
    if (synthConfig.enabled && isVoiceSupported) {
      speakSimonResponse(welcomeMessage.text, welcomeMessage.emotion);
    }
  }, [isHumorMode, synthConfig.enabled, isVoiceSupported, speakSimonResponse]);

  // 🎤 Send message to Simon
  const sendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // 🎯 Check for performance level testing
      const performanceMatch = inputText.match(/(terrible|needsWork|good|excellent|masterful)\s+performance/i);
      let performanceLevel = performanceMatch ? performanceMatch[1].toLowerCase() : undefined;

      // Fix case mapping for personality engine
      if (performanceLevel === 'needswork') performanceLevel = 'needsWork';

      console.log('🧪 Performance testing:', { inputText, performanceMatch, performanceLevel, context, isHumorMode });

      let response;

      if (performanceLevel) {
        // 🔥 Direct performance level testing - use personality engine directly
        try {
          const personalityResponse = SimonPrimePersonalityEngine.getResponse(
            context, // practice, vocal, etc.
            performanceLevel as any,
            'chordProgression',
            isHumorMode
          );

          console.log('🎸 Personality response:', personalityResponse);

          response = {
            answer: personalityResponse.message,
            confidence: performanceLevel === 'masterful' ? 0.95 :
              performanceLevel === 'excellent' ? 0.85 :
                performanceLevel === 'good' ? 0.7 :
                  performanceLevel === 'needsWork' ? 0.5 :
                    performanceLevel === 'terrible' ? 0.3 : 0.6,
            elements: ['performance', 'testing', performanceLevel],
            animation: personalityResponse.animation
          };
        } catch (error) {
          console.error('Performance testing error:', error);
          response = {
            answer: `🧪 Performance level "${performanceLevel}" detected! Context: ${context}, Humor: ${isHumorMode ? 'ON' : 'OFF'}`,
            confidence: 0.5,
            elements: ['testing', 'debug'],
            animation: 'nod'
          };
        }
      } else {
        // Normal query processing
        response = await askSimon(inputText, context, {
          genre,
          userLevel
        });
      }

      if (response) {
        // Determine emotion and avatar state based on performance and humor mode
        let emotion: 'excited' | 'professional' | 'encouraging' = 'professional';
        let avatarState: 'normal' | 'celebrating' | 'roasting' = 'normal';

        if (performanceLevel === 'excellent' || performanceLevel === 'masterful') {
          emotion = 'excited';
          avatarState = 'celebrating';
        } else if (performanceLevel === 'terrible' || performanceLevel === 'needsWork') {
          emotion = 'encouraging';
          avatarState = isHumorMode ? 'roasting' : 'normal';
        } else {
          emotion = isHumorMode ? 'excited' : 'professional';
        }

        const simonMessage: ChatMessage = {
          id: `simon-${Date.now()}`,
          text: response.answer,
          sender: 'simon',
          timestamp: Date.now(),
          confidence: response.confidence,
          animation: response.animation,
          emotion
        };

        setMessages(prev => [...prev, simonMessage]);

        // Set avatar state for celebration or roasting
        if (avatarState !== 'normal') {
          setSimonState(avatarState);
          setTimeout(() => setSimonState('normal'), 3000); // Return to normal after 3 seconds
        }

        // 🔊 Auto-speak Simon's response if voice is enabled
        if (synthConfig.enabled && isVoiceSupported) {
          await speakSimonResponse(response.answer, emotion);
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: isHumorMode
          ? "🤖 Oops! My circuits got tangled. Even AI needs a coffee break sometimes! ☕"
          : "I encountered an issue. Let me recalibrate and we'll get back to making music! 🎸",
        sender: 'simon',
        timestamp: Date.now(),
        emotion: 'encouraging'
      };
      setMessages(prev => [...prev, errorMessage]);

      // Speak error message too
      if (synthConfig.enabled && isVoiceSupported) {
        await speakSimonResponse(errorMessage.text, 'encouraging');
      }
    } finally {
      setIsTyping(false);
    }
  };

  // 🎸 Quick command handler
  const handleQuickCommand = async (command: string) => {
    setInputText(command);
    inputRef.current?.focus();

    // Auto-send quick commands for testing
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  // ⌨️ Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 🎭 Toggle humor mode
  const handleHumorToggle = async () => {
    const newMode = await toggleHumor();
    const modeMessage: ChatMessage = {
      id: `mode-${Date.now()}`,
      text: newMode
        ? "🔥 HUMOR MODE ACTIVATED! Time to get spicy with some legendary wit! 🌶️"
        : "🎓 Professional mode engaged. Let's get serious about perfecting your craft! 📚",
      sender: 'simon',
      timestamp: Date.now(),
      emotion: newMode ? 'excited' : 'professional'
    };
    setMessages(prev => [...prev, modeMessage]);

    // Set avatar state for mode change
    if (newMode) {
      setSimonState('roasting');
      setTimeout(() => setSimonState('normal'), 2000);
    }

    // Speak mode change announcement
    if (synthConfig.enabled && isVoiceSupported) {
      await speakSimonResponse(modeMessage.text, modeMessage.emotion);
    }
  };

  // 🔊 Speak a specific message
  const handleSpeakMessage = async (message: ChatMessage) => {
    if (isVoiceSupported && message.sender === 'simon') {
      await speakSimonResponse(message.text, message.emotion || 'professional');
    }
  };

  if (compactMode) {
    return (
      <div className="simon-chat-compact bg-gray-800 rounded-lg p-4 max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <SimonAvatar state={simonState} size="sm" />
          <span className="font-semibold text-white">Chat with Simon</span>
          <button
            onClick={handleHumorToggle}
            className={`ml-auto px-2 py-1 rounded text-xs ${isHumorMode ? 'bg-orange-600' : 'bg-blue-600'
              }`}
            disabled={isThinking}
          >
            {isHumorMode ? '🔥' : '🎓'}
          </button>
          {isVoiceSupported && (
            <button
              onClick={() => toggleVoice()}
              className={`px-2 py-1 rounded text-xs ${synthConfig.enabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
            >
              {synthConfig.enabled ? '🔊' : '🔇'}
            </button>
          )}
        </div>

        <div className="bg-gray-900 rounded p-3 mb-3 h-32 overflow-y-auto">
          {messages.slice(-2).map((message) => (
            <div key={message.id} className={`mb-2 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-2 rounded text-sm ${message.sender === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200'
                }`}>
                {message.text}
                {message.sender === 'simon' && isVoiceSupported && (
                  <button
                    onClick={() => handleSpeakMessage(message)}
                    className="ml-2 text-xs opacity-70 hover:opacity-100"
                    disabled={isSpeaking}
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Simon anything..."
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm"
            disabled={isThinking}
          />
          <button
            onClick={sendMessage}
            disabled={isThinking || !inputText.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-2 rounded"
          >
            {isThinking ? '💭' : '📤'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="simon-prime-chat bg-simon-main text-simon-blue-text rounded-2xl shadow-2xl border border-simon-blue-light/20">

      {/* 🎤 Chat Header with Avatar */}
      <div className="flex items-center justify-between p-6 border-b border-simon-blue-light/20">
        <div className="flex items-center gap-4">
          <SimonAvatar state={simonState} size="lg" />
          <div>
            <h3 className="font-bold text-simon-orange">Chat with Simon Prime</h3>
            <p className="text-sm text-simon-blue-text/80">Your Virtual Music Mentor</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-1 rounded-full ${simonState === 'speaking' ? 'bg-emerald-500/20 text-emerald-300' :
                simonState === 'thinking' ? 'bg-blue-500/20 text-blue-300' :
                  simonState === 'celebrating' ? 'bg-yellow-500/20 text-yellow-300' :
                    simonState === 'roasting' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-gray-500/20 text-gray-300'
                }`}>
                {simonState === 'speaking' ? '🎤 Speaking' :
                  simonState === 'thinking' ? '💭 Thinking' :
                    simonState === 'celebrating' ? '🎉 Celebrating' :
                      simonState === 'roasting' ? '🔥 Roasting' :
                        '😎 Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleHumorToggle}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${isHumorMode
              ? 'bg-gradient-to-r from-simon-orange to-orange-600 hover:from-simon-orange hover:to-orange-700 shadow-orange-400/40 hover:-translate-y-1'
              : 'bg-gradient-to-r from-simon-blue to-blue-600 hover:from-simon-blue hover:to-blue-700 shadow-blue-400/40 hover:-translate-y-1'
              }`}
            disabled={isThinking}
          >
            {isHumorMode ? '🔥 Humor' : '🎓 Pro'}
          </button>

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as any)}
            className="bg-white/5 text-simon-blue-text rounded-lg px-3 py-2 text-sm border border-simon-blue-light/20"
          >
            <option value="rock">🎸 Rock</option>
            <option value="country">🤠 Country</option>
            <option value="blues">🎵 Blues</option>
            <option value="metal">⚡ Metal</option>
            <option value="christian">✨ Christian</option>
            <option value="bluesrock">🔥 Blues Rock</option>
          </select>

          {/* 🔊 Voice Controls */}
          {isVoiceSupported && (
            <div className="flex gap-2">
              <button
                onClick={() => toggleVoice()}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${synthConfig.enabled
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-400/40 hover:-translate-y-1'
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 shadow-gray-400/40 hover:-translate-y-1'
                  }`}
                title={synthConfig.enabled ? 'Voice ON - Simon will speak' : 'Voice OFF - Text only'}
              >
                {synthConfig.enabled ? '🔊' : '🔇'}
              </button>

              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-400/40 hover:-translate-y-1"
                >
                  ⏹️ Stop
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📜 Chat Messages with Avatar */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-xs lg:max-w-md ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {message.sender === 'simon' && (
                <SimonAvatar
                  state={
                    message.emotion === 'excited' ? 'celebrating' :
                      message.emotion === 'encouraging' && isHumorMode ? 'roasting' :
                        'normal'
                  }
                  size="sm"
                />
              )}

              <div className={`px-4 py-3 rounded-lg transition-all ${message.sender === 'user'
                ? 'bg-gradient-to-r from-simon-blue to-blue-600 text-white shadow-lg shadow-blue-400/40'
                : 'bg-white/5 backdrop-blur-lg text-simon-blue-text border border-simon-blue-light/20 shadow-lg'
                }`}>
                {message.sender === 'simon' && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-simon-orange font-medium">Simon Prime</span>
                      {message.confidence && (
                        <span className="text-xs text-emerald-400">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {isVoiceSupported && (
                      <button
                        onClick={() => handleSpeakMessage(message)}
                        disabled={isSpeaking}
                        className={`text-xs px-2 py-1 rounded transition-all ${isSpeaking
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-white/10 text-simon-blue-text/70 hover:bg-white/20 hover:text-simon-blue-text'
                          }`}
                        title="Speak this message"
                      >
                        {isSpeaking ? '🎤' : '🔊'}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className="text-xs text-simon-blue-text/50 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <SimonAvatar state="thinking" size="sm" />
              <div className="bg-white/5 backdrop-blur-lg text-simon-blue-text border border-simon-blue-light/20 px-4 py-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Simon is thinking</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-simon-orange rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-simon-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-simon-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 🎯 Quick Test Commands */}
      <div className="p-4 border-t border-simon-blue-light/20">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-simon-orange mb-3 flex items-center gap-2">
            🧪 Test Voice-Over Content:
            {synthConfig.enabled && (
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">
                🔊 Voice ON
              </span>
            )}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {quickTestCommands.map((command) => (
              <button
                key={command}
                onClick={() => handleQuickCommand(command)}
                className="text-xs bg-white/5 hover:bg-white/10 text-simon-blue-text px-3 py-2 rounded-lg transition-all border border-white/10 hover:border-simon-blue-hover/30 hover:-translate-y-1 shadow-lg hover:shadow-2xl"
                disabled={isThinking}
              >
                {command}
              </button>
            ))}
          </div>
        </div>

        {/* 💬 Chat Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Simon anything... (try 'excellent performance' to test responses)"
            className="flex-1 bg-white/5 backdrop-blur-lg text-simon-blue-text rounded-lg px-4 py-3 border border-simon-blue-light/20 focus:border-simon-blue-hover/50 focus:outline-none transition-all"
            disabled={isThinking}
          />
          <button
            onClick={sendMessage}
            disabled={isThinking || !inputText.trim()}
            className="bg-gradient-to-r from-simon-orange to-orange-600 hover:from-simon-orange hover:to-orange-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-orange-400/40 hover:-translate-y-1 disabled:hover:translate-y-0"
          >
            {isThinking ? '💭' : '🎤'}
          </button>
        </div>
      </div>

      {/* 🎸 Footer */}
      <div className="px-6 py-3 border-t border-simon-blue-light/20 text-center">
        <p className="text-xs text-simon-blue-text/60">
          💡 Perfect for testing voice-over content and Simon's personality responses!
          {synthConfig.enabled && ' 🔊 Voice feedback enabled'}
        </p>
      </div>
    </div>
  );
}