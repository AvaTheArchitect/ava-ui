// ✅ Fixed with proper TypeScript types
export interface VoiceToggles {
  toggleContrast: () => void;
  toggleVoice: () => void;
  toggleAudioHints: () => void;
}

export function handleVoiceAccessibilityCommand(
  phrase: string,
  toggles: VoiceToggles
): void {
  if (phrase.includes("contrast")) toggles.toggleContrast();
  if (phrase.includes("voice confirm")) toggles.toggleVoice();
  if (phrase.includes("audio hint")) toggles.toggleAudioHints();
}
