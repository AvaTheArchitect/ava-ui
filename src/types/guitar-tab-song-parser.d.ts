declare module "guitar-tab-song-parser" {
  export interface ParsedChord {
    name: string;
    frets: string;
    fingering?: string;
  }

  export interface ParsedSong {
    title?: string;
    artist?: string;
    chords: ParsedChord[];
    tabs?: string[];
  }

  export class ChordParser {
    constructor();
    parse(input: string): ParsedChord[];
  }
}
