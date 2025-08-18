import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestAudioController } from './TestAudioController';

// 🎸 Tests for TestAudioController
// Module type: component
describe('TestAudioController', () => {
  test('renders without crashing', () => {
    render(<TestAudioController />);
    expect(screen.getByTestId('testaudiocontroller')).toBeInTheDocument();
  });

  test('displays component name', () => {
    render(<TestAudioController />);
    expect(screen.getByText('🎸 TestAudioController')).toBeInTheDocument();
  });

  test('handles start/stop actions', () => {
    const mockAction = jest.fn();
    render(<TestAudioController onAction={mockAction} />);
    
    const startButton = screen.getByText(/start TestAudioController/i);
    fireEvent.click(startButton);
    
    expect(mockAction).toHaveBeenCalledWith('start');
    expect(screen.getByText(/stop TestAudioController/i)).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const customClass = 'custom-test-class';
    render(<TestAudioController className={customClass} />);
    
    const element = screen.getByTestId('testaudiocontroller');
    expect(element).toHaveClass(customClass);
  });




  test('controls audio loop', () => {
    const mockAction = jest.fn();
    render(<TestAudioController onAction={mockAction} />);
    
    const loopButton = screen.getByText(/start loop/i);
    fireEvent.click(loopButton);
    
    expect(mockAction).toHaveBeenCalledWith('loop-on');
  });

  test('handles recording toggle', () => {
    const mockAction = jest.fn();
    render(<TestAudioController onAction={mockAction} />);
    
    const recordButton = screen.getByText(/start recording/i);
    fireEvent.click(recordButton);
    
    expect(mockAction).toHaveBeenCalledWith('record-start');
    expect(screen.getByText(/recording in progress/i)).toBeInTheDocument();
  });
});