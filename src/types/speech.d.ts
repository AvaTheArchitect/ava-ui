// 🎵 ENHANCED SPEECH API TYPES - Virtual AI Music Mentor/Teacher
// File: src/types/speech.d.ts

// 🎯 Enhanced Speech Recognition with Music-Specific Features
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    serviceURI: string;
    grammars: SpeechGrammarList;

    // Methods
    start(): void;
    stop(): void;
    abort(): void;

    // Event handlers
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror:
      | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
      | null;
    onnomatch:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
      | null;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
      | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  }

  // 🎯 Enhanced Speech Recognition Event with Confidence Scoring
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
    readonly interpretation?: any; // For SISR (Semantic Interpretation)
    readonly emma?: Document; // For EMMA (Extensible MultiModal Annotation)
  }

  // 🎯 Enhanced Error Event with Music-Specific Error Types
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorType;
    readonly message: string;
  }

  // 🎯 Comprehensive Error Types for Music Teaching
  type SpeechRecognitionErrorType =
    | "no-speech" // No speech detected
    | "aborted" // Recognition aborted
    | "audio-capture" // Audio capture error
    | "network" // Network error
    | "not-allowed" // Permission denied
    | "service-not-allowed" // Service not allowed
    | "bad-grammar" // Grammar error
    | "language-not-supported" // Language not supported
    | "audio-quality" // Poor audio quality (custom)
    | "background-noise" // Too much background noise (custom)
    | "timeout" // Recognition timeout (custom)
    | "music-interference" // Musical instrument interference (custom)
    | "microphone-blocked"; // Microphone access blocked (custom);

  // 🎯 Enhanced Result with Music-Specific Metadata
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;

    // Enhanced metadata for music teaching
    readonly confidence?: number;
    readonly stability?: number;
    readonly musicTermDetected?: boolean;
    readonly instrumentMentioned?: string[];
    readonly notesMentioned?: string[];
    readonly chordsMentioned?: string[];
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  // 🎯 Enhanced Alternative with Music Context
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;

    // Enhanced features for music teaching
    readonly musicTerms?: MusicTerm[];
    readonly semanticInterpretation?: SemanticResult;
    readonly languageCode?: string;
    readonly isMusicInstruction?: boolean;
  }

  // 🎯 Enhanced Grammar Support for Music
  interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
    addFromURI(src: string, weight?: number): void;
    addFromString(string: string, weight?: number): void;

    // Music-specific grammar methods
    addMusicVocabulary?(vocabulary: MusicVocabulary, weight?: number): void;
    addInstrumentTerms?(instrument: string, weight?: number): void;
  }

  interface SpeechGrammar {
    src: string;
    weight: number;

    // Enhanced grammar properties
    musicContext?: "general" | "guitar" | "piano" | "voice" | "theory";
    language?: string;
    vocabulary?: string[];
  }

  // 🎯 Enhanced Constructor Types
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (config?: MusicSpeechConfig): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (config?: MusicSpeechConfig): SpeechRecognition;
  };

  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;

    // Music-specific extensions
    MusicSpeechRecognition?: typeof SpeechRecognition;
    VoiceActivityDetector?: {
      new (): VoiceActivityDetector;
    };
  }

  // Navigation extensions for voice permissions
  interface Navigator {
    permissions?: {
      query(descriptor: { name: string }): Promise<{ state: string }>;
    };
  }
}

// 🎯 Music-Specific Semantic Types (exported for use in modules)
export interface MusicTerm {
  term: string;
  category:
    | "note"
    | "chord"
    | "scale"
    | "rhythm"
    | "technique"
    | "instrument"
    | "theory";
  confidence: number;
  startOffset: number;
  endOffset: number;
}

export interface SemanticResult {
  intent?:
    | "play"
    | "stop"
    | "repeat"
    | "slower"
    | "faster"
    | "help"
    | "explain"
    | "practice";
  entities?: {
    note?: string;
    chord?: string;
    scale?: string;
    tempo?: number;
    instrument?: string;
    technique?: string;
  };
  confidence: number;
}

// 🎯 Music-Specific Vocabulary Definitions
export interface MusicVocabulary {
  notes: string[]; // ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  chords: string[]; // ['major', 'minor', 'diminished', 'augmented', '7th', 'sus4']
  scales: string[]; // ['major', 'minor', 'pentatonic', 'blues', 'dorian']
  techniques: string[]; // ['vibrato', 'bend', 'slide', 'hammer-on', 'pull-off']
  rhythms: string[]; // ['whole note', 'half note', 'quarter note', 'eighth note']
  instruments: string[]; // ['guitar', 'piano', 'violin', 'drums', 'voice']
  commands: string[]; // ['play', 'stop', 'repeat', 'slower', 'faster', 'help']
  dynamics: string[]; // ['forte', 'piano', 'crescendo', 'diminuendo']
  tempos: string[]; // ['allegro', 'andante', 'adagio', 'presto']
}

// 🎯 Advanced Configuration for Music Teaching
export interface MusicSpeechConfig {
  // Basic config
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;

  // Music-specific config
  instrument?: "guitar" | "piano" | "voice" | "general";
  skillLevel?: "beginner" | "intermediate" | "advanced";
  musicStyle?: "classical" | "jazz" | "rock" | "folk" | "general";
  confidenceThreshold?: number; // Minimum confidence for music terms
  noiseFiltering?: boolean; // Filter background music/noise
  musicTermPriority?: boolean; // Prioritize music terminology
  realTimeProcessing?: boolean; // Process interim results for real-time feedback
  voiceCalibration?: boolean; // Adapt to user's speaking voice
  multiLanguageSupport?: string[]; // Support multiple languages for terms

  // Advanced features
  semanticInterpretation?: boolean; // Enable intent/entity extraction
  musicContextAware?: boolean; // Use lesson context for better recognition
  adaptiveLearning?: boolean; // Learn user's speech patterns
  customVocabulary?: MusicVocabulary; // Custom music vocabulary
}

// 🎯 Voice Activity Detection (for better music teaching)
export interface VoiceActivityDetector {
  start(): void;
  stop(): void;
  isVoiceDetected(): boolean;
  getSpeechProbability(): number;
  setNoiseThreshold(threshold: number): void;
  onvoicestart?: (event: Event) => void;
  onvoiceend?: (event: Event) => void;
}

// 🎯 Real-time Speech Metrics (for pronunciation teaching)
export interface SpeechMetrics {
  readonly pitch: number; // Fundamental frequency
  readonly volume: number; // Audio level
  readonly clarity: number; // Speech clarity score
  readonly pace: number; // Words per minute
  readonly pronunciation: number; // Pronunciation accuracy (0-1)
  readonly confidence: number; // Overall confidence
  readonly timestamp: number; // When measured
}

// 🎯 Music Lesson Context (for contextual recognition)
export interface MusicLessonContext {
  currentLesson?: string; // Current lesson ID
  instrument?: string; // Primary instrument
  key?: string; // Current key signature
  tempo?: number; // Current tempo (BPM)
  timeSignature?: string; // Current time signature
  chordProgression?: string[]; // Current chord progression
  scale?: string; // Current scale being practiced
  difficulty?: "beginner" | "intermediate" | "advanced";
  objectives?: string[]; // Lesson objectives
}

// 🎯 Music-Specific Grammar Presets
export const MUSIC_GRAMMARS = {
  GUITAR: `
    #JSGF V1.0;
    grammar guitar;
    public <command> = <chord> | <technique> | <tuning> | <scale>;
    <chord> = (C | D | E | F | G | A | B) [major | minor | seventh | suspended];
    <technique> = bend | slide | hammer on | pull off | vibrato | palm mute;
    <tuning> = tune | tuning | standard tuning | drop D | DADGAD;
    <scale> = major scale | minor scale | pentatonic | blues scale;
  `,

  PIANO: `
    #JSGF V1.0;
    grammar piano;
    public <command> = <note> | <chord> | <scale> | <technique>;
    <note> = (C | D | E | F | G | A | B) [sharp | flat] [one through eight];
    <chord> = <note> [major | minor | diminished | augmented | seventh];
    <scale> = <note> (major | minor | chromatic | whole tone) scale;
    <technique> = legato | staccato | fortissimo | pianissimo | crescendo;
  `,

  VOICE: `
    #JSGF V1.0;
    grammar voice;
    public <command> = <note> | <technique> | <exercise>;
    <note> = do | re | mi | fa | sol | la | ti | (C | D | E | F | G | A | B);
    <technique> = vibrato | falsetto | head voice | chest voice | mixed voice;
    <exercise> = scale | arpeggio | warm up | breathing exercise;
  `,

  GENERAL: `
    #JSGF V1.0;
    grammar music;
    public <command> = <action> | <tempo> | <dynamics>;
    <action> = play | stop | pause | repeat | slower | faster | help;
    <tempo> = allegro | andante | adagio | moderato | presto;
    <dynamics> = forte | piano | mezzo forte | fortissimo | pianissimo;
  `,
};
