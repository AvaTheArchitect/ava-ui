// src/lib/song-data/songDatabase.ts

/**
 * Song Database - November 24th, 2025 - V95
 *
 * 🆕 V95 Changes:
 * - Added videoStartOffset to support videos with intros
 * - Added solo/playthrough variants for Ozzy and Extreme
 * - Updated Warrant video to embeddable version (CV60DjwQOyA)
 * 
 * 🎯 Songsterr Parity: Video offset synchronization
 * 
 * Hardcoded song data for initial implementation.
 * Future: Auto-scan /public/data/sample-songs/real-songs/ folder
 */

import { SongItem } from "./types";

const BASE_PATH = "/data/sample-songs/real-songs";

export const SONGS: SongItem[] = [
  {
    id: "ozzy-no-more-tears",
    title: "No More Tears",
    artist: "Ozzy Osbourne",
    album: "No More Tears",
    fileUrl: `${BASE_PATH}/ozzy-no-more-tears/ozzy-no-more-tears.gp3`,
    difficulty: 3,
    isFavorite: true,
    
    // ✅ VERIFIED: Multiple video variants available
    youtubeVideoId: "mX_8p7NaibQ", // Official Audio (default)
    youtubeVariants: {
      main: "mX_8p7NaibQ",        // Official Audio
      playthrough: "fiZsH6X2F_w",  // 🆕 V95: Guitar Playthrough
      backing: "JOaq-LiGGWs",      // Guitar backing track
      solo: "mX_8p7NaibQ",         // 🆕 V95: Same as main (placeholder)
    },
    videoStartOffset: 0, // Music starts immediately
  },
  {
    id: "cinderella-hot-and-bothered",
    title: "Hot and Bothered",
    artist: "Cinderella",
    album: "Night Songs",
    fileUrl: `${BASE_PATH}/cinderella-hot-and-bothered/cinderella-hot-and-bothered.gp5`,
    difficulty: 2,
    isFavorite: false,
    
    youtubeVideoId: "uDdATtV125Y", // Full Mix
    youtubeVariants: {
      main: "uDdATtV125Y",
    },
    videoStartOffset: 0,
  },
  {
    id: "poison-i-wont-forget-you",
    title: "I Won't Forget You",
    artist: "Poison",
    album: "Look What the Cat Dragged In",
    fileUrl: `${BASE_PATH}/poison-i-wont-forget-you/guitar-1.gp4`,
    difficulty: 2,
    isFavorite: false,
    
    youtubeVideoId: "RthGYtQ_dxA", // Full Mix
    youtubeVariants: {
      main: "RthGYtQ_dxA",
    },
    videoStartOffset: 0,
  },
  {
    id: "poison-so-tell-me-why",
    title: "So Tell Me Why",
    artist: "Poison",
    album: "Open Up and Say... Ahh!",
    fileUrl: `${BASE_PATH}/poison-so-tell-me-why/Poison - So Tell Me Why.gp5`,
    difficulty: 2,
    isFavorite: false,
    
    youtubeVideoId: "biNYufJRp1A", // Full Mix
    youtubeVariants: {
      main: "biNYufJRp1A",
    },
    videoStartOffset: 0,
  },
  {
    id: "srv-pride-and-joy",
    title: "Pride and Joy",
    artist: "Stevie Ray Vaughan",
    album: "Texas Flood",
    fileUrl: `${BASE_PATH}/srv-pride-and-joy/Stevie Ray Vaughan & Double Trouble - Pride And Joy (ver 2 by joshscus).gp5`,
    difficulty: 4,
    isFavorite: false,
    
    youtubeVideoId: "0vo23H9J8o8", // Full Mix (Live at Montreux)
    youtubeVariants: {
      main: "0vo23H9J8o8",
    },
    videoStartOffset: 0,
  },
  {
    id: "vanhalen-aint-talking-bout-love",
    title: "Ain't Talkin' 'Bout Love",
    artist: "Van Halen",
    album: "Van Halen",
    fileUrl: `${BASE_PATH}/vanhalen-aint-talking-bout-love/Van Halen - Aint Talkin Bout Love (ver 6 by DominoJachas).gpx`,
    difficulty: 3,
    isFavorite: false,
    
    youtubeVideoId: "qtwBFz6lfrY", // Full Mix
    youtubeVariants: {
      main: "qtwBFz6lfrY",
    },
    videoStartOffset: 0,
  },
  {
    id: "warrant-uncle-toms-cabin",
    title: "Uncle Tom's Cabin",
    artist: "Warrant",
    album: "Cherry Pie",
    fileUrl: `${BASE_PATH}/warrant-uncle-toms-cabin/Warrant - Uncle Toms Cabin (ver 3 by Al Ferrara).gp5`,
    difficulty: 3,
    isFavorite: false,
    
    // ✅ V95: NEW VIDEO ID (embeddable, per user request)
    youtubeVideoId: "CV60DjwQOyA",
    youtubeVariants: {
      main: "CV60DjwQOyA",
    },
    videoStartOffset: 0,
  },
  {
    id: "extreme-rise",
    title: "Rise",
    artist: "Extreme",
    album: "Extreme II: Pornograffitti",
    fileUrl: `${BASE_PATH}/extreme-rise/extreme-rise.gp5`,
    difficulty: 4,
    isFavorite: false,
    
    // ✅ V95: Multiple video variants
    youtubeVideoId: "iJ_AOIbj8AA", // Full Mix (default)
    youtubeVariants: {
      main: "iJ_AOIbj8AA",           // Full Mix
      solo: "v5Y7M5X_-SY",           // 🆕 V95: Solo guitar version
      playthrough: "iJ_AOIbj8AA",    // 🆕 V95: Playthrough (same as main for now)
    },
    
    // 🎯 CRITICAL: Video has intro, music starts at 4 seconds
    // This matches Songsterr's ?t=4 parameter
    // Measure 1 of the tab = 4 seconds into the YouTube video
    videoStartOffset: 4,
  },
];

// Default playlists
export const DEFAULT_PLAYLISTS = [
  {
    id: "playlist-1",
    name: "My Shred List",
    songIds: ["ozzy-no-more-tears", "srv-pride-and-joy"], // Ozzy + SRV
    createdAt: Date.now(),
  },
  {
    id: "playlist-2",
    name: "80s Hair Metal",
    songIds: [
      "poison-i-wont-forget-you",
      "poison-so-tell-me-why",
      "warrant-uncle-toms-cabin",
      "cinderella-hot-and-bothered",
    ],
    createdAt: Date.now(),
  },
];