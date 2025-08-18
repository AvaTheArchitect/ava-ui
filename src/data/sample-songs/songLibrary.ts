// 🎸 Maestro.ai Song Library
// Sample songs for testing SVG Tab Display

export interface SongData {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  timeSignature: [number, number];
  tabData: string;
  chordProgression?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  genre: string;
  duration: number; // in seconds
}

// 🎵 Real Guitar Songs for Testing
export const SONG_LIBRARY: SongData[] = [
  {
    id: "wonderwall-intro",
    title: "Wonderwall (Intro)",
    artist: "Oasis",
    bpm: 87,
    timeSignature: [4, 4],
    difficulty: "Beginner",
    genre: "Rock",
    duration: 16,
    chordProgression: "Em7 G D C | Em7 G D C",
    tabData: `
E|--3--3--3--3--|--3--3--3--3--|--0--0--0--0--|--0--0--0--0--|
B|--3--3--3--3--|--3--3--3--3--|--1--1--1--1--|--1--1--1--1--|
G|--0--0--0--0--|--0--0--0--0--|--0--0--0--0--|--0--0--0--0--|
D|--0--0--0--0--|--2--2--2--2--|--2--2--2--2--|--2--2--2--2--|
A|--2--2--2--2--|--3--3--3--3--|--3--3--3--3--|--3--3--3--3--|
E|--3--3--3--3--|--x--x--x--x--|--x--x--x--x--|--x--x--x--x--|`,
  },

  {
    id: "smoke-on-water",
    title: "Smoke on the Water (Main Riff)",
    artist: "Deep Purple",
    bpm: 112,
    timeSignature: [4, 4],
    difficulty: "Beginner",
    genre: "Rock",
    duration: 8,
    tabData: `
E|--0--3--5--|--0--3--6--5--|--0--3--5--|--3--0--|
B|-----------|--------------|-----------|--------|
G|-----------|--------------|-----------|--------|
D|-----------|--------------|-----------|--------|
A|-----------|--------------|-----------|--------|
E|-----------|--------------|-----------|--------|`,
  },

  {
    id: "stairway-intro",
    title: "Stairway to Heaven (Intro)",
    artist: "Led Zeppelin",
    bpm: 72,
    timeSignature: [4, 4],
    difficulty: "Intermediate",
    genre: "Rock",
    duration: 16,
    tabData: `
E|--0--2--3--|--2--0-----|--0--2--3--|--2--0-----|
B|--1--1--1--|--1--1--3--|--1--1--1--|--1--1--3--|
G|--0--0--0--|--0--0--0--|--0--0--0--|--0--0--0--|
D|--2--2--2--|--2--2--2--|--2--2--2--|--2--2--2--|
A|--3--3--3--|--3--3--3--|--3--3--3--|--3--3--3--|
E|-----------|-----------|-----------|-----------|`,
  },

  {
    id: "blackbird",
    title: "Blackbird",
    artist: "The Beatles",
    bpm: 96,
    timeSignature: [4, 4],
    difficulty: "Advanced",
    genre: "Folk Rock",
    duration: 12,
    tabData: `
E|--0--3--0--|--0--1--0--|--0--3--0--|--0--1--0--|
B|--1--1--1--|--1--1--1--|--1--1--1--|--1--1--1--|
G|--0--0--0--|--2--2--2--|--0--0--0--|--2--2--2--|
D|--2--2--2--|--3--3--3--|--2--2--2--|--3--3--3--|
A|--3--3--3--|--3--3--3--|--3--3--3--|--3--3--3--|
E|-----------|-----------|-----------|-----------|`,
  },

  {
    id: "test-progression",
    title: "Guitar Practice Test",
    artist: "Maestro.ai",
    bpm: 120,
    timeSignature: [4, 4],
    difficulty: "Beginner",
    genre: "Practice",
    duration: 16,
    tabData: `
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
B|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
G|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
D|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
A|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|`,
  },
];

// 🎯 Easy access functions
export const getSongById = (id: string): SongData | undefined => {
  return SONG_LIBRARY.find((song) => song.id === id);
};

export const getSongsByDifficulty = (
  difficulty: SongData["difficulty"]
): SongData[] => {
  return SONG_LIBRARY.filter((song) => song.difficulty === difficulty);
};

export const getSongsByGenre = (genre: string): SongData[] => {
  return SONG_LIBRARY.filter((song) => song.genre === genre);
};

// 🎸 Default song for testing
export const DEFAULT_TEST_SONG = SONG_LIBRARY[4]; // test-progression
