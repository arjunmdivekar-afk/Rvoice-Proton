import React, { useEffect, useRef } from 'react';
import { AuroraRibbonRenderer } from '../../canvas/AuroraRibbon';
import { OrbState, ParticleOrbRenderer } from '../../canvas/ParticleOrb';

interface VoiceVisualizerProps {
  state: OrbState;
  audioLevel: number;
  frequencies?: Uint8Array;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ state, audioLevel, frequencies }) => {
  const orbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const auroraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbRendererRef = useRef<ParticleOrbRenderer | null>(null);
  const auroraRendererRef = useRef<AuroraRibbonRenderer | null>(null);

  useEffect(() => {
    if (!orbCanvasRef.current || !auroraCanvasRef.current) return;

    const orb = new ParticleOrbRenderer(orbCanvasRef.current);
    const aurora = new AuroraRibbonRenderer(auroraCanvasRef.current);

    orbRendererRef.current = orb;
    auroraRendererRef.current = aurora;

    const handleResize = () => {
      if (orbCanvasRef.current && auroraCanvasRef.current) {
        const width = orbCanvasRef.current.parentElement?.clientWidth || window.innerWidth;
        const height = orbCanvasRef.current.parentElement?.clientHeight || 450;
        orb.resize(width, height);
        aurora.resize(width, 120);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    orb.start();
    aurora.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      orb.stop();
      aurora.stop();
    };
  }, []);

  // Update orb state & audio level
  useEffect(() => {
    if (orbRendererRef.current) {
      orbRendererRef.current.setState(state);
      orbRendererRef.current.setAudioLevel(audioLevel);
    }
  }, [state, audioLevel]);

  // Update aurora theme & frequencies
  useEffect(() => {
    if (auroraRendererRef.current) {
      if (state === 'thinking') auroraRendererRef.current.setTheme('violet');
      else if (state === 'speaking') auroraRendererRef.current.setTheme('emerald');
      else if (state === 'meeting') auroraRendererRef.current.setTheme('amber');
      else auroraRendererRef.current.setTheme('cyan');

      if (frequencies) {
        auroraRendererRef.current.updateFrequencies(frequencies);
      }
    }
  }, [state, frequencies]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '360px', overflow: 'hidden' }}>
      {/* 3D Particle Orb Canvas */}
      <canvas
        ref={orbCanvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair'
        }}
      />

      {/* Fluid Aurora Audio Ribbon at bottom */}
      <canvas
        ref={auroraCanvasRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100px',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};
