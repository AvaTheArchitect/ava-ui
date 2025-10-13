// 🧪 MJTF Test File - Verify Integration
// Place this in: /src/tests/test-mjtf.tsx

import React from 'react';
import { MJTFConverter, MJTFSong, MJTFTrack } from '@/modules/notation/parsers/mjtfConverter';

// Test function to verify MJTF conversion works
export async function testMJTFIntegration(): Promise<void> {
  console.log('🎸 Starting MJTF integration test...');

  try {
    // Test 1: Load and convert Poison song
    console.log('📁 Test 1: Loading Poison song from files...');
    const poisonSong = await MJTFConverter.convertPoisonSongFromFiles();

    console.log('✅ Poison song loaded successfully!');
    console.log('📊 Song details:', {
      title: poisonSong.title,
      artist: poisonSong.artist,
      bpm: poisonSong.bpm,
      tracks: poisonSong.tracks.length,
      measures: poisonSong.tracks[0]?.measures.length || 0
    });

    // Test 2: Validate MJTF structure
    console.log('🔍 Test 2: Validating MJTF structure...');
    const isValid = validateMJTFStructure(poisonSong);

    if (isValid) {
      console.log('✅ MJTF structure is valid!');
    } else {
      console.log('❌ MJTF structure validation failed');
      return;
    }

    // Test 3: Save MJTF file
    console.log('💾 Test 3: Saving MJTF file...');
    await MJTFConverter.saveMJTFSong(poisonSong, 'poison-test.mjtf.json');
    console.log('✅ MJTF file saved successfully!');

    // Test 4: Check track data
    console.log('🎸 Test 4: Analyzing track data...');
    poisonSong.tracks.forEach((track: MJTFTrack, index: number) => {
      console.log(`Track ${index + 1}: ${track.name}`);
      console.log(`  - Difficulty: ${track.difficulty}`);
      console.log(`  - Techniques: ${track.techniques.join(', ')}`);
      console.log(`  - Measures: ${track.measures.length}`);
      console.log(`  - Tuning: ${track.tuning.join('-')}`);

      // Count total notes
      const totalNotes = track.measures.reduce((total: number, measure: any) => {
        return total + measure.beats.reduce((beatTotal: number, beat: any) => {
          return beatTotal + beat.notes.length;
        }, 0);
      }, 0);
      console.log(`  - Total Notes: ${totalNotes}`);
    });

    console.log('🎉 All MJTF tests passed successfully!');

  } catch (error) {
    console.error('❌ MJTF test failed:', error);

    // Provide helpful debugging info
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    // Check if files exist
    console.log('🔍 Debugging: Checking file paths...');
    try {
      const metadataCheck = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/metadata.json');
      console.log('Metadata file status:', metadataCheck.status);

      const timingCheck = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/timing.json');
      console.log('Timing file status:', timingCheck.status);

      const guitar1Check = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-1.txt');
      console.log('Guitar-1 file status:', guitar1Check.status);

      const guitar2Check = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-2.txt');
      console.log('Guitar-2 file status:', guitar2Check.status);
    } catch (fileError) {
      console.error('File check failed:', fileError);
    }
  }
}

// Simple MJTF structure validation
function validateMJTFStructure(song: MJTFSong): boolean {
  // Check required fields
  if (!song.title || typeof song.title !== 'string') {
    console.error('Invalid title');
    return false;
  }

  if (!song.artist || typeof song.artist !== 'string') {
    console.error('Invalid artist');
    return false;
  }

  if (!song.bpm || typeof song.bpm !== 'number') {
    console.error('Invalid BPM');
    return false;
  }

  if (!Array.isArray(song.tracks) || song.tracks.length === 0) {
    console.error('Invalid tracks');
    return false;
  }

  // Check each track
  for (let i = 0; i < song.tracks.length; i++) {
    const track = song.tracks[i];

    if (!track.name || typeof track.name !== 'string') {
      console.error(`Invalid track ${i} name`);
      return false;
    }

    if (!Array.isArray(track.measures)) {
      console.error(`Invalid track ${i} measures`);
      return false;
    }

    if (!Array.isArray(track.tuning) || track.tuning.length !== 6) {
      console.error(`Invalid track ${i} tuning`);
      return false;
    }
  }

  // Check sync data
  if (!song.sync || !song.sync.audioPath) {
    console.error('Invalid sync data');
    return false;
  }

  return true;
}

// React component for testing in the browser
export const MJTFTestComponent: React.FC = () => {
  const [testResult, setTestResult] = React.useState<string>('');
  const [isRunning, setIsRunning] = React.useState<boolean>(false);

  const runTest = async () => {
    setIsRunning(true);
    setTestResult('Running MJTF tests...\n');

    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;

    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };
    console.error = (...args) => {
      output += 'ERROR: ' + args.join(' ') + '\n';
      originalError(...args);
    };

    try {
      await testMJTFIntegration();
    } catch (error) {
      output += `FATAL ERROR: ${error}\n`;
    }

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    setTestResult(output);
    setIsRunning(false);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 m-4">
      <h2 className="text-xl font-bold text-green-400 mb-4">🧪 MJTF Integration Test</h2>

      <button
        onClick={runTest}
        disabled={isRunning}
        className="px-4 py-2 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 mb-4"
      >
        {isRunning ? '⏳ Running Tests...' : '🚀 Run MJTF Tests'}
      </button>

      {testResult && (
        <div className="bg-gray-900 rounded p-4 font-mono text-sm">
          <pre className="text-gray-300 whitespace-pre-wrap">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

// Usage in your test page:
/*
import { MJTFTestComponent } from '@/src/test-mjtf';

// Add this to your test page
<MJTFTestComponent />
*/