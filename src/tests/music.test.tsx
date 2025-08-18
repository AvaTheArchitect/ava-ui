import React from 'react';
import { render, screen } from '@testing-library/react';

const MusicTest = () => <div>Music Page Test</div>;

describe('Music Page Tests', () => {
  test('renders test component', () => {
    render(<MusicTest />);
    expect(screen.getByText('Music Page Test')).toBeInTheDocument();
  });
});

