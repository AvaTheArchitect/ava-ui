
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioController } from './audio-controller';

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
        createGain: () => ({
            connect: jest.fn(),
            gain: { value: 1 }
        }),
        destination: {},
        currentTime: 0
    }))
});

describe('AudioController', () => {
    test('renders playback controls', () => {
        render(<AudioController />);
        expect(screen.getByText('▶️')).toBeInTheDocument();
    });

    test('toggles play/pause on button click', async () => {
        const mockOnPlaybackStateChange = jest.fn();
        render(<AudioController onPlaybackStateChange={mockOnPlaybackStateChange} />);

        const playButton = screen.getByText('▶️');
        fireEvent.click(playButton);

        await waitFor(() => {
            expect(mockOnPlaybackStateChange).toHaveBeenCalledWith(true);
        });
    });

    test('updates playback rate', () => {
        render(<AudioController />);
        const speedSlider = screen.getByDisplayValue('1');

        fireEvent.change(speedSlider, { target: { value: '1.5' } });
        expect(screen.getByText('Speed: 1.5x')).toBeInTheDocument();
    });
});
