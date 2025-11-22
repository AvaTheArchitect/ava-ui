// src/lib/song-data/songDatabase.ts

/**
 * Song Database - November 21st, 2025
 *
 * Hardcoded song data for initial implementation.
 * Future: Auto-scan /public/data/sample-songs/real-songs/ folder
 *
 * Updated with actual Guitar Pro filenames (Nov 21st)
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
    isFavorite: true, // Default favorite (current song)
  },
  {
    id: "cinderella-hot-and-bothered",
    title: "Hot and Bothered",
    artist: "Cinderella",
    album: "Night Songs",
    fileUrl: `${BASE_PATH}/cinderella-hot-and-bothered/cinderella-hot-and-bothered.gp5`,
    difficulty: 2,
    isFavorite: false,
  },
  {
    id: "poison-i-wont-forget-you",
    title: "I Won't Forget You",
    artist: "Poison",
    album: "Look What the Cat Dragged In",
    fileUrl: `${BASE_PATH}/poison-i-wont-forget-you/guitar-1.gp4`,
    difficulty: 2,
    isFavorite: false,
  },
  {
    id: "poison-so-tell-me-why",
    title: "So Tell Me Why",
    artist: "Poison",
    album: "Open Up and Say... Ahh!",
    fileUrl: `${BASE_PATH}/poison-so-tell-me-why/Poison - So Tell Me Why.gp5`,
    difficulty: 2,
    isFavorite: false,
  },
  {
    id: "srv-pride-and-joy",
    title: "Pride and Joy",
    artist: "Stevie Ray Vaughan",
    album: "Texas Flood",
    fileUrl: `${BASE_PATH}/srv-pride-and-joy/Stevie Ray Vaughan & Double Trouble - Pride And Joy (ver 2 by joshscus).gp5`,
    difficulty: 4,
    isFavorite: false,
  },
  {
    id: "vanhalen-aint-talking-bout-love",
    title: "Ain't Talkin' 'Bout Love",
    artist: "Van Halen",
    album: "Van Halen",
    fileUrl: `${BASE_PATH}/vanhalen-aint-talking-bout-love/Van Halen - Aint Talkin Bout Love (ver 6 by DominoJachas).gpx`,
    difficulty: 3,
    isFavorite: false,
  },
  {
    id: "warrant-uncle-toms-cabin",
    title: "Uncle Tom's Cabin",
    artist: "Warrant",
    album: "Cherry Pie",
    fileUrl: `${BASE_PATH}/warrant-uncle-toms-cabin/Warrant - Uncle Toms Cabin (ver 3 by Al Ferrara).gp5`,
    difficulty: 3,
    isFavorite: false,
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
