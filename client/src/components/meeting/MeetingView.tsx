import {
  Bookmark,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Mic,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  VolumeX
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { MeetingActionItem, MeetingSession, MeetingTranscriptEntry } from '../../../../shared/types';

interface MeetingViewProps {
  currentMeeting: MeetingSession | null;
  pastMeetings: MeetingSession[];
  onSelectPastMeeting: (meeting: MeetingSession) => void;
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
  pastMeetings,
  onSelectPastMeeting,
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
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Update recording elapsed time timer
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

  // Pause audio when switching meetings
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      setPlaybackCurrentTime(0);
    }
  }, [currentMeeting?.id]);

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
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Audio Playback Controls
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !currentMeeting?.audioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTime;
      setPlaybackCurrentTime(newTime);
    }
  };

  const handleJumpToTimestamp = (timestampSec: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = timestampSec;
      setPlaybackCurrentTime(timestampSec);
      if (!isPlayingAudio) {
        audioPlayerRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  const isRecording = currentMeeting?.status === 'recording';
  const hasAudioRecording = !!currentMeeting?.audioUrl;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      padding: '16px 24px',
      gap: '12px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Hidden HTML5 Audio Element for Meeting Replay */}
      {hasAudioRecording && (
        <audio
          ref={audioPlayerRef}
          src={currentMeeting.audioUrl}
          onTimeUpdate={() => setPlaybackCurrentTime(audioPlayerRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setPlaybackDuration(audioPlayerRef.current?.duration || currentMeeting.durationSeconds || 0)}
          onEnded={() => setIsPlayingAudio(false)}
        />
      )}

      {/* Top Meeting Control Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        background: 'rgba(12, 16, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left: Title & Source & History Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="glass-button"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            title="Browse recorded meetings"
          >
            <History size={14} color="var(--accent-amber)" />
            <span>Past Meetings ({pastMeetings.length})</span>
          </button>

          {!isRecording ? (
            <>
              <input
                type="text"
                placeholder="Meeting Title (e.g., Q3 Architecture Sync)..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  minWidth: '240px',
                  outline: 'none'
                }}
              />

              {/* Audio Source Picker */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setAudioSource('microphone')}
                  className={`glass-button ${audioSource === 'microphone' ? 'primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                >
                  <Mic size={12} />
                  <span>Microphone</span>
                </button>
                <button
                  onClick={() => setAudioSource('tab')}
                  className={`glass-button ${audioSource === 'tab' ? 'primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  title="Record Google Meet / Zoom / Teams Web Tab"
                >
                  <Monitor size={12} />
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
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                {currentMeeting?.title}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
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

        {/* Right: Meeting Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isRecording ? (
            <button
              onClick={handleStart}
              className="glass-button primary"
              style={{ padding: '8px 18px', fontWeight: 600 }}
            >
              <Play size={15} />
              <span>Record Meeting</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleBookmarkCurrent}
                className="glass-button"
                style={{ padding: '7px 12px' }}
                title="Mark this moment as a key highlight"
              >
                <Bookmark size={14} color="var(--accent-amber)" />
                <span>Bookmark</span>
              </button>

              <button
                onClick={handleStop}
                className="glass-button danger"
                style={{ padding: '7px 16px', fontWeight: 600 }}
              >
                <Square size={14} />
                <span>Stop</span>
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
                padding: '7px 14px',
                fontWeight: 600
              }}
            >
              <Sparkles size={14} />
              <span>{isSummarizing ? 'Summarizing...' : 'AI Summary'}</span>
            </button>
          )}

          {currentMeeting && (
            <button
              onClick={() => onExportMarkdown(currentMeeting.id)}
              className="glass-button"
              style={{ padding: '7px 11px' }}
              title="Download Markdown Minutes"
            >
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Audio Playback Player Bar (Listen to Meeting Again and Again) */}
      {hasAudioRecording && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 18px',
          background: 'linear-gradient(90deg, rgba(16, 22, 36, 0.95), rgba(24, 33, 54, 0.95))',
          border: '1px solid var(--border-active)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 242, 254, 0.15)'
        }}>
          {/* Play / Pause */}
          <button
            onClick={togglePlayAudio}
            className="glass-button primary"
            style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
            title={isPlayingAudio ? 'Pause' : 'Play Meeting Audio'}
          >
            {isPlayingAudio ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
          </button>

          {/* Time Displays */}
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', minWidth: '45px' }}>
            {formatTime(playbackCurrentTime)}
          </span>

          {/* Seekable Progress Bar */}
          <input
            type="range"
            min="0"
            max={playbackDuration || currentMeeting.durationSeconds || 100}
            step="0.5"
            value={playbackCurrentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer', height: '4px' }}
          />

          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '45px' }}>
            {formatTime(playbackDuration || currentMeeting.durationSeconds)}
          </span>

          {/* Speed Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => changeSpeed(spd)}
                style={{
                  background: playbackSpeed === spd ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                  border: playbackSpeed === spd ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  color: playbackSpeed === spd ? '#00f2fe' : 'var(--text-muted)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Download Audio */}
          {currentMeeting.audioUrl && (
            <a
              href={currentMeeting.audioUrl}
              download={`meeting-audio-${currentMeeting.id}.webm`}
              className="glass-button"
              style={{ padding: '4px 8px', fontSize: '0.7rem', textDecoration: 'none' }}
              title="Download Audio File (.webm)"
            >
              <Download size={13} />
              <span>Audio</span>
            </a>
          )}
        </div>
      )}

      {/* Tabs: Live Transcript vs. AI Summary */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`glass-button ${activeTab === 'transcript' ? 'primary' : ''}`}
          style={{ padding: '5px 14px', fontSize: '0.8rem' }}
        >
          <FileText size={14} />
          <span>Interactive Transcript ({currentMeeting?.transcript.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`glass-button ${activeTab === 'summary' ? 'primary' : ''}`}
          style={{ padding: '5px 14px', fontSize: '0.8rem' }}
        >
          <Sparkles size={14} />
          <span>Executive Summary {currentMeeting?.summary ? '✅' : ''}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: '16px' }}>
        {activeTab === 'transcript' ? (
          /* Click-to-Play Interactive Transcript */
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'rgba(10, 13, 20, 0.65)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {!currentMeeting || currentMeeting.transcript.length === 0 ? (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '380px'
              }}>
                <FileText size={42} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>Click "Record Meeting" to start recording speech. Click any transcript line later to listen to that exact moment again!</p>
              </div>
            ) : (
              currentMeeting.transcript.map((entry) => {
                const isCurrentlyActive =
                  hasAudioRecording &&
                  playbackCurrentTime >= entry.timestamp &&
                  playbackCurrentTime < (entry.timestamp + 5);

                return (
                  <div
                    key={entry.id}
                    onClick={() => hasAudioRecording && handleJumpToTimestamp(entry.timestamp)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isCurrentlyActive
                        ? 'rgba(0, 242, 254, 0.15)'
                        : entry.bookmarked
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${
                        isCurrentlyActive
                          ? 'var(--accent-cyan)'
                          : entry.bookmarked
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'var(--border-subtle)'
                      }`,
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      cursor: hasAudioRecording ? 'pointer' : 'default',
                      transition: 'all 0.2s ease'
                    }}
                    title={hasAudioRecording ? 'Click to play from this moment' : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasAudioRecording && (
                          <span style={{ color: isCurrentlyActive ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                            <Play size={12} />
                          </span>
                        )}
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
                );
              })
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
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {currentMeeting?.summary ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
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

                <p style={{ lineHeight: 1.7, color: '#e2e8f0', fontSize: '0.92rem' }}>
                  {currentMeeting.summary.executiveBrief}
                </p>

                {/* Key Decisions */}
                {currentMeeting.summary.keyDecisions.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: '#38ef7d', marginBottom: '8px' }}>
                      ⚖️ Key Decisions
                    </h3>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {currentMeeting.summary.keyDecisions.map((decision, idx) => (
                        <li key={idx} style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items Checklist */}
                {actionItems.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
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
                            gap: '10px',
                            padding: '8px 12px',
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
                          <div style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : '#f8fafc', fontSize: '0.85rem' }}>
                            {item.task}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                            {item.owner || 'Unassigned'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                            {item.deadline || 'TBD'}
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
                <p>Click "AI Summary" above to generate structured meeting minutes from the transcript.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past Meetings Drawer */}
      {showHistoryDrawer && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
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
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Recorded Meetings History</span>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="glass-button"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pastMeetings.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>
                No past meetings recorded yet.
              </div>
            ) : (
              pastMeetings.map((m) => (
                <div
                  key={m.id}
                  onClick={() => { onSelectPastMeeting(m); setShowHistoryDrawer(false); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: currentMeeting?.id === m.id ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${currentMeeting?.id === m.id ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', marginBottom: '4px' }}>
                    {m.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{new Date(m.startedAt).toLocaleDateString()}</span>
                    <span>{formatTime(m.durationSeconds)} • {m.transcript.length} lines</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
