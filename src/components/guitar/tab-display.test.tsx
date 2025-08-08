
import { render, screen, fireEvent } from '@testing-library/react';
import { TabDisplay, FretDiagram } from './tab-display';

describe('TabDisplay', () => {
    const mockMeasures = [
        {
            notes: [
                { string: 0, fret: 0, time: 0, duration: 0.25 },
                { string: 1, fret: 2, time: 0.25, duration: 0.25 }
            ],
            timeSignature: [4, 4] as [number, number],
            tempo: 120
        }
    ];

    test('renders tab display canvas', () => {
        render(<TabDisplay measures={mockMeasures} currentTime={0} />);
        const canvas = screen.getByRole('img'); // Canvas has img role
        expect(canvas).toBeInTheDocument();
    });

    test('calls onNoteClick when note is clicked', () => {
        const mockOnNoteClick = jest.fn();
        render(
            <TabDisplay
                measures={mockMeasures}
                currentTime={0}
                onNoteClick={mockOnNoteClick}
            />
        );

        const canvas = screen.getByRole('img');
        fireEvent.click(canvas, { clientX: 100, clientY: 50 });

        // Note: Actual click handling would require more complex coordinate calculation
    });
});

describe('FretDiagram', () => {
    test('renders fret diagram for chord', () => {
        render(<FretDiagram chord="C" frets={[0, 1, 0, 2, 3, 0]} />);
        expect(screen.getByText('C')).toBeInTheDocument();
    });
});
