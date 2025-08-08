import {
  TabParser,
  parseASCIITab,
  parseSongsterr,
  SongsterrJsonData,
  ParsedTab,
} from "./tabParser";

describe("TabParser", () => {
  test("parses ASCII tablature", () => {
    const asciiTab = `
Title: Test Song
Artist: Test Artist

e|--0--2--3--|
B|--1--3--0--|
G|--0--2--0--|
D|--2--0--0--|
A|--3--------| 
E|-----------|
        `;

    const result = parseASCIITab(asciiTab);

    expect(result.title).toBe("Test Song");
    expect(result.artist).toBe("Test Artist");
    expect(result.measures).toHaveLength(1);
    expect(result.measures[0].notes.length).toBeGreaterThan(0);
  });

  test("parses Songsterr JSON format", () => {
    const songsterrData: SongsterrJsonData = {
      meta: {
        title: "Test Song",
        artist: "Test Artist",
        tempo: 120,
        timeSignature: [4, 4] as [number, number],
      },
      tracks: [
        {
          id: "track1",
          name: "Guitar",
          instrument: "Electric Guitar",
          strings: 6,
        },
      ],
      measures: [
        {
          number: 1,
          notes: [
            {
              time: 0,
              duration: 0.25,
              string: 0,
              fret: 0,
              velocity: 100,
            },
          ],
        },
      ],
    };

    const result = parseSongsterr(songsterrData);

    expect(result.title).toBe("Test Song");
    expect(result.tracks).toHaveLength(1);
    expect(result.measures).toHaveLength(1);
  });

  test("converts to MIDI events", () => {
    const parsedTab: ParsedTab = {
      title: "Test",
      artist: "Test",
      tuning: ["E", "A", "D", "G", "B", "E"],
      tempo: 120,
      timeSignature: [4, 4] as [number, number],
      tracks: [
        {
          id: "track1",
          name: "Guitar",
          instrument: "Guitar",
          channel: 0,
          strings: 6,
          tuning: [40, 45, 50, 55, 59, 64],
        },
      ],
      measures: [
        {
          number: 1,
          notes: [
            {
              time: 0,
              duration: 0.5,
              string: 0,
              fret: 3,
              velocity: 100,
            },
          ],
        },
      ],
    };

    const midiEvents = TabParser.toMIDIEvents(parsedTab);

    expect(midiEvents).toHaveLength(2); // noteOn and noteOff
    expect(midiEvents[0].type).toBe("noteOn");
    expect(midiEvents[1].type).toBe("noteOff");
  });

  test("exports to ASCII format", () => {
    const parsedTab: ParsedTab = {
      title: "Test Song",
      artist: "Test Artist",
      tuning: ["E", "A", "D", "G", "B", "E"],
      tempo: 120,
      timeSignature: [4, 4] as [number, number],
      tracks: [],
      measures: [
        {
          number: 1,
          notes: [
            {
              time: 0,
              duration: 0.25,
              string: 0,
              fret: 3,
              velocity: 100,
              techniques: [],
            },
          ],
        },
      ],
    };

    const asciiOutput = TabParser.exportToASCII(parsedTab);

    expect(asciiOutput).toContain("Title: Test Song");
    expect(asciiOutput).toContain("Artist: Test Artist");
    expect(asciiOutput).toContain("3"); // The fret number
  });

  test("validates parsed tab data", () => {
    const validTab: ParsedTab = {
      title: "Valid Song",
      artist: "Valid Artist",
      tuning: ["E", "A", "D", "G", "B", "E"],
      tempo: 120,
      timeSignature: [4, 4] as [number, number],
      tracks: [
        {
          id: "track1",
          name: "Guitar",
          instrument: "Guitar",
          channel: 0,
          strings: 6,
          tuning: [40, 45, 50, 55, 59, 64],
        },
      ],
      measures: [
        {
          number: 1,
          notes: [
            {
              time: 0,
              duration: 0.25,
              string: 0,
              fret: 3,
              velocity: 100,
              techniques: [],
            },
          ],
        },
      ],
    };

    const validation = TabParser.validate(validTab);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("detects invalid tab data", () => {
    const invalidTab: ParsedTab = {
      title: "",
      artist: "Test Artist",
      tuning: ["E", "A", "D", "G", "B", "E"],
      tempo: 500, // Invalid tempo
      timeSignature: [4, 4] as [number, number],
      tracks: [], // No tracks
      measures: [
        {
          number: 1,
          notes: [
            {
              time: 0,
              duration: 0.25,
              string: 10, // Invalid string
              fret: 50, // Invalid fret
              velocity: 100,
              techniques: [],
            },
          ],
        },
      ],
    };

    const validation = TabParser.validate(invalidTab);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test("parses chord symbols", () => {
    const chordText = "Am C F G Em Dm7 G/B";
    const chords = TabParser.parseChords(chordText);

    expect(chords).toContain("Am");
    expect(chords).toContain("C");
    expect(chords).toContain("F");
    expect(chords).toContain("G");
    expect(chords).toContain("Dm7");
    expect(chords).toContain("G/B");
  });
});
