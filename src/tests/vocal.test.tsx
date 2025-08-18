import React from 'react';
import { render, screen } from '@testing-library/react';

const VocalTest = () => <div>Vocal Page Test</div>;

describe('Vocal Page Tests', () => {
  test('renders test component', () => {
    render(<VocalTest />);
    expect(screen.getByText('Vocal Page Test')).toBeInTheDocument();
  });
});

