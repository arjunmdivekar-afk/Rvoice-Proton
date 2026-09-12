import { Activity, Cpu, Gauge, Zap } from 'lucide-react';
import React from 'react';
import { LatencyMetrics, LMStudioStatus } from '../../../../shared/types';

interface TelemetryHUDProps {
  status: LMStudioStatus | null;
  metrics: LatencyMetrics | null;
  currentTokensPerSec: number;
  onModelChange: (modelId: string) => void;
  onOpenSettings: () => void;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  status,
  metrics,
  currentTokensPerSec,
  onModelChange,
  onOpenSettings
}) => {
  const isConnected = status?.connected || false;
  const speed = currentTokensPerSec || metrics?.tokensPerSec || 0;

  // Speedometer arc calculation
  const maxSpeed = 80; // tokens/sec scale
  const percentage = Math.min(1, speed / maxSpeed);
  const strokeDashoffset = 126 - 126 * percentage; // circumference for radius 20 is ~126

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '8px 16px',
      background: 'rgba(10, 13, 20, 0.75)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      fontSize: '0.8rem'
    }}>
      {/* LM Studio Connection Indicator */}
      <div
        onClick={onOpenSettings}
        title="Click to configure LM Studio connection"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
        }}
      >
        <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
        <span style={{ fontWeight: 600, color: isConnected ? '#34d399' : '#fda4af' }}>
          {isConnected ? 'LM Studio Local' : 'LM Studio Offline'}
        </span>
      </div>

      {/* Model Selector */}
      {isConnected && status?.models && status.models.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={14} color="var(--accent-cyan)" />
          <select
            value={status.activeModel || ''}
            onChange={(e) => onModelChange(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: '180px'
            }}
          >
            {status.models.map((m) => (
              <option key={m.id} value={m.id} style={{ background: '#111622', color: '#fff' }}>
                {m.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Token Speedometer Gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="4"
              strokeDasharray="126"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <Gauge size={12} color="var(--accent-cyan)" style={{ position: 'absolute' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Velocity</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            {speed > 0 ? `${speed} tok/s` : 'Idle'}
          </span>
        </div>
      </div>

      {/* Time to First Token (TTFT) */}
      {metrics?.ttftMs !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} color="var(--accent-violet)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TTFT</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#c084fc' }}>
              {metrics.ttftMs}ms
            </span>
          </div>
        </div>
      )}

      {/* Roundtrip Latency */}
      {metrics?.totalRoundtripMs !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} color="var(--accent-emerald)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Latency</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#34d399' }}>
              {metrics.totalRoundtripMs}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
