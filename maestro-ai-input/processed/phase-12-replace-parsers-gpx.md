# Phase 12: Guitar Pro Parser Regeneration - AlphaTab Integration

## Architecture Requirements

Follow Next.js App Router patterns with @/ path aliases. Use @coderline/alphatab for Guitar Pro parsing. NO file system operations. Focus on guitar tablature display for Rock/Metal/Country/Blues/Worship genres.

## Required Export Pattern

Each parser must export with exact class names (case-sensitive) for ScrollingTabDisplay compatibility:

- Staffnotationparser
- Chordsymbolparser
- Techniqueparser
- Rhythmnotationparser
- Realtimeparser
- Formatconverterparser

## CREATE: staffNotationParser

Type: parser
Path: src/modules/notation/parsers/staffNotationParser
Description: Parse Guitar Pro staff notation for guitar tablature display using AlphaTab. Parse treble clef guitar notation, convert staff to fret/string positions, handle guitar-friendly key signatures (C, G, D, A, E, F, Bb), support common time signatures (4/4, 3/4, 6/8). Export class as Staffnotationparser with methods parseStaffNotation(), convertToTab(), getNotesForMeasure()

## CREATE: chordSymbolParser

Type: parser
Path: src/modules/notation/parsers/chordSymbolParser
Description: Extract and display chord symbols from Guitar Pro files using AlphaTab. Parse chord symbols from GP chord tracks, detect guitar chord types (major, minor, 7th, sus, power chords), handle slash chords and extensions, generate guitar chord diagrams with fret positions. Support genre-specific voicings for Rock (power chords), Worship (open extensions), Country (capo-friendly), Blues (7th voicings). Export class as Chordsymbolparser with methods parseChords(), generateChordDiagram(), getChordProgression()

## CREATE: techniqueParser

Type: parser
Path: src/modules/notation/parsers/techniqueParser
Description: Parse guitar techniques from Guitar Pro files using AlphaTab API. Extract GP technique markers including hammer-on, pull-off, slide, bend, vibrato, palm muting, harmonics, tremolo picking. Convert GP technique data for tablature display. Support genre-specific techniques for Metal (palm muting, fast picking), Blues (bending, vibrato), Country (fingerpicking, chicken picking), Worship (strumming, ambient). Export class as Techniqueparser with methods parseTechniques(), getTechniqueSymbols(), applyToTab()

## CREATE: rhythmNotationParser

Type: parser
Path: src/modules/notation/parsers/rhythmNotationParser
Description: Parse rhythm patterns from Guitar Pro for scrolling display using AlphaTab. Extract rhythm data from GP tracks, parse note durations (quarter, eighth, sixteenth), handle dotted rhythms and triplets, generate timing data for scrolling tablature. Support genre rhythm patterns for Rock (4/4 steady), Metal (fast 16th notes), Country (fingerpicking, 3/4 waltz), Blues (shuffle, swing), Worship (ballad timing). Export class as Rhythmnotationparser with methods parseRhythm(), getTimingData(), calculateScrollSpeed()

## CREATE: realtimeParser

Type: parser
Path: src/modules/notation/parsers/realtimeParser
Description: Real-time Guitar Pro processing for live scrolling display using AlphaTab. Stream GP data for real-time display, buffer measures ahead for smooth scrolling, sync with audio playback timing from usePlaybackControls hook, handle tempo changes and practice mode features, support loop sections. Integrate with ScrollingTabDisplay component. Export class as Realtimeparser with methods streamData(), syncWithPlayback(), bufferNextMeasures()

## CREATE: formatConverterParser

Type: parser
Path: src/modules/notation/parsers/formatConverterParser
Description: Convert between Guitar Pro formats and internal display format using AlphaTab. Convert AlphaTab GP data to TabMeasure format for components, handle GP file formats (GPX, GP5, GP4, GP3), convert to MJTF format when needed, export for ScrollingTabDisplay and SVGTabDisplay components. Support format conversion for different display modes, maintain guitar-specific data (tuning, capo, techniques). Export class as Formatconverterparser with methods convertGPToTabMeasure(), exportToMJTF(), prepareForDisplay()

## Integration Requirements

All parsers must work with existing ScrollingTabDisplay.tsx component imports, support TabMeasure interface from @/lib/tab-parsers/basicTabParser, integrate with usePlaybackControls hook for audio sync, use @coderline/alphatab library for Guitar Pro parsing, focus on guitar tablature display, support Rock/Metal/Country/Blues/Worship genres.
