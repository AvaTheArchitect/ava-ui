export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    diatonic: [0, 2, 4, 5, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    blues: [0, 3, 5, 6, 7, 10],
    pentatonic: [0, 2, 4, 7, 9]
}

export function getScaleNotes(key: string, scale: string, mode?: string): string[] {
    const keyIndex = NOTES.indexOf(key)
    if (keyIndex === -1) return []

    const scaleKey = scale.toLowerCase()
    const scalePattern = SCALES[scaleKey as keyof typeof SCALES] || SCALES.major

    return scalePattern.map(interval => {
        const noteIndex = (keyIndex + interval) % 12
        return NOTES[noteIndex]
    })
}