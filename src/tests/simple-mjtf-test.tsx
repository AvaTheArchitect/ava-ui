// 🎸 Simple MJTF Test Component
// Place this in: /src/tests/simple-mjtf-test.tsx

'use client';

import React, { useState } from 'react';
import { MJTFConverter, MJTFSong, MJTFTrack } from '@/modules/notation/parsers/mjtfConverter';

export const SimpleMJTFTest: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [song, setSong] = useState<MJTFSong | null>(null);

  const testPoisonConversion = async () => {
    setLoading(true);
    setResult('🎸 Starting Poison song conversion...\n');

    try {
      // Test the conversion
      const mjtfSong = await MJTFConverter.convertPoisonSongFromFiles();
      
      setSong(mjtfSong);
      setResult(prev => prev + '✅ Conversion successful!\n');
      setResult(prev => prev + `📊 Title: ${mjtfSong.title}\n`);
      setResult(prev => prev + `🎤 Artist: ${mjtfSong.artist}\n`);
      setResult(prev => prev + `♩ BPM: ${mjtfSong.bpm}\n`);
      setResult(prev => prev + `🎸 Tracks: ${mjtfSong.tracks.length}\n`);
      
      // Track details
      mjtfSong.tracks.forEach((track: MJTFTrack, index: number) => {
        setResult(prev => prev + `\nTrack ${index + 1}: ${track.name}\n`);
        setResult(prev => prev + `  - Difficulty: ${track.difficulty}\n`);
        setResult(prev => prev + `  - Measures: ${track.measures.length}\n`);
        setResult(prev => prev + `  - Techniques: ${track.techniques.join(', ')}\n`);
        
        // Count notes
        const totalNotes = track.measures.reduce((total: number, measure: any) => {
          return total + measure.beats.reduce((beatTotal: number, beat: any) => {
            return beatTotal + beat.notes.length;
          }, 0);
        }, 0);
        setResult(prev => prev + `  - Total Notes: ${totalNotes}\n`);
      });
      
      setResult(prev => prev + '\n🎉 Test completed successfully!');
      
    } catch (error) {
      console.error('MJTF Test Error:', error);
      setResult(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      
      // Debug info
      if (error instanceof Error && error.message.includes('Failed to load')) {
        setResult(prev => prev + '\n🔍 Debug: Check that these files exist:\n');
        setResult(prev => prev + '  - /data/sample-songs/real-songs/poison-i-wont-forget-you/metadata.json\n');
        setResult(prev => prev + '  - /data/sample-songs/real-songs/poison-i-wont-forget-you/timing.json\n');
        setResult(prev => prev + '  - /data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-1.txt\n');
        setResult(prev => prev + '  - /data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-2.txt\n');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveMJTF = async () => {
    if (!song) return;
    
    try {
      await MJTFConverter.saveMJTFSong(song, 'poison-test.mjtf.json');
      setResult(prev => prev + '\n💾 MJTF file saved as poison-test.mjtf.json');
    } catch (error) {
      setResult(prev => prev + `\n❌ Save error: ${error}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold text-green-400">🧪 MJTF Integration Test</h2>
        <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : song ? 'bg-green-400' : 'bg-gray-400'}`}></div>
      </div>
      
      <div className="flex gap-4 mb-4">
        <button
          onClick={testPoisonConversion}
          disabled={loading}
          className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 font-bold transition-colors"
        >
          {loading ? '⏳ Testing...' : '🎸 Test Poison Conversion'}
        </button>
        
        {song && (
          <button
            onClick={saveMJTF}
            className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 font-bold transition-colors"
          >
            💾 Save MJTF File
          </button>
        )}
      </div>

      {result && (
        <div className="bg-gray-900/80 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-2">📋 Test Results:</h3>
          <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-auto max-h-96">
            {result}
          </pre>
        </div>
      )}

      {song && (
        <div className="mt-6 bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
          <h3 className="text-lg font-bold text-purple-400 mb-2">🎵 Song Data Preview:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-green-400 font-bold">Basic Info:</div>
              <div className="text-gray-300">
                • {song.title} by {song.artist}<br/>
                • {song.bpm} BPM, {song.timeSignature[0]}/{song.timeSignature[1]} time<br/>
                • Key: {song.key}<br/>
                • Difficulty: {song.difficulty}
              </div>
            </div>
            <div>
              <div className="text-orange-400 font-bold">Structure:</div>
              <div className="text-gray-300">
                • {song.tracks.length} tracks<br/>
                • {song.sections.length} sections<br/>
                • Audio: {song.sync.audioPath ? '✅' : '❌'}<br/>
                • Format: MJTF v1.0
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export for easy importing
export default SimpleMJTFTest;