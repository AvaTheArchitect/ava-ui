
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackIsolator } from './track-isolator';

describe('TrackIsolator', () => {
    const mockTracks = [
        {
            id: 'track1',
            name: 'Guitar',
            instrument: 'Electric Guitar',
            gain: 1,
            muted: false,
            solo: false
        },
        {
            id: 'track2',
            name: 'Bass',
            instrument: 'Bass Guitar',
            gain: 0.8,
            muted: false,
            solo: false
        }
    ];

    test('renders track controls', () => {
        render(<TrackIsolator tracks={mockTracks} />);
        expect(screen.getByText('Guitar')).toBeInTheDocument();
        expect(screen.getByText('Bass')).toBeInTheDocument();
    });

    test('toggles mute on button click', () => {
        const mockOnTracksChange = jest.fn();
        render(<TrackIsolator tracks={mockTracks} onTracksChange={mockOnTracksChange} />);

        const muteButtons = screen.getAllByText('M');
        fireEvent.click(muteButtons[0]);

        expect(mockOnTracksChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: 'track1', muted: true })
            ])
        );
    });
});
