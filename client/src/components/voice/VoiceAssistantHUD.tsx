import {
  Bot,
  History,
  MessageSquarePlus,
  Mic,
  MicOff,
  OctagonX,
  Plus,
  Sparkles,
  Trash2,
  User,
  Volume2,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { AssistantPersona, ChatMessage, VoiceConversation } from '../../../../shared/types';
import { OrbState } from '../../canvas/ParticleOrb';
import { VoiceVisualizer } from '../visualizer/VoiceVisualizer';

interface VoiceAssistantHUDProps {
  orbState: OrbState;
  audioLevel: number;
  frequencies?: Uint8Array;
  isMicActive: boolean;
  onToggleMic: () => void;
  onInterrupt: () => void;
  persona: AssistantPersona;
  onSelectPersona: (persona: AssistantPersona) => void;
  messages: ChatMessage[];
  interimTranscript: string;
  streamingAssistantText: string;
  onRepeatAudio: (text: string) => void;
  onNewChat: () => void;
  conversations: VoiceConversation[];
  onSelectConversation: (conv: VoiceConversation) => void;
  onDeleteConversation: (id: string) => void;
}

export const VoiceAssistantHUD: React.FC<VoiceAssistantHUDProps> = ({
  orbState,
  audioLevel,
  frequencies,
  isMicActive,
  onToggleMic,
  onInterrupt,
  persona,
  onSelectPersona,
  messages,
  interimTranscript,
  streamingAssistantText,
  onRepeatAudio,
  onNewChat,
  conversations,
  onSelectConversation,
  onDeleteConversation
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const isSpeakingOrThinking = orbState === 'speaking' || orbState === 'thinking';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      position: 'relative',
      padding: '16px 24px',
      gap: '14px',
      overflow: 'hidden'
    }}>
      {/* Top Toolbar: New Chat + Persona Switcher + History */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 }}>
        {/* Left: New Chat & Persona Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onNewChat}
            className="glass-button primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Start a fresh voice conversation"
          >
            <Plus size={15} />
            <span>New Chat</span>
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="glass-button"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            title="View past voice conversations"
          >
            <History size={14} color="var(--accent-cyan)" />
            <span>History ({conversations.length})</span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.03)',
            padding: '3px 8px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Sparkles size={13} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Persona:</span>
            {(['executive', 'companion', 'tutor', 'creative'] as AssistantPersona[]).map((p) => (
              <button
                key={p}
                onClick={() => onSelectPersona(p)}
                style={{
                  background: persona === p ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                  border: persona === p ? '1px solid var(--accent-cyan)' : 'none',
                  color: persona === p ? '#00f2fe' : 'var(--text-secondary)',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Zero-Code Badge */}
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 12px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>🎙️ Spoken Dialogue Mode</span>
          <span style={{ color: 'var(--accent-cyan)' }}>• Zero Code in Voice</span>
        </div>
      </div>

      {/* Main Center Area: Visualizer & Live Transcript */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: '320px'
      }}>
        <VoiceVisualizer
          state={orbState}
          audioLevel={audioLevel}
          frequencies={frequencies}
        />

        {/* Live Subtitle Overlay */}
        {(interimTranscript || streamingAssistantText) && (
          <div style={{
            position: 'absolute',
            bottom: '36px',
            maxWidth: '680px',
            width: '90%',
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'rgba(8, 10, 16, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-active)',
            textAlign: 'center',
            fontSize: '1rem',
            lineHeight: 1.5,
            boxShadow: 'var(--shadow-md)',
            animation: 'token-fade-glide 0.3s ease'
          }}>
            {interimTranscript && (
              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                "{interimTranscript}..."
              </span>
            )}
            {streamingAssistantText && (
              <span style={{ color: '#fff', fontWeight: 500 }}>
                {streamingAssistantText}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Voice Control Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '10px',
        zIndex: 5
      }}>
        {/* Main Mic Toggle Button */}
        <button
          onClick={onToggleMic}
          className={`glass-button ${isMicActive ? 'danger' : 'primary'}`}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            padding: 0,
            boxShadow: isMicActive ? '0 0 30px rgba(244, 63, 94, 0.5)' : '0 0 25px rgba(0, 242, 254, 0.4)'
          }}
          title={isMicActive ? 'Click to Mute' : 'Click to Speak'}
        >
          {isMicActive ? <MicOff size={26} /> : <Mic size={26} />}
        </button>

        {/* Instant Barge-in / Interrupt Button */}
        {isSpeakingOrThinking && (
          <button
            onClick={onInterrupt}
            className="glass-button danger"
            style={{
              padding: '10px 18px',
              borderRadius: '999px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'pulse-glow 1.5s infinite alternate'
            }}
          >
            <OctagonX size={18} />
            <span>Interrupt</span>
          </button>
        )}
      </div>

      {/* Active Spoken Dialogue Feed */}
      {messages.length > 0 && (
        <div style={{
          maxHeight: '140px',
          overflowY: 'auto',
          background: 'rgba(10, 13, 20, 0.65)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          {messages.slice(-4).map((msg) => (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {msg.role === 'user' ? (
                <User size={14} color="var(--accent-cyan)" style={{ marginTop: '3px' }} />
              ) : (
                <Bot size={14} color="var(--accent-emerald)" style={{ marginTop: '3px' }} />
              )}
              <div style={{ flex: 1, color: msg.role === 'user' ? 'var(--text-secondary)' : '#fff' }}>
                <span style={{ fontWeight: 600, marginRight: '6px' }}>
                  {msg.role === 'user' ? 'You:' : 'Proton:'}
                </span>
                <span>{msg.content}</span>
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => onRepeatAudio(msg.content)}
                  title="Repeat out loud"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <Volume2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Past Voice Conversations Drawer */}
      {showHistory && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '340px',
          background: '#090c14',
          borderLeft: '1px solid var(--border-active)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Voice Chat History</span>
            <button
              onClick={() => setShowHistory(false)}
              className="glass-button"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {conversations.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>
                No past conversations yet.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    onClick={() => { onSelectConversation(c); setShowHistory(false); }}
                    style={{ flex: 1 }}
                  >
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#fff', marginBottom: '2px' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(c.startedAt).toLocaleDateString()} • {c.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
