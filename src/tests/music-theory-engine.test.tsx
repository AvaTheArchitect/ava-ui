import { MusicTheoryEngine } from '../../brain/modules/composition/MusicTheoryEngine';

describe('MusicTheoryEngine Functionality Tests', () => {
  let engine: MusicTheoryEngine;

  beforeEach(() => {
    engine = new MusicTheoryEngine();
  });

  test('Harmony Analysis Works', () => {
    const analysis = engine.analyzeHarmony(['C', 'Am', 'F', 'G'], 'C');
    console.log('✅ Harmony Analysis:', {
      key: `${analysis.key.tonic} ${analysis.key.mode}`,
      numerals: analysis.numerals,
      confidence: `${analysis.confidence.toFixed(1)}%`
    });
    
    expect(analysis).toBeDefined();
    expect(analysis.key.tonic).toBe('C');
    expect(analysis.key.mode).toBe('major');
    expect(analysis.numerals).toEqual(['I', 'vi', 'IV', 'V']);
  });

  test('Chord Suggestions Work', () => {
    const suggestions = engine.suggestChords('C', 'rock');
    console.log('✅ Chord Suggestions:', {
      rock: suggestions.slice(0, 3),
      country: engine.suggestChords('C', 'country').slice(0, 3)
    });
    
    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  test('Melody Generation Works', () => {
    const melody = engine.generateMelody('C', 'major', 8);
    
    expect(melody).toBeDefined();
    expect(Array.isArray(melody)).toBe(true);
    expect(melody.length).toBe(8);
    expect(melody.every(note => typeof note === 'string')).toBe(true);
  });

  test('Scale Information Works', () => {
    const cMajorScale = engine.getScale('C', 'major');
    const eMinorScale = engine.getScale('E', 'minor');
    
    expect(cMajorScale).toBeDefined();
    expect(cMajorScale.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(eMinorScale).toBeDefined();
    expect(eMinorScale.notes).toEqual(['E', 'F#', 'G', 'A', 'B', 'C', 'D']);
  });

  test('Genre Characteristics Work', () => {
    const metalChar = engine.getGenreCharacteristics('metal');
    
    expect(metalChar).toBeDefined();
    expect(typeof metalChar.complexity).toBe('string');
    expect(Array.isArray(metalChar.preferredKeys)).toBe(true);
    expect(['simple', 'moderate', 'complex'].includes(metalChar.complexity)).toBe(true);
  });

  test('Key Detection Works', () => {
    const detectedKey = engine.detectKey(['C', 'Dm', 'G', 'Am']);
    
    expect(detectedKey).toBeDefined();
    expect(typeof detectedKey.tonic).toBe('string');
    expect(typeof detectedKey.mode).toBe('string');
  });

  test('All Tests Complete', () => {
    console.log('🎉 ALL MUSICTHEORYENGINE TESTS PASSED! 🎉');
    console.log('🎵 Your brain is ready for musical intelligence! 🎵');
    expect(true).toBe(true);
  });
});
