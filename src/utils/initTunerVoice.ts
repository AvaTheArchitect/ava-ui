// 🎵 TUNER VOICE CONTROL UTILITIES - Speech Recognition for Guitar Tuner
// File: maestro-ai/src/utils/initTunerVoice.ts

/// <reference path="../types/speech.d.ts" />

// 🎯 Tuner Voice Command Configuration
interface TunerVoiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// 🎯 Voice Command Patterns
const TUNER_COMMANDS = {
  ACTIVATE: [
    'activate tuner',
    'open tuner',
    'tune guitar',
    'guitar tuner',
    'start tuning',
    'tuning mode'
  ],
  DEACTIVATE: [
    'close tuner',
    'hide tuner',
    'stop tuning',
    'exit tuner'
  ]
} as const;

// 🎵 Initialize Tuner Voice Recognition
export function initTunerVoice(
  recognition: SpeechRecognition,
  toggler: (active: boolean) => void,
  config: TunerVoiceConfig = {}
): void {
  // Configure recognition settings
  recognition.continuous = config.continuous ?? false;
  recognition.interimResults = config.interimResults ?? false;
  recognition.lang = config.language ?? 'en-US';
  recognition.maxAlternatives = config.maxAlternatives ?? 1;

  // 🎯 Handle voice recognition results
  recognition.onresult = (event: SpeechRecognitionEvent): void => {
    const lastResultIndex = event.results.length - 1;
    const lastResult = event.results[lastResultIndex];
    
    if (lastResult.isFinal) {
      const spoken = lastResult[0].transcript.toLowerCase().trim();
      console.log(`🎵 Voice command received: "${spoken}"`);
      
      processVoiceCommand(spoken, toggler);
    }
  };

  // 🎯 Handle recognition errors  
  recognition.onerror = (event: SpeechRecognitionErrorEvent): void => {
    console.error('🎵 Voice tuner error:', {
      error: event.error,
      message: event.message
    });
    
    // Handle specific error types (event.error is string in your original speech.d.ts)
    const errorType = event.error.toLowerCase();
    switch (errorType) {
      case 'not-allowed':
        console.warn('🎵 Microphone access denied for voice commands');
        break;
      case 'no-speech':
        console.log('🎵 No speech detected');
        break;
      case 'network':
        console.warn('🎵 Network error during voice recognition');
        break;
      case 'aborted':
        console.log('🎵 Voice recognition aborted');
        break;
      case 'audio-capture':
        console.warn('🎵 Audio capture error');
        break;
      case 'service-not-allowed':
        console.warn('🎵 Speech service not allowed');
        break;
      case 'bad-grammar':
        console.warn('🎵 Speech grammar error');
        break;
      case 'language-not-supported':
        console.warn('🎵 Language not supported');
        break;
      default:
        console.warn(`🎵 Voice recognition error: ${event.error}`);
    }
  };

  // 🎯 Handle recognition end
  recognition.onend = (): void => {
    console.log('🎵 Voice tuner recognition ended');
  };

  // 🎯 Handle recognition start
  recognition.onstart = (): void => {
    console.log('🎵 Voice tuner recognition started');
  };

  console.log('🎵 Tuner voice commands initialized (shared utility)');
}

// 🎯 Process voice commands
function processVoiceCommand(spoken: string, toggler: (active: boolean) => void): void {
  // Check for activation commands
  for (const command of TUNER_COMMANDS.ACTIVATE) {
    if (spoken.includes(command)) {
      console.log(`🎵 Voice: Activating tuner (command: "${command}")`);
      toggler(true);
      return;
    }
  }

  // Check for deactivation commands
  for (const command of TUNER_COMMANDS.DEACTIVATE) {
    if (spoken.includes(command)) {
      console.log(`🎵 Voice: Closing tuner (command: "${command}")`);
      toggler(false);
      return;
    }
  }

  console.log(`🎵 Voice: Unrecognized tuner command: "${spoken}"`);
}

// 🎯 Create Speech Recognition Instance
export function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === 'undefined') {
    console.warn('🎵 Speech recognition not available (server-side)');
    return null;
  }

  // Use your existing Window interface declarations
  const SpeechRecognitionConstructor = 
    window.SpeechRecognition || 
    window.webkitSpeechRecognition;
  
  if (!SpeechRecognitionConstructor) {
    console.warn('🎵 Speech recognition not supported in this browser');
    return null;
  }

  return new SpeechRecognitionConstructor();
}

// 🎯 Check Speech Recognition Support
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 🎯 Default export for compatibility
export default initTunerVoice;

// 🎯 Export types for external use
export type { TunerVoiceConfig };