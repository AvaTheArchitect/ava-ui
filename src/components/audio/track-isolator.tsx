
import React, { useState, useRef, useEffect } from 'react';

export interface Track {
    id: string;
    name: string;
    instrument: string;
    audioBuffer?: AudioBuffer;
    gain: number;
    muted: boolean;
    solo: boolean;
}

export interface TrackIsolatorProps {
    tracks: Track[];
    onTracksChange?: (tracks: Track[]) => void;
}

export const TrackIsolator: React.FC<TrackIsolatorProps> = ({
    tracks,
    onTracksChange
}) => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [masterGain, setMasterGain] = useState<GainNode | null>(null);
    const trackGainsRef = useRef<Map<string, GainNode>>(new Map());

    useEffect(() => {
        const initAudioContext = () => {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const master = ctx.createGain();
            master.connect(ctx.destination);
            
            setAudioContext(ctx);
            setMasterGain(master);
        };

        initAudioContext();

        return () => {
            audioContext?.close();
        };
    }, []);

    useEffect(() => {
        if (!audioContext || !masterGain) return;

        // Create gain nodes for each track
        tracks.forEach(track => {
            if (!trackGainsRef.current.has(track.id)) {
                const gainNode = audioContext.createGain();
                gainNode.connect(masterGain);
                trackGainsRef.current.set(track.id, gainNode);
            }

            const gainNode = trackGainsRef.current.get(track.id);
            if (gainNode) {
                gainNode.gain.setValueAtTime(
                    track.muted ? 0 : track.gain,
                    audioContext.currentTime
                );
            }
        });
    }, [tracks, audioContext, masterGain]);

    const updateTrack = (trackId: string, updates: Partial<Track>) => {
        const updatedTracks = tracks.map(track =>
            track.id === trackId ? { ...track, ...updates } : track
        );
        onTracksChange?.(updatedTracks);
    };

    const toggleMute = (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            updateTrack(trackId, { muted: !track.muted });
        }
    };

    const toggleSolo = (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        if (track.solo) {
            // Un-solo this track
            updateTrack(trackId, { solo: false });
        } else {
            // Solo this track, un-solo others
            const updatedTracks = tracks.map(t => ({
                ...t,
                solo: t.id === trackId,
                muted: t.id !== trackId
            }));
            onTracksChange?.(updatedTracks);
        }
    };

    const setTrackGain = (trackId: string, gain: number) => {
        updateTrack(trackId, { gain });
    };

    return (
        <div className="track-isolator">
            <h3>Track Mixer</h3>
            
            <div className="tracks-list">
                {tracks.map(track => (
                    <div key={track.id} className="track-control">
                        <div className="track-info">
                            <h4>{track.name}</h4>
                            <span className="instrument">{track.instrument}</span>
                        </div>
                        
                        <div className="track-controls">
                            <button
                                className={`mute-btn ${track.muted ? 'active' : ''}`}
                                onClick={() => toggleMute(track.id)}
                            >
                                M
                            </button>
                            
                            <button
                                className={`solo-btn ${track.solo ? 'active' : ''}`}
                                onClick={() => toggleSolo(track.id)}
                            >
                                S
                            </button>
                            
                            <div className="gain-control">
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={track.gain}
                                    onChange={(e) => setTrackGain(track.id, Number(e.target.value))}
                                />
                                <span>{Math.round(track.gain * 100)}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const TrackMixer: React.FC<{
    tracks: Track[];
    onMixChange?: (mixSettings: any) => void;
}> = ({ tracks, onMixChange }) => {
    const [mixSettings, setMixSettings] = useState({
        masterVolume: 1,
        trackSettings: tracks.reduce((acc, track) => {
            acc[track.id] = {
                volume: track.gain,
                pan: 0,
                reverb: 0,
                delay: 0
            };
            return acc;
        }, {} as any)
    });

    const updateMixSetting = (setting: string, value: number) => {
        const newSettings = {
            ...mixSettings,
            [setting]: value
        };
        setMixSettings(newSettings);
        onMixChange?.(newSettings);
    };

    const updateTrackSetting = (trackId: string, setting: string, value: number) => {
        const newSettings = {
            ...mixSettings,
            trackSettings: {
                ...mixSettings.trackSettings,
                [trackId]: {
                    ...mixSettings.trackSettings[trackId],
                    [setting]: value
                }
            }
        };
        setMixSettings(newSettings);
        onMixChange?.(newSettings);
    };

    return (
        <div className="track-mixer">
            <div className="master-controls">
                <h3>Master</h3>
                <div className="master-volume">
                    <label>Volume</label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={mixSettings.masterVolume}
                        onChange={(e) => updateMixSetting('masterVolume', Number(e.target.value))}
                    />
                </div>
            </div>

            <div className="track-channels">
                {tracks.map(track => (
                    <div key={track.id} className="track-channel">
                        <h4>{track.name}</h4>
                        
                        <div className="effect-controls">
                            <div className="control">
                                <label>Pan</label>
                                <input
                                    type="range"
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    value={mixSettings.trackSettings[track.id]?.pan || 0}
                                    onChange={(e) => updateTrackSetting(track.id, 'pan', Number(e.target.value))}
                                />
                            </div>
                            
                            <div className="control">
                                <label>Reverb</label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={mixSettings.trackSettings[track.id]?.reverb || 0}
                                    onChange={(e) => updateTrackSetting(track.id, 'reverb', Number(e.target.value))}
                                />
                            </div>
                            
                            <div className="control">
                                <label>Delay</label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={mixSettings.trackSettings[track.id]?.delay || 0}
                                    onChange={(e) => updateTrackSetting(track.id, 'delay', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
        