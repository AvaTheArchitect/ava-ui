'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { TabMeasure } from '@/lib/tab-parsers/basicTabParser';
import { Staffnotationparser } from '@/modules/notation/parsers/staffNotationParser';
import { Chordsymbolparser } from '@/modules/notation/parsers/chordSymbolParser';
import { Techniqueparser } from '@/modules/notation/parsers/techniqueParser';
import { Rhythmnotationparser } from '@/modules/notation/parsers/rhythmNotationParser';
import { Validationengineparser } from '@/modules/notation/parsers/validationEngineParser';
import { Formatconverterparser } from '@/modules/notation/parsers/formatConverterParser';
import TabMeasureRenderer from '@/components/guitar/display/TabMeasureRenderer';

// Supporting interfaces
interface SystemLayout {
  systemIndex: number;
  startMeasure: number;
  endMeasure: number;
  measures: TabMeasure[];
  offsetTop: number;
  height: number;
  sectionLabel?: string;
  standardNotation?: any;
  chordSymbols?: any;
  techniques?: Technique[];
  rhythmData?: any;
}

interface SongSection {
  name: string;
  startMeasure: number;
  endMeasure: number;
  difficulty?: number;
  keySignature?: string;
  timeSignature?: string;
}

interface AIRecommendation {
  type: string;
  description: string;
  confidence: number;
}

interface Technique {
  type: string;
  measure: number;
  description: string;
}

// Main component props
interface ScrollingTabDisplayProps {
  measures?: TabMeasure[];
  tabData?: TabMeasure[];
  guitarProFile?: File;
  midiFile?: File;

  songTitle?: string;
  artist?: string;
  bpm?: number;
  timeSignature?: [number, number];
  showCursor?: boolean;
  autoScroll?: boolean;
  measuresPerLine?: number;
  stringSpacing?: number;
  staffLineSpacing?: number;
  visibleStaffLines?: number;

  showStandardNotation?: boolean;
  showChordSymbols?: boolean;
  showTechniques?: boolean;
  zoomLevel?: number;
  theme?: 'light' | 'dark';

  measuresPerSystem?: number;
  systemSpacing?: number;
  enableVerticalScrollbar?: boolean;

  aiTeachingEnabled?: boolean;
  practiceMode?: boolean;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';

  playbackControls?: ReturnType<typeof usePlaybackControls>;
  enableMetronome?: boolean;
  loopEnabled?: boolean;

  songSections?: SongSection[];
  onSectionChange?: (section: string) => void;

  onPositionChange?: (measure: number, beat: number, system: number) => void;
  onTechniqueDetected?: (technique: string, measure: number) => void;
  onAIRecommendation?: (recommendation: AIRecommendation) => void;

  className?: string;
}

const ScrollingTabDisplay: React.FC<ScrollingTabDisplayProps> = ({
  measures = [],
  tabData,
  guitarProFile,
  songTitle = '',
  artist = '',
  bpm = 120,
  timeSignature = [4, 4],
  showCursor = true,
  measuresPerLine = 4,
  stringSpacing = 30,
  staffLineSpacing = 180,
  visibleStaffLines = 4,
  showStandardNotation = false,
  zoomLevel = 100,
  theme = 'light',
  measuresPerSystem = 4,
  systemSpacing = 60,
  enableVerticalScrollbar = true,
  aiTeachingEnabled = false,
  practiceMode = false,
  difficultyLevel = 'intermediate',
  playbackControls,
  loopEnabled = false,
  onPositionChange,
  onAIRecommendation,
  className = ""
}) => {
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ measure: 0, beat: 0, system: 0 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopPoints] = useState({ start: 0, end: 0 });

  // Vertical Scroll Display State
  const [currentSystem, setCurrentSystem] = useState(0);
  const [systemLayouts, setSystemLayouts] = useState<SystemLayout[]>([]);

  // Parser States - Fixed types
  const [parsedNotation, setParsedNotation] = useState<any>(null);
  const [chordProgression, setChordProgression] = useState<any>(null);
  const [detectedTechniques, setDetectedTechniques] = useState<Technique[]>([]);
  const [rhythmAnalysis, setRhythmAnalysis] = useState<any>(null);

  // AI Teaching State
  const [practiceRecommendations, setPracticeRecommendations] = useState<AIRecommendation[]>([]);
  const [masteredSections, setMasteredSections] = useState<Set<number>>(new Set());

  const viewportRef = useRef<HTMLDivElement>(null);

  // Use the actual measures data
  const actualMeasures = useMemo(() => {
    return measures.length > 0 ? measures : (tabData || []);
  }, [measures, tabData]);

  // Helper function to convert File to Uint8Array
  const fileToUint8Array = async (file: File): Promise<Uint8Array> => {
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  // Parse Guitar Pro files
  const parseGuitarProFile = useCallback(async (file: File) => {
    try {
      console.log('Parsing Guitar Pro file with Phase 12 parsers...');

      const fileData = await fileToUint8Array(file);

      const formatConverterInstance = Formatconverterparser.create();
      const staffParserInstance = Staffnotationparser.create();
      const chordParserInstance = Chordsymbolparser.create();
      const techniqueParserInstance = Techniqueparser.create();
      const rhythmParserInstance = Rhythmnotationparser.create();
      const validationInstance = Validationengineparser.create();

      // Parse Guitar Pro file
      const parseResult = await formatConverterInstance.parseGuitarPro(fileData);

      if (!parseResult.success || !parseResult.song) {
        console.error('Failed to parse Guitar Pro file:', parseResult.errors);
        return;
      }

      const gpSong = parseResult.song;

      // Parse each aspect
      const staffData = await staffParserInstance.parseStaffFromGuitarPro(gpSong);
      const chordData = await chordParserInstance.parseChordsFromGuitarPro(gpSong);
      const techniqueData = await techniqueParserInstance.parseTechniquesFromGuitarPro(gpSong);
      const rhythmData = await rhythmParserInstance.parseRhythmFromGuitarPro(gpSong);

      // Validate all parsed data
      const validationResults = await validationInstance.validateMusic({
        staff: staffData,
        chords: chordData,
        techniques: techniqueData,
        rhythms: rhythmData
      });

      console.log('Validation:', validationResults);

      // Set states
      setParsedNotation(staffData);
      setChordProgression(chordData);
      setRhythmAnalysis(rhythmData);

      // Convert techniques to UI format
      if (techniqueData?.techniques) {
        const uiTechniques: Technique[] = techniqueData.techniques.map((t: any) => ({
          type: t.name || t.type,
          measure: t.measure || 0,
          description: t.description || `${t.type} technique`
        }));
        setDetectedTechniques(uiTechniques);
      }

      return validationResults;
    } catch (error) {
      console.error('GP file parse error:', error);
    }
  }, []);

  // Integration with usePlaybackControls hook
  const defaultPlaybackControls = usePlaybackControls();
  const activePlaybackControls = playbackControls || defaultPlaybackControls;

  // Handle position updates from playback - Fixed to use state.currentTime
  useEffect(() => {
    if (activePlaybackControls?.state?.currentTime !== undefined && isPlaying) {
      const beatsPerSecond = bpm / 60;
      const totalBeats = activePlaybackControls.state.currentTime * beatsPerSecond;
      const beatsPerMeasure = timeSignature[0];

      const measure = Math.floor(totalBeats / beatsPerMeasure);
      const beat = Math.floor(totalBeats % beatsPerMeasure);
      const system = Math.floor(measure / (measuresPerSystem || measuresPerLine || 4));

      const newPosition = { measure, beat, system };

      if (newPosition.measure !== currentPosition.measure ||
        newPosition.beat !== currentPosition.beat ||
        newPosition.system !== currentPosition.system) {
        setCurrentPosition(newPosition);
        onPositionChange?.(measure, beat, system);
      }
    }
  }, [activePlaybackControls?.state?.currentTime, isPlaying, bpm, timeSignature, measuresPerSystem, measuresPerLine, currentPosition, onPositionChange]);

  // Manual position tracking when no audio engine
  useEffect(() => {
    if (isPlaying && !activePlaybackControls?.state?.currentTime) {
      const interval = setInterval(() => {
        setCurrentPosition(prev => {
          const beatsPerMeasure = timeSignature[0];
          const nextBeat = prev.beat + 1;

          if (nextBeat >= beatsPerMeasure) {
            const nextMeasure = prev.measure + 1;
            const nextSystem = Math.floor(nextMeasure / (measuresPerSystem || measuresPerLine || 4));
            return { measure: nextMeasure, beat: 0, system: nextSystem };
          }

          return { ...prev, beat: nextBeat };
        });
      }, (60 / bpm) * 1000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, bpm, timeSignature, measuresPerSystem, measuresPerLine, activePlaybackControls?.state?.currentTime]);

  // Handle file upload
  useEffect(() => {
    if (guitarProFile) {
      parseGuitarProFile(guitarProFile);
    }
  }, [guitarProFile, parseGuitarProFile]);

  // AI-powered practice recommendations
  useEffect(() => {
    if (parsedNotation && detectedTechniques.length > 0) {
      const recommendations = detectedTechniques.map((technique, index) => ({
        type: 'technique-practice',
        description: `Practice ${technique.type} technique in measure ${technique.measure + 1}`,
        confidence: 0.8 + (Math.min(index, 5) * 0.03)
      }));
      setPracticeRecommendations(recommendations);
    }
  }, [parsedNotation, detectedTechniques]);

  // Track practice progress  
  const updateMastery = useCallback((measure: number, accuracy: number) => {
    if (accuracy > 0.9) {
      setMasteredSections(prev => new Set([...prev, measure]));
    }

    const recommendation: AIRecommendation = {
      type: 'feedback',
      description: accuracy > 0.9 ?
        `Excellent work on measure ${measure + 1}!` :
        `Keep practicing measure ${measure + 1} - focus on timing`,
      confidence: accuracy
    };

    onAIRecommendation?.(recommendation);
  }, [onAIRecommendation]);

  // Create system layouts for vertical scrolling
  useEffect(() => {
    if (actualMeasures.length === 0) return;

    const layouts: SystemLayout[] = [];
    const measuresPerSys = measuresPerSystem || measuresPerLine || 4;

    for (let i = 0; i < actualMeasures.length; i += measuresPerSys) {
      const systemMeasures = actualMeasures.slice(i, i + measuresPerSys);
      const systemIndex = Math.floor(i / measuresPerSys);

      layouts.push({
        systemIndex,
        startMeasure: i,
        endMeasure: Math.min(i + measuresPerSys - 1, actualMeasures.length - 1),
        measures: systemMeasures,
        offsetTop: systemIndex * (staffLineSpacing || 180),
        height: staffLineSpacing || 180,
        sectionLabel: i === 0 ? 'Intro' : undefined,
        techniques: detectedTechniques.filter(t => t.measure >= i && t.measure < i + measuresPerSys)
      });
    }

    setSystemLayouts(layouts);
  }, [actualMeasures, measuresPerSystem, measuresPerLine, staffLineSpacing, detectedTechniques]);

  // Update current system based on position
  useEffect(() => {
    const system = Math.floor(currentPosition.measure / (measuresPerSystem || measuresPerLine || 4));
    if (system !== currentSystem && system < systemLayouts.length) {
      setCurrentSystem(system);
    }
  }, [currentPosition.measure, measuresPerSystem, measuresPerLine, currentSystem, systemLayouts.length]);

  // Render methods
  const renderTabHeader = () => (
    <div className="tab-header mb-4">
      <h1 className="text-2xl font-bold">{songTitle}</h1>
      {artist && <h2 className="text-lg text-gray-600">by {artist}</h2>}
      <div className="text-sm text-gray-500">
        {bpm} BPM • {timeSignature[0]}/{timeSignature[1]} • {actualMeasures.length} measures
      </div>
    </div>
  );

  const renderPlaybackControls = () => (
    <div className="playback-controls mb-4 flex items-center gap-4">
      <button
        onClick={() => {
          const newPlayState = !isPlaying;
          setIsPlaying(newPlayState);
          if (newPlayState) {
            activePlaybackControls?.play();
          } else {
            activePlaybackControls?.pause();
          }
        }}
        className={`px-4 py-2 rounded font-medium ${isPlaying
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <button
        onClick={() => {
          setIsPlaying(false);
          setCurrentPosition({ measure: 0, beat: 0, system: 0 });
          activePlaybackControls?.stop();
        }}
        className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-medium"
      >
        ⏹ Stop
      </button>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Speed:</label>
        <input
          type="range"
          min="0.25"
          max="2"
          step="0.25"
          value={playbackSpeed}
          onChange={(e) => {
            const newSpeed = parseFloat(e.target.value);
            setPlaybackSpeed(newSpeed);
          }}
          className="w-20"
        />
        <span className="text-sm text-gray-600">{playbackSpeed}x</span>
      </div>

      {loopEnabled && (
        <div className="flex items-center gap-2 text-sm">
          <span>Loop:</span>
          <span>{loopPoints.start}-{loopPoints.end}</span>
        </div>
      )}
    </div>
  );

  const renderSystemLayouts = () => (
    <div className="systems-container">
      {systemLayouts.map((system, systemIndex) => (
        <div
          key={systemIndex}
          className={`tab-system mb-8 ${currentSystem === systemIndex ? 'active-system' : ''}`}
          style={{
            marginBottom: `${systemSpacing}px`,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left'
          }}
        >
          {system.sectionLabel && (
            <div className="section-label mb-2">
              <h3 className="text-lg font-semibold">{system.sectionLabel}</h3>
              <span className="text-sm text-gray-500">
                Measures {system.startMeasure + 1}-{system.endMeasure + 1}
              </span>
            </div>
          )}

          {showStandardNotation && parsedNotation && (
            <div className="standard-notation mb-4">
              <div className="bg-gray-50 p-4 rounded">
                Standard notation would render here
              </div>
            </div>
          )}

          <div className="tablature-system">
            <div className="tab-measures flex gap-4">
              {system.measures.map((_, measureIndex) => (
                <div
                  key={measureIndex}
                  className={`tab-measure p-2 border rounded ${currentPosition.measure === system.startMeasure + measureIndex
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-white border-gray-200'
                    }`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    M{system.startMeasure + measureIndex + 1}
                  </div>

                  <div className="tab-measures flex gap-4">
                    {system.measures.map((measure, measureIndex) => (
                      <div
                        key={measureIndex}
                        className={`tab-measure p-2 border rounded ${currentPosition.measure === system.startMeasure + measureIndex
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white border-gray-200'
                          }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          M{system.startMeasure + measureIndex + 1}
                        </div>

                        {/* Render actual tablature */}
                        <TabMeasureRenderer
                          measure={{
                            number: system.startMeasure + measureIndex + 1,
                            notes: measure.notes || [],
                            timeSignature: timeSignature
                              ? { numerator: timeSignature[0], denominator: timeSignature[1] }
                              : { numerator: 4, denominator: 4 }
                          }}
                          width={180}
                          height={stringSpacing * 6}
                          stringSpacing={stringSpacing}
                          isActive={currentPosition.measure === system.startMeasure + measureIndex}
                          showMeasureNumber={false}
                          showTechniques={true}
                        />


                        {/* Technique annotations */}
                        {system.techniques?.filter(t =>
                          t.measure === system.startMeasure + measureIndex
                        ).map((technique, techIndex) => (
                          <div key={techIndex} className="text-xs text-purple-600 mt-1">
                            {technique.type}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {system.techniques?.filter(t =>
                    t.measure === system.startMeasure + measureIndex
                  ).map((technique, techIndex) => (
                    <div key={techIndex} className="text-xs text-purple-600 mt-1">
                      {technique.type}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {showCursor && isPlaying && currentSystem === systemIndex && (
            <div
              className="playback-cursor absolute bg-red-500"
              style={{
                width: '2px',
                height: `${staffLineSpacing}px`,
                left: `${(currentPosition.beat / timeSignature[0]) * 100}%`,
                opacity: 0.8
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderAITeachingPanel = () => {
    if (!aiTeachingEnabled) return null;

    return (
      <div className="ai-teaching-panel mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">AI Teaching Assistant</h3>

        {practiceRecommendations.length > 0 && (
          <div className="recommendations mb-3">
            <h4 className="font-medium text-sm mb-1">Practice Recommendations:</h4>
            {practiceRecommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="text-sm text-blue-700 mb-1">
                • {rec.description} (Confidence: {Math.round(rec.confidence * 100)}%)
              </div>
            ))}
          </div>
        )}

        {masteredSections.size > 0 && (
          <div className="progress">
            <div className="text-sm text-green-700">
              ✅ Mastered sections: {Array.from(masteredSections).map(m => m + 1).join(', ')}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-600 mt-2">
          Difficulty: {difficultyLevel} • Mode: {practiceMode ? 'Practice' : 'Play'}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className={`scrolling-tab-display theme-${theme} ${className}`}>
      {renderTabHeader()}
      {renderPlaybackControls()}

      <div className="tab-viewport" ref={viewportRef} style={{ position: 'relative' }}>
        {enableVerticalScrollbar && systemLayouts.length > visibleStaffLines && (
          <div
            className="vertical-scrollbar absolute right-0 top-0 w-3 bg-gray-200 rounded"
            style={{ height: `${visibleStaffLines * staffLineSpacing}px` }}
          >
            <div
              className="scroll-thumb bg-gray-400 rounded cursor-pointer"
              style={{
                height: `${(visibleStaffLines / systemLayouts.length) * 100}%`,
                transform: `translateY(${(currentSystem / systemLayouts.length) * 100}%)`,
              }}
            />
          </div>
        )}

        <div className="tab-content-vertical overflow-hidden">
          {renderSystemLayouts()}
        </div>
      </div>

      {renderAITeachingPanel()}

      {practiceMode && (
        <div className="debug-info mt-4 p-2 bg-gray-100 rounded text-xs">
          <div>Systems: {systemLayouts.length} | Current: {currentSystem + 1}</div>
          <div>Position: M{currentPosition.measure + 1} B{currentPosition.beat + 1}</div>
          <div>Techniques: {detectedTechniques.length} detected</div>
          {parsedNotation && <div>Staff notation: ✅ Parsed</div>}
          {chordProgression && <div>Chords: ✅ Parsed</div>}
          {rhythmAnalysis && <div>Rhythm: ✅ Parsed</div>}
        </div>
      )}
    </div>
  );
};

export default ScrollingTabDisplay;