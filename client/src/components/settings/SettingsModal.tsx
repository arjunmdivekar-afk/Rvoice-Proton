import { Check, Globe, RefreshCw, Sliders, Volume2, X } from 'lucide-react';
import React, { useState } from 'react';
import { LMStudioStatus } from '../../../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LMStudioStatus | null;
  onUpdateEndpoint: (endpoint: string) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onSelectVoice: (voiceName: string) => void;
  vadSensitivity: number;
  onUpdateVadSensitivity: (val: number) => void;
  onRefreshLMStudio: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onUpdateEndpoint,
  voices,
  selectedVoice,
  onSelectVoice,
  vadSensitivity,
  onUpdateVadSensitivity,
  onRefreshLMStudio
}) => {
  const [endpointInput, setEndpointInput] = useState(status?.endpoint || 'http://localhost:1234/v1');
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSaveEndpoint = () => {
    setIsTesting(true);
    onUpdateEndpoint(endpointInput);
    onRefreshLMStudio();
    setTimeout(() => setIsTesting(false), 800);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(4, 5, 8, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: '520px',
        maxWidth: '92%',
        background: '#0d111a',
        border: '1px solid var(--border-active)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-cyan)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600 }}>
              System & Engine Settings
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* LM Studio Local Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            LM Studio Local Server Endpoint
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
              placeholder="http://localhost:1234/v1"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem'
              }}
            />
            <button
              onClick={handleSaveEndpoint}
              className="glass-button primary"
              style={{ padding: '8px 14px' }}
            >
              <RefreshCw size={14} className={isTesting ? 'spin' : ''} />
              <span>Test</span>
            </button>
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: status?.connected ? '#34d399' : '#fda4af',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px'
          }}>
            <div className={`status-dot ${status?.connected ? 'connected' : ''}`} />
            <span>
              {status?.connected
                ? `Connected to LM Studio (${status.models.length} model${status.models.length > 1 ? 's' : ''} loaded)`
                : `Offline: ${status?.error || 'Ensure LM Studio local server is started on port 1234'}`}
            </span>
          </div>
        </div>

        {/* Speech Synthesis Voice Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Voice Output Synthesizer (TTS)
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => onSelectVoice(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '0.85rem'
            }}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name} style={{ background: '#111622', color: '#fff' }}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* VAD Sensitivity Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Voice Activity Detection (VAD) Sensitivity
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              {Math.round((1 - vadSensitivity / 0.1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.1"
            step="0.005"
            value={vadSensitivity}
            onChange={(e) => onUpdateVadSensitivity(parseFloat(e.target.value))}
            style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Lower threshold = higher sensitivity for quiet voices. Higher threshold = filters room background noise.
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button onClick={onClose} className="glass-button primary" style={{ padding: '8px 20px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
