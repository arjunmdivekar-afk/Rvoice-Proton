import { Cpu, Globe, RefreshCw, Sliders, Volume2, X } from 'lucide-react';
import React, { useState } from 'react';
import { LLMProvider, LLMProviderStatus } from '../../../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: LLMProviderStatus | null;
  onUpdateProvider: (provider: LLMProvider, endpoint: string) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onSelectVoice: (voiceName: string) => void;
  vadSensitivity: number;
  onUpdateVadSensitivity: (val: number) => void;
  onRefreshLLM: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onUpdateProvider,
  voices,
  selectedVoice,
  onSelectVoice,
  vadSensitivity,
  onUpdateVadSensitivity,
  onRefreshLLM
}) => {
  const [provider, setProvider] = useState<LLMProvider>(status?.provider || 'lmstudio');
  const [endpointInput, setEndpointInput] = useState(
    status?.endpoint || (status?.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1')
  );
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSelectProvider = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    if (newProvider === 'ollama') {
      setEndpointInput('http://localhost:11434');
    } else if (newProvider === 'lmstudio') {
      setEndpointInput('http://localhost:1234/v1');
    }
  };

  const handleSave = () => {
    setIsTesting(true);
    onUpdateProvider(provider, endpointInput);
    onRefreshLLM();
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
        width: '540px',
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
              System & Model Engine Settings
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Model Provider Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Active Local LLM Provider
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleSelectProvider('lmstudio')}
              className={`glass-button ${provider === 'lmstudio' ? 'primary' : ''}`}
              style={{ padding: '10px', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <Cpu size={16} />
              <span>LM Studio</span>
            </button>

            <button
              onClick={() => handleSelectProvider('ollama')}
              className={`glass-button ${provider === 'ollama' ? 'primary' : ''}`}
              style={{
                padding: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: provider === 'ollama' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(249, 115, 22, 0.3))' : undefined,
                borderColor: provider === 'ollama' ? 'var(--accent-amber)' : undefined,
                color: provider === 'ollama' ? '#fbbf24' : undefined
              }}
            >
              <Globe size={16} />
              <span>Ollama (Local)</span>
            </button>
          </div>
        </div>

        {/* Provider Endpoint Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {provider === 'ollama' ? 'Ollama API Link Endpoint' : 'LM Studio API Link Endpoint'}
            </label>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {provider === 'ollama' ? 'Default: http://localhost:11434' : 'Default: http://localhost:1234/v1'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
              placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1'}
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
              onClick={handleSave}
              className="glass-button primary"
              style={{ padding: '8px 16px' }}
            >
              <RefreshCw size={14} className={isTesting ? 'spin' : ''} />
              <span>Connect</span>
            </button>
          </div>

          {/* Connection Status Indicator */}
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
                ? `Connected to ${status.provider === 'ollama' ? 'Ollama' : 'LM Studio'} (${status.models.length} model${status.models.length > 1 ? 's' : ''} found)`
                : `Offline: ${status?.error || (provider === 'ollama' ? 'Run "ollama serve" or start Ollama desktop app' : 'Start LM Studio server on port 1234')}`}
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
