declare module "guitar-js" {
  interface ChordConfig {
    title?: string;
    chord: Array<{
      fret: number | undefined;
      string: number;
    }>;
    position?: number;
    barres?: number[];
    statusString?: Array<"open" | "closed" | null>;
  }

  interface Guitar {
    chord(container: HTMLElement | null, config: ChordConfig): void;
  }

  const guitar: Guitar;
  export default guitar;
}
