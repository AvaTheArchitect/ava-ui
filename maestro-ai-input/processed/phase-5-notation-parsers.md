# Phase 5: Notation Parsers - Music Staff & Chord Symbols

## Update: Notation System Integration

Add comprehensive music notation parsing capabilities:

- Parse standard music notation (treble/bass clef, time signatures, key signatures)
- Extract chord symbols and progressions from sheet music
- Detect guitar techniques (palm muting, vibrato, bends, slides, hammer-ons, pull-offs)
- Convert between different notation formats (ASCII tabs, MusicXML, Guitar Pro)
- Real-time parsing for live music input and display

## Create Files:

- src/notation/parsers/staffNotationParser.ts - Music staff parsing with clef detection
- src/notation/parsers/chordSymbolParser.ts - Chord name parsing and progression analysis
- src/notation/parsers/techniqueParser.ts - Guitar technique symbol parsing (PM, vibrato, bends)
- src/notation/parsers/rhythmNotationParser.ts - Time signatures, rests, and beat analysis
- src/notation/parsers/index.ts - Export all notation parsers
- src/types/notation/notationTypes.ts - TypeScript interfaces for notation data
- src/utils/notation/notationUtils.ts - Notation conversion and validation utilities

## Requirements:

- Create comprehensive notation parsing system for guitar practice app
- Support standard music notation elements (clefs, time signatures, key signatures)
- Parse chord symbols (Am7, G/B, F#dim) with position tracking
- Detect guitar-specific techniques with proper symbols (PM, ~~~~~, 12b14, 5h7, 7p5)
- Handle rhythm notation including time signatures, rests, and beat divisions
- Provide TypeScript interfaces for all notation data structures
- Include utilities for notation format conversion and validation
- Generate comprehensive tests for all parsing functionality
- Create new directories: src/notation/parsers/, src/types/notation/, src/utils/notation/
- Update index.ts files for proper exports
- Integrate with existing ScrollingTabDisplay for real-time notation display
