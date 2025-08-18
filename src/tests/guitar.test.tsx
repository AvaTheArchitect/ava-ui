import React from 'react';
import { render, screen } from '@testing-library/react';

const GuitarTest = () => <div>Guitar Page Test</div>;

describe('Guitar Page Tests', () => {
  test('renders test component', () => {
    render(<GuitarTest />);
    expect(screen.getByText('Guitar Page Test')).toBeInTheDocument();
  });
});

