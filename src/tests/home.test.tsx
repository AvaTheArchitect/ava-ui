import React from 'react';
import { render, screen } from '@testing-library/react';

const HomeTest = () => <div>Home Page Test</div>;

describe('Home Page Tests', () => {
  test('renders test component', () => {
    render(<HomeTest />);
    expect(screen.getByText('Home Page Test')).toBeInTheDocument();
  });
});

