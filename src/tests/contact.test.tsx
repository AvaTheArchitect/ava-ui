import React from 'react';
import { render, screen } from '@testing-library/react';

const ContactTest = () => <div>Contact Page Test</div>;

describe('Contact Page Tests', () => {
  test('renders test component', () => {
    render(<ContactTest />);
    expect(screen.getByText('Contact Page Test')).toBeInTheDocument();
  });
});

