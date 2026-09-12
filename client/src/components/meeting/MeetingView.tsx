import {
  Bookmark,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Layers,
  Maximize2,
  Mic,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Sparkles,
  Square,
  Video,
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
  liveStream?: MediaStream | null;
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
  audioLevel,
  liveStream
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [audioSource, setAudioSource] = useState<'microphone' | 'tab' | 'both'>('tab');
  const [seconds, setSeconds] = useState(0);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Playback States (Unified Video & Audio)
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Media Player References
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  const isRecording = currentMeeting?.status === 'recording';
  const hasVideo = !!(currentMeeting?.videoUrl || currentMeeting?.hasVideo);
  const mediaUrl = currentMeeting?.videoUrl || currentMeeting?.audioUrl;
  const hasRecording = !!mediaUrl;

  // Live Screen / Tab Preview Binding
  useEffect(() => {
    if (liveVideoRef.current && liveStream) {
      liveVideoRef.current.srcObject = liveStream;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [liveStream]);

  // Update recording elapsed time timer
  useEffect(() => {
    let interval: number | null = null;
    if (isRecording) {
      interval = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(currentMeeting?.durationSeconds || 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, currentMeeting]);

  // Sync action items when summary changes
  useEffect(() => {
    if (currentMeeting?.summary?.actionItems) {
      setActionItems(currentMeeting.summary.actionItems);
      setActiveTab('summary');
    }
  }, [currentMeeting?.summary]);

  // Pause media when switching meetings
  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingMedia(false);
    setPlaybackCurrentTime(0);
  }, [currentMeeting?.id]);

  const handleStart = () => {
    const title = meetingTitle.trim() || `Meeting Sync — ${new Date().toLocaleDateString()}`;
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

  // Playback Controls
  const togglePlayMedia = () => {
    if (hasVideo && videoPlayerRef.current) {
      if (isPlayingMedia) {
        videoPlayerRef.current.pause();
        setIsPlayingMedia(false);
      } else {
        videoPlayerRef.current.play();
        setIsPlayingMedia(true);
      }
    } else if (audioPlayerRef.current) {
      if (isPlayingMedia) {
        audioPlayerRef.current.pause();
        setIsPlayingMedia(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlayingMedia(true);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    if (hasVideo && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = newTime;
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = newTime;
    }
    setPlaybackCurrentTime(newTime);
  };

  const handleJumpToTimestamp = (timestampSec: number) => {
    if (hasVideo && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = timestampSec;
      setPlaybackCurrentTime(timestampSec);
      videoPlayerRef.current.play();
      setIsPlayingMedia(true);
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = timestampSec;
      setPlaybackCurrentTime(timestampSec);
      audioPlayerRef.current.play();
      setIsPlayingMedia(true);
    }
  };

  const skipTime = (delta: number) => {
    const target = hasVideo && videoPlayerRef.current ? videoPlayerRef.current : audioPlayerRef.current;
    if (target) {
      const newTime = Math.max(0, Math.min(target.duration || playbackDuration, target.currentTime + delta));
      target.currentTime = newTime;
      setPlaybackCurrentTime(newTime);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate = speed;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (videoPlayerRef.current) {
      if (!document.fullscreenElement) {
        videoPlayerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const showLiveMonitor = isRecording && liveStream && liveStream.getVideoTracks().length > 0;
  const showVideoPlayer = !isRecording && hasVideo && !!mediaUrl;
  const showDualPane = showLiveMonitor || showVideoPlayer;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      padding: '14px 20px',
      gap: '12px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Hidden Audio Element for Audio-Only Meetings */}
      {!hasVideo && hasRecording && (
        <audio
          ref={audioPlayerRef}
          src={mediaUrl}
          onTimeUpdate={() => setPlaybackCurrentTime(audioPlayerRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setPlaybackDuration(audioPlayerRef.current?.duration || currentMeeting?.durationSeconds || 0)}
          onEnded={() => setIsPlayingMedia(false)}
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
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0
      }}>
        {/* Left: Title & Source & History Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                placeholder="Meeting Title (e.g., Sprint Planning)..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  minWidth: '220px',
                  outline: 'none'
                }}
              />

              {/* 3 Source Modes: Microphone, Tab/System, Both */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => setAudioSource('microphone')}
                  className={`glass-button ${audioSource === 'microphone' ? 'primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  title="Record audio from your local microphone only"
                >
                  <Mic size={12} />
                  <span>Mic Only</span>
                </button>

                <button
                  onClick={() => setAudioSource('tab')}
                  className={`glass-button ${audioSource === 'tab' ? 'primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  title="Capture Google Meet, Zoom, or Teams Tab Video & Audio"
                >
                  <Monitor size={12} />
                  <span>Tab Audio & Video</span>
                </button>

                <button
                  onClick={() => setAudioSource('both')}
                  className={`glass-button ${audioSource === 'both' ? 'primary' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                  title="Record Tab Video & Audio mixed with your Local Microphone"
                >
                  <Layers size={12} />
                  <span>Both (Mic + Tab)</span>
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
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid var(--border-active)',
                color: 'var(--accent-cyan)'
              }}>
                {audioSource === 'both' ? '🎙️+🖥️ Dual Mic & Tab' : audioSource === 'tab' ? '🖥️ Tab Video & Audio' : '🎙️ Mic Only'}
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
                <span>Stop & Save</span>
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

      {/* Audio-Only Playback Bar (When recording was microphone-only without video) */}
      {!hasVideo && hasRecording && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 18px',
          background: 'linear-gradient(90deg, rgba(16, 22, 36, 0.95), rgba(24, 33, 54, 0.95))',
          border: '1px solid var(--border-active)',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 242, 254, 0.15)',
          flexShrink: 0
        }}>
          <button
            onClick={togglePlayMedia}
            className="glass-button primary"
            style={{ width: '36px', height: '36px', borderRadius: '50%', padding: 0 }}
            title={isPlayingMedia ? 'Pause' : 'Play Meeting Audio'}
          >
            {isPlayingMedia ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
          </button>

          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', minWidth: '45px' }}>
            {formatTime(playbackCurrentTime)}
          </span>

          <input
            type="range"
            min="0"
            max={playbackDuration || currentMeeting?.durationSeconds || 100}
            step="0.5"
            value={playbackCurrentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer', height: '4px' }}
          />

          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '45px' }}>
            {formatTime(playbackDuration || currentMeeting?.durationSeconds || 0)}
          </span>

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

          <a
            href={mediaUrl}
            download={`meeting-audio-${currentMeeting?.id}.webm`}
            className="glass-button"
            style={{ padding: '4px 8px', fontSize: '0.7rem', textDecoration: 'none' }}
            title="Download Audio File (.webm)"
          >
            <Download size={13} />
            <span>Audio</span>
          </a>
        </div>
      )}

      {/* Main Content Viewport: Split between Visual Video / Monitor and Transcript / AI Summary */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Left Pane: Live Monitor OR Recorded Visual Video Player */}
        {showDualPane && (
          <div style={{
            flex: 1.1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '420px',
            maxWidth: '58%'
          }}>
            {/* 1. Live Screen / Tab Recording Monitor */}
            {showLiveMonitor && (
              <div style={{
                flex: 1,
                background: '#070a10',
                border: '1px solid var(--accent-rose)',
                borderRadius: '14px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 30px rgba(244, 63, 94, 0.2)'
              }}>
                {/* Live Monitor Header Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '14px',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(244, 63, 94, 0.4)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--accent-rose)',
                    boxShadow: '0 0 10px var(--accent-rose)',
                    animation: 'pulse-glow 1s infinite'
                  }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>
                    LIVE SCREEN / TAB CAPTURE
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                    {formatTime(seconds)}
                  </span>
                </div>

                {/* Live Video Feed */}
                <video
                  ref={liveVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#04060a'
                  }}
                />

                {/* Bottom Audio VU Meter & Status */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '14px',
                  right: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={14} color="var(--accent-cyan)" />
                    <div style={{
                      width: '120px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(8, audioLevel * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-cyan), #10b981)',
                        transition: 'width 0.1s ease'
                      }} />
                    </div>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Google Meet / Zoom / Web Audio Active
                  </span>
                </div>
              </div>
            )}

            {/* 2. Recorded Visual Video Player */}
            {showVideoPlayer && (
              <div style={{
                flex: 1,
                background: '#070a10',
                border: '1px solid var(--border-active)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0, 242, 254, 0.2)',
                position: 'relative'
              }}>
                {/* Video Header Badge */}
                <div style={{
                  padding: '8px 14px',
                  background: 'rgba(12, 16, 26, 0.9)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={14} color="var(--accent-cyan)" />
                    <span style={{ fontWeight: 600, color: '#fff' }}>Recorded Meeting Video</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      background: 'rgba(0, 242, 254, 0.1)',
                      color: 'var(--accent-cyan)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      {formatTime(playbackDuration || currentMeeting?.durationSeconds || 0)}
                    </span>
                  </div>

                  {/* Download Video Action */}
                  <a
                    href={mediaUrl}
                    download={`meeting-video-${currentMeeting?.id}.webm`}
                    className="glass-button primary"
                    style={{ padding: '3px 10px', fontSize: '0.72rem', textDecoration: 'none' }}
                    title="Download Meeting Video (.webm)"
                  >
                    <Download size={12} />
                    <span>Download Video</span>
                  </a>
                </div>

                {/* Visual Video Surface */}
                <div style={{ flex: 1, position: 'relative', background: '#020306', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video
                    ref={videoPlayerRef}
                    src={mediaUrl}
                    onTimeUpdate={() => setPlaybackCurrentTime(videoPlayerRef.current?.currentTime || 0)}
                    onLoadedMetadata={() => setPlaybackDuration(videoPlayerRef.current?.duration || currentMeeting?.durationSeconds || 0)}
                    onEnded={() => setIsPlayingMedia(false)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      cursor: 'pointer'
                    }}
                    onClick={togglePlayMedia}
                  />

                  {/* Central Overlay Play Button when paused */}
                  {!isPlayingMedia && (
                    <button
                      onClick={togglePlayMedia}
                      style={{
                        position: 'absolute',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(0, 242, 254, 0.85)',
                        border: 'none',
                        color: '#050608',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 0 30px rgba(0, 242, 254, 0.5)',
                        transition: 'transform 0.2s ease',
                        zIndex: 5
                      }}
                    >
                      <Play size={28} style={{ marginLeft: '4px' }} />
                    </button>
                  )}
                </div>

                {/* Video Playback Scrubber & Console Bar */}
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(10, 14, 24, 0.95)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Seek Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', minWidth: '40px' }}>
                      {formatTime(playbackCurrentTime)}
                    </span>

                    <input
                      type="range"
                      min="0"
                      max={playbackDuration || currentMeeting?.durationSeconds || 100}
                      step="0.2"
                      value={playbackCurrentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer', height: '5px' }}
                    />

                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '40px' }}>
                      {formatTime(playbackDuration || currentMeeting?.durationSeconds || 0)}
                    </span>
                  </div>

                  {/* Lower Row Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Play/Pause */}
                      <button
                        onClick={togglePlayMedia}
                        className="glass-button primary"
                        style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
                        title={isPlayingMedia ? 'Pause' : 'Play Video'}
                      >
                        {isPlayingMedia ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                      </button>

                      {/* -10s / +10s Skips */}
                      <button
                        onClick={() => skipTime(-10)}
                        className="glass-button"
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        title="Skip 10 seconds backward"
                      >
                        <RotateCcw size={12} />
                        <span>-10s</span>
                      </button>

                      <button
                        onClick={() => skipTime(10)}
                        className="glass-button"
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        title="Skip 10 seconds forward"
                      >
                        <RotateCw size={12} />
                        <span>+10s</span>
                      </button>
                    </div>

                    {/* Speed & Fullscreen */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => changeSpeed(spd)}
                            style={{
                              background: playbackSpeed === spd ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                              border: playbackSpeed === spd ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                              color: playbackSpeed === spd ? '#00f2fe' : 'var(--text-muted)',
                              borderRadius: '4px',
                              padding: '2px 5px',
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              cursor: 'pointer'
                            }}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={toggleFullscreen}
                        className="glass-button"
                        style={{ padding: '5px 8px' }}
                        title="Fullscreen Video"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Pane: Interactive Transcript & AI Summary Tabs */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '340px',
          overflow: 'hidden'
        }}>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', flexShrink: 0 }}>
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

          {/* Tab Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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
                    <p>Live speech recognition transcript will stream here during your meeting.</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '6px' }}>Click any timestamp on recorded entries to jump the video/audio directly to that point.</p>
                  </div>
                ) : (
                  currentMeeting.transcript.map((entry) => {
                    const isNearCurrent = hasRecording && Math.abs(playbackCurrentTime - entry.timestamp) < 3;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleJumpToTimestamp(entry.timestamp)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isNearCurrent
                            ? 'rgba(0, 242, 254, 0.12)'
                            : entry.bookmarked
                            ? 'rgba(245, 158, 11, 0.08)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${
                            isNearCurrent
                              ? 'var(--accent-cyan)'
                              : entry.bookmarked
                              ? 'rgba(245, 158, 11, 0.4)'
                              : 'var(--border-subtle)'
                          }`,
                          cursor: hasRecording ? 'pointer' : 'default',
                          transition: 'all 0.15s ease'
                        }}
                        title={hasRecording ? 'Click to jump video to this moment' : ''}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                            {entry.speaker}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {entry.bookmarked && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 6px', borderRadius: '4px' }}>
                                ★ Highlight
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              color: isNearCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)'
                            }}>
                              ▶ {formatTime(entry.timestamp)}
                            </span>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.4 }}>
                          {entry.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Executive AI Summary & Action Items */
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                          {currentMeeting.summary.title}
                        </h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {currentMeeting.summary.date} • {formatTime(currentMeeting.summary.durationSeconds)} duration
                        </div>
                      </div>

                      <button
                        onClick={copySummaryText}
                        className="glass-button"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        {copiedSummary ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                        <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Executive Brief */}
                    <div>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Executive Brief
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        {currentMeeting.summary.executiveBrief}
                      </p>
                    </div>

                    {/* Key Decisions */}
                    {currentMeeting.summary.keyDecisions.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Key Decisions & Strategic Takeaways
                        </h4>
                        <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {currentMeeting.summary.keyDecisions.map((decision, i) => (
                            <li key={i} style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                              {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Interactive Action Items Checklist */}
                    {actionItems.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          Action Items & Next Steps ({actionItems.filter(a => a.completed).length}/{actionItems.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
        </div>
      </div>

      {/* Past Meetings History Drawer */}
      {showHistoryDrawer && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
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
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Recorded Meetings History</span>
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
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                      {m.title}
                    </div>
                    {m.hasVideo || m.videoUrl ? (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Video size={10} /> Video
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)', padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Mic size={10} /> Audio
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{new Date(m.startedAt).toLocaleDateString()}</span>
                    <span>{formatTime(m.durationSeconds)} • {m.transcript.length} entries</span>
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
