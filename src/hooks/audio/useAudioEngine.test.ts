
import { renderHook, act } from '@testing-library/react';
import { useAudioEngine } from './useAudioEngine';

// Mock Web Audio API
const mockAudioContext = {
    createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: { value: 1, setValueAtTime: jest.fn() }
    })),
    createBufferSource: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null,
        loop: false
    })),
    createBiquadFilter: jest.fn(() => ({
        connect: jest.fn(),
        type: 'lowpass',
        frequency: { value: 1000 },
        Q: { value: 1 }
    })),
    createDelay: jest.fn(() => ({
        connect: jest.fn(),
        delayTime: { value: 0.3 }
    })),
    decodeAudioData: jest.fn(),
    destination: {},
    currentTime: 0,
    state: 'suspended',
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn()
};

Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: jest.fn(() => mockAudioContext)
});

describe('useAudioEngine', () => {
    test('initializes audio engine', async () => {
        const { result } = renderHook(() => useAudioEngine());
        
        await act(async () => {
            await result.current.initializeAudioEngine();
        });

        expect(result.current.isInitialized).toBe(true);
        expect(result.current.context).toBeTruthy();
    });

    test('sets master volume', async () => {
        const { result } = renderHook(() => useAudioEngine());
        
        await act(async () => {
            await result.current.initializeAudioEngine();
            result.current.setMasterVolume(0.5);
        });

        expect(result.current.volume).toBe(0.5);
    });

    test('creates audio nodes', async () => {
        const { result } = renderHook(() => useAudioEngine());
        
        await act(async () => {
            await result.current.initializeAudioEngine();
        });

        const gainNode = result.current.createGainNode();
        expect(gainNode).toBeTruthy();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
});
        