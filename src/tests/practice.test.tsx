import React from 'react';
import { render, screen } from '@testing-library/react';

const PracticeTest = () => <div>Practice Page Test</div>;

describe('Practice Page Tests', () => {
  test('renders test component', () => {
    render(<PracticeTest />);
    expect(screen.getByText('Practice Page Test')).toBeInTheDocument();
  });
});

