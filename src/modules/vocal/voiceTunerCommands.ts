// src/modules/voiceTunerCommands.ts
export function initTunerVoice(
  recognition: any,
  toggler: (active: boolean) => void
): void {
  recognition.onresult = (event: any) => {
    const spoken = event.results[0][0].transcript.toLowerCase();
    if (spoken.includes("activate tuner")) toggler(true);
    if (spoken.includes("close tuner")) toggler(false);
    if (spoken.includes("tune guitar")) toggler(true);
  };
}
