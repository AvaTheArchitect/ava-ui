
import { render, screen } from '@testing-library/react';
import { ChordOverlay, getChordInfo } from './chord-overlay';

describe('ChordOverlay', () => {
    const mockChord = {
        name: 'C Major',
        frets: [0, 1, 0, 2, 3, 0],
        fingers: [0, 1, 0, 2, 3, 0],
        difficulty: 'beginner' as const
    };

    test('renders when visible', () => {
        render(
            <ChordOverlay
                chord={mockChord}
                position={{ x: 100, y: 100 }}
                visible={true}
            />
        );
        expect(screen.getByText('C Major')).toBeInTheDocument();
    });

    test('does not render when not visible', () => {
        render(
            <ChordOverlay
                chord={mockChord}
                position={{ x: 100, y: 100 }}
                visible={false}
            />
        );
        expect(screen.queryByText('C Major')).not.toBeInTheDocument();
    });
});

describe('getChordInfo', () => {
    test('returns chord info for known chord', () => {
        const chordInfo = getChordInfo('C');
        expect(chordInfo).toBeTruthy();
        expect(chordInfo?.name).toBe('C Major');
    });

    test('returns null for unknown chord', () => {
        const chordInfo = getChordInfo('UnknownChord');
        expect(chordInfo).toBeNull();
    });
});
