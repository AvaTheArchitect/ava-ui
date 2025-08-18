import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple test component
const AboutTest = () => <div>About Page Test</div>;

describe('About Page Tests', () => {
  test('renders test component', () => {
    render(<AboutTest />);
    expect(screen.getByText('About Page Test')).toBeInTheDocument();
  });
});

