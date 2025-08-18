import React from 'react';
import { render, screen } from '@testing-library/react';

const TheoryTest = () => <div>Theory Page Test</div>;

describe('Theory Page Tests', () => {
  test('renders test component', () => {
    render(<TheoryTest />);
    expect(screen.getByText('Theory Page Test')).toBeInTheDocument();
  });
});

