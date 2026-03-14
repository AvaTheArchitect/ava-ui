// src/lib/song-data/index.ts

/**
 * Song Data — Export Barrel
 * November 21st, 2025 | Updated March 14th, 2026
 *
 * Centralizes all exports from song-data module.
 * Simplifies imports and resolves TypeScript path issues.
 */

// Export all types
export * from "./types";

// Export all database constants
export * from "./songDatabase";

// Export all utility functions
export * from "./songLoader";

// Export canonical genre + tuning data
export * from "./genres";
export * from "./tunings";
