import {
  Bookmark,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  FileText,
  ListFilter,
  Mic,
  Monitor,
  Pause,
  Play,
  Share2,
  Sparkles,
  Square,
  Volume2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { MeetingActionItem, MeetingSession, MeetingSummary, MeetingTranscriptEntry } from '../../../../shared/types';

interface MeetingViewProps {
  currentMeeting: MeetingSession | null;
  onStartMeeting: (title: string, source: 'microphone' | 'tab' | 'both') => void;
  onStopMeeting: (meetingId: string) => void;
  onAddTranscript: (meetingId: string, entry: Omit<MeetingTranscriptEntry, 'id'>) => void;
  onSummarizeMeeting: (meetingId: string) => void;
  isSummarizing: boolean;
  onExportMarkdown: (meetingId: string) => void;
  audioLevel: number;
}

export const MeetingView: React.FC<MeetingViewProps> = ({
  currentMeeting,
  onStartMeeting,
  onStopMeeting,
  onAddTranscript,
  onSummarizeMeeting,
  isSummarizing,
  onExportMarkdown,
  audioLevel
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [audioSource, setAudioSource] = useState<'microphone' | 'tab' | 'both'>('microphone');
  const [seconds, setSeconds] = useState(0);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);

  // Update elapsed time timer
  useEffect(() => {
    let interval: number | null = null;
    if (currentMeeting && currentMeeting.status === 'recording') {
      interval = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(currentMeeting?.durationSeconds || 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentMeeting]);

  // Sync action items when summary changes
  useEffect(() => {
    if (currentMeeting?.summary?.actionItems) {
      setActionItems(currentMeeting.summary.actionItems);
      setActiveTab('summary');
    }
  }, [currentMeeting?.summary]);

  const handleStart = () => {
    const title = meetingTitle.trim() || `Strategy Sync — ${new Date().toLocaleDateString()}`;
    setSeconds(0);
    onStartMeeting(title, audioSource);
    setActiveTab('transcript');
  };

  const handleStop = () => {
    if (currentMeeting) {
      onStopMeeting(currentMeeting.id);
    }
  };

  const handleBookmarkCurrent = () => {
    if (!currentMeeting || currentMeeting.transcript.length === 0) return;
    const lastEntry = currentMeeting.transcript[currentMeeting.transcript.length - 1];
    onAddTranscript(currentMeeting.id, {
      speaker: lastEntry.speaker,
      text: lastEntry.text,
      timestamp: lastEntry.timestamp,
      bookmarked: true
    });
  };

  const toggleActionItem = (id: string) => {
    setActionItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const copySummaryText = () => {
    if (!currentMeeting?.summary) return;
    const text = `Executive Brief:\n${currentMeeting.summary.executiveBrief}\n\nKey Decisions:\n${currentMeeting.summary.keyDecisions.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isRecording = currentMeeting?.status === 'recording';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      padding: '20px 24px',
      gap: '16px',
      overflow: 'hidden'
    }}>
      {/* Top Meeting Control Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(12, 16, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Title & Source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isRecording ? (
            <>
              <input
                type="text"
                placeholder="Meeting Title (e.g., Weekly Engineering Standup)..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  minWidth: '280px',
                  outline: 'none'
                }}
              />

              {/* Audio Source Picker */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setAudioSource('microphone')}
                  className={`glass-button ${audioSource === 'microphone' ? 'primary' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <Mic size={13} />
                  <span>Microphone</span>
                </button>
                <button
                  onClick={() => setAudioSource('tab')}
                  className={`glass-button ${audioSource === 'tab' ? 'primary' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  title="Record Google Meet / Zoom / Teams Web Tab"
                >
                  <Monitor size={13} />
                  <span>Tab / System Audio</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--accent-rose)',
                boxShadow: '0 0 12px var(--accent-rose)',
                animation: 'pulse-glow 1.2s infinite'
              }} />
              <span style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>
                {currentMeeting?.title}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--accent-amber)',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {formatTime(seconds)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isRecording ? (
            <button
              onClick={handleStart}
              className="glass-button primary"
              style={{ padding: '8px 20px', fontWeight: 600 }}
            >
              <Play size={16} />
              <span>Start Recording</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleBookmarkCurrent}
                className="glass-button"
                style={{ padding: '8px 14px' }}
                title="Mark this moment as a key highlight"
              >
                <Bookmark size={15} color="var(--accent-amber)" />
                <span>Bookmark</span>
              </button>

              <button
                onClick={handleStop}
                className="glass-button danger"
                style={{ padding: '8px 18px', fontWeight: 600 }}
              >
                <Square size={15} />
                <span>Stop Meeting</span>
              </button>
            </>
          )}

          {currentMeeting && (
            <button
              onClick={() => onSummarizeMeeting(currentMeeting.id)}
              disabled={isSummarizing || currentMeeting.transcript.length === 0}
              className="glass-button"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                padding: '8px 16px',
                fontWeight: 600
              }}
            >
              <Sparkles size={15} />
              <span>{isSummarizing ? 'Summarizing...' : 'Generate AI Summary'}</span>
            </button>
          )}

          {currentMeeting && (
            <button
              onClick={() => onExportMarkdown(currentMeeting.id)}
              className="glass-button"
              style={{ padding: '8px 12px' }}
              title="Download Markdown Minutes"
            >
              <Download size={15} />
            </button>
          )}
        </div>
      </div>

      {/* View Tabs: Transcript vs. AI Summary */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`glass-button ${activeTab === 'transcript' ? 'primary' : ''}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
        >
          <FileText size={14} />
          <span>Live Transcript ({currentMeeting?.transcript.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`glass-button ${activeTab === 'summary' ? 'primary' : ''}`}
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
        >
          <Sparkles size={14} />
          <span>Executive Summary {currentMeeting?.summary ? '✅' : ''}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '16px' }}>
        {activeTab === 'transcript' ? (
          /* Live Transcript Feed */
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'rgba(10, 13, 20, 0.65)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {!currentMeeting || currentMeeting.transcript.length === 0 ? (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '360px'
              }}>
                <FileText size={42} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>Click "Start Recording" above. As participants speak in your meeting or on your screen, live timestamped notes will appear here.</p>
              </div>
            ) : (
              currentMeeting.transcript.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: entry.bookmarked ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${entry.bookmarked ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                    fontSize: '0.9rem',
                    lineHeight: 1.5
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{entry.speaker}</span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    {entry.bookmarked && (
                      <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bookmark size={12} fill="#fbbf24" />
                        <span>Bookmark</span>
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#f1f5f9' }}>{entry.text}</div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* AI Executive Summary View */
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'rgba(10, 13, 20, 0.65)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {currentMeeting?.summary ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>
                    🎯 Executive Brief
                  </h2>
                  <button
                    onClick={copySummaryText}
                    className="glass-button"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {copiedSummary ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedSummary ? 'Copied' : 'Copy Brief'}</span>
                  </button>
                </div>

                <p style={{ lineHeight: 1.7, color: '#e2e8f0', fontSize: '0.95rem' }}>
                  {currentMeeting.summary.executiveBrief}
                </p>

                {/* Key Decisions */}
                {currentMeeting.summary.keyDecisions.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: '#38ef7d', marginBottom: '10px' }}>
                      ⚖️ Key Decisions
                    </h3>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentMeeting.summary.keyDecisions.map((decision, idx) => (
                        <li key={idx} style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items Checklist */}
                {actionItems.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                      ✅ Action Items & Owners
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {actionItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleActionItem(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: item.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${item.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent-emerald)' }}
                          />
                          <div style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : '#f8fafc' }}>
                            {item.task}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                            Owner: {item.owner || 'Unassigned'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                            Due: {item.deadline || 'TBD'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '380px'
              }}>
                <Sparkles size={42} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No summary generated yet. Record conversation and click "Generate AI Summary" above to let LM Studio synthesize executive insights and action items.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
