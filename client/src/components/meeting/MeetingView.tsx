import {
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  Filter,
  History,
  Layers,
  Mail,
  Maximize2,
  Mic,
  Monitor,
  Pause,
  Play,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Send,
  Share2,
  Sparkles,
  Square,
  Tag,
  User,
  Users,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MeetingActionItem,
  MeetingParticipant,
  MeetingSession,
  MeetingTranscriptEntry
} from '../../../../shared/types';

interface MeetingViewProps {
  currentMeeting: MeetingSession | null;
  pastMeetings: MeetingSession[];
  onSelectPastMeeting: (meeting: MeetingSession) => void;
  onStartMeeting: (title: string, source: 'microphone' | 'tab' | 'both') => void;
  onStopMeeting: (meetingId: string) => void;
  onAddTranscript: (meetingId: string, entry: Omit<MeetingTranscriptEntry, 'id'>) => void;
  onUpdateTranscript?: (meetingId: string, entries: MeetingTranscriptEntry[]) => void;
  onUpdateParticipants?: (meetingId: string, participants: MeetingParticipant[]) => void;
  onSummarizeMeeting: (meetingId: string, style?: 'executive' | 'detailed' | 'action_items' | 'email') => void;
  isSummarizing: boolean;
  onExportMarkdown: (meetingId: string) => void;
  audioLevel: number;
  liveStream?: MediaStream | null;
  interimTranscript?: string;
  activeSpeaker?: { id: string; name: string; color: string } | null;
  onRenameSpeaker?: (oldName: string, newName: string) => void;
}

const SPEAKER_PALETTE = ['#00f2fe', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#38bdf8', '#fb923c', '#a3e635'];

export const MeetingView: React.FC<MeetingViewProps> = ({
  currentMeeting,
  pastMeetings,
  onSelectPastMeeting,
  onStartMeeting,
  onStopMeeting,
  onAddTranscript,
  onUpdateTranscript,
  onUpdateParticipants,
  onSummarizeMeeting,
  isSummarizing,
  onExportMarkdown,
  audioLevel,
  liveStream,
  interimTranscript,
  activeSpeaker,
  onRenameSpeaker
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [audioSource, setAudioSource] = useState<'microphone' | 'tab' | 'both'>('tab');
  const [seconds, setSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'email'>('transcript');
  const [summaryStyle, setSummaryStyle] = useState<'executive' | 'detailed' | 'action_items' | 'email'>('executive');
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Notifications / Copy States
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Playback States (Unified Video & Audio)
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Media Player References
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript on new speech / live words
  useEffect(() => {
    if (currentMeeting?.status === 'recording') {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMeeting?.transcript.length, interimTranscript]);

  // MN-08 Speaker Diarization & Tagging States
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string | null>(null);
  const [manualNoteText, setManualNoteText] = useState('');
  const [manualSpeakerName, setManualSpeakerName] = useState('Speaker 1');
  const [editingSpeakerEntryId, setEditingSpeakerEntryId] = useState<string | null>(null);
  const [renameSpeakerModal, setRenameSpeakerModal] = useState<{ oldName: string; newName: string } | null>(null);
  const [newActionItemTask, setNewActionItemTask] = useState('');
  const [newActionItemOwner, setNewActionItemOwner] = useState('');

  const isRecording = currentMeeting?.status === 'recording';
  const isTabOrBoth = currentMeeting?.audioSource === 'tab' || currentMeeting?.audioSource === 'both';
  const mediaUrl = currentMeeting?.videoUrl || currentMeeting?.audioUrl;
  const hasRecording = !!mediaUrl;
  const hasVideo = !!(currentMeeting?.videoUrl || currentMeeting?.hasVideo || (isTabOrBoth && hasRecording));

  // Compute Speaker Statistics & Talk-Time Distribution
  const speakerStats = useMemo(() => {
    if (!currentMeeting || currentMeeting.transcript.length === 0) return [];
    const counts: Record<string, { words: number; count: number }> = {};

    currentMeeting.transcript.forEach((t) => {
      const spk = t.speaker || 'Speaker';
      const words = t.text.trim().split(/\s+/).filter(Boolean).length;
      if (!counts[spk]) counts[spk] = { words: 0, count: 0 };
      counts[spk].words += words;
      counts[spk].count += 1;
    });

    const totalWords = Object.values(counts).reduce((a, b) => a + b.words, 0) || 1;
    return Object.entries(counts).map(([name, data], idx) => ({
      name,
      color: SPEAKER_PALETTE[idx % SPEAKER_PALETTE.length],
      words: data.words,
      count: data.count,
      percentage: Math.round((data.words / totalWords) * 100),
      durationEstSeconds: Math.round(data.words / 2.5)
    }));
  }, [currentMeeting?.transcript]);

  // Color map for speaker badges
  const speakerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    speakerStats.forEach((s) => {
      map[s.name] = s.color;
    });
    return map;
  }, [speakerStats]);

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
    setSelectedSpeakerFilter(null);
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

  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMeeting || !manualNoteText.trim()) return;

    const timestamp = isRecording
      ? seconds
      : currentMeeting.durationSeconds || Math.floor(playbackCurrentTime) || 0;

    onAddTranscript(currentMeeting.id, {
      speaker: manualSpeakerName.trim() || 'Speaker',
      text: manualNoteText.trim(),
      timestamp
    });

    setManualNoteText('');
  };

  const handleReassignSpeaker = (entryId: string, newSpeaker: string) => {
    if (!currentMeeting || !onUpdateTranscript) return;
    const updated = currentMeeting.transcript.map((e) =>
      e.id === entryId ? { ...e, speaker: newSpeaker } : e
    );
    onUpdateTranscript(currentMeeting.id, updated);
    setEditingSpeakerEntryId(null);
  };

  const handleRenameSpeakerAcrossAll = () => {
    if (!currentMeeting || !renameSpeakerModal || !onUpdateTranscript) return;
    const { oldName, newName } = renameSpeakerModal;
    if (!newName.trim() || oldName === newName) {
      setRenameSpeakerModal(null);
      return;
    }

    const updated = currentMeeting.transcript.map((e) =>
      e.speaker === oldName ? { ...e, speaker: newName.trim() } : e
    );
    onUpdateTranscript(currentMeeting.id, updated);
    onRenameSpeaker?.(oldName, newName.trim());
    setRenameSpeakerModal(null);
  };

  const toggleActionItem = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleAddCustomActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionItemTask.trim()) return;
    const newItem: MeetingActionItem = {
      id: Date.now().toString(),
      task: newActionItemTask.trim(),
      owner: newActionItemOwner.trim() || 'Unassigned',
      deadline: 'TBD',
      completed: false
    };
    setActionItems((prev) => [...prev, newItem]);
    setNewActionItemTask('');
    setNewActionItemOwner('');
  };

  const copySummaryText = () => {
    if (!currentMeeting?.summary) return;
    const text = `Title: ${currentMeeting.summary.title}\nDate: ${currentMeeting.summary.date}\n\nExecutive Brief:\n${currentMeeting.summary.executiveBrief}\n\nKey Decisions:\n${currentMeeting.summary.keyDecisions.join('\n')}\n\nAction Items:\n${actionItems.map((a) => `- [${a.completed ? 'x' : ' '}] ${a.task} (${a.owner || 'Unassigned'})`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const copyEmailText = () => {
    const text = currentMeeting?.summary?.followUpEmail || '';
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
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

  const filteredTranscript = useMemo(() => {
    if (!currentMeeting) return [];
    if (!selectedSpeakerFilter) return currentMeeting.transcript;
    return currentMeeting.transcript.filter((t) => t.speaker === selectedSpeakerFilter);
  }, [currentMeeting?.transcript, selectedSpeakerFilter]);

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

        {/* Right: Meeting Actions & Summary Trigger */}
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
                <span>Highlight</span>
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
              onClick={() => onSummarizeMeeting(currentMeeting.id, summaryStyle)}
              disabled={isSummarizing}
              className="glass-button"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                padding: '7px 14px',
                fontWeight: 600
              }}
              title="Generate Local AI Summary with Executive Brief and Action Items"
            >
              <Sparkles size={14} />
              <span>{isSummarizing ? 'Generating...' : 'AI Summary'}</span>
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

          {currentMeeting?.summary && (
            <button
              onClick={() => window.print()}
              className="glass-button"
              style={{ padding: '7px 11px' }}
              title="Print or Save PDF"
            >
              <Printer size={14} />
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

      {/* MN-08: Speaker Diarization & Talk-Time Distribution Ribbon */}
      {speakerStats.length > 0 && (
        <div style={{
          padding: '8px 14px',
          background: 'rgba(11, 15, 25, 0.8)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={13} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>Speaker Diarization & Talk Time</span>
              {selectedSpeakerFilter && (
                <button
                  onClick={() => setSelectedSpeakerFilter(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: 'var(--accent-amber)',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filter ({selectedSpeakerFilter}) ✕
                </button>
              )}
            </div>

            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              Click speaker chip to filter • Double-click to rename
            </span>
          </div>

          {/* Segmented Talk Time Distribution Bar */}
          <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.05)' }}>
            {speakerStats.map((s) => (
              <div
                key={s.name}
                style={{
                  width: `${s.percentage}%`,
                  background: s.color,
                  transition: 'width 0.3s ease'
                }}
                title={`${s.name}: ${s.percentage}% (${formatTime(s.durationEstSeconds)})`}
              />
            ))}
          </div>

          {/* Speaker Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
            {speakerStats.map((s) => {
              const isSelected = selectedSpeakerFilter === s.name;
              return (
                <button
                  key={s.name}
                  onClick={() => setSelectedSpeakerFilter(isSelected ? null : s.name)}
                  onDoubleClick={() => setRenameSpeakerModal({ oldName: s.name, newName: s.name })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isSelected ? `${s.color}25` : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? s.color : 'rgba(255, 255, 255, 0.08)'}`,
                    cursor: 'pointer',
                    color: '#f8fafc',
                    fontSize: '0.72rem'
                  }}
                  title="Click to filter transcript, double-click to rename"
                >
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>{s.percentage}%</span>
                </button>
              );
            })}
          </div>
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
            maxWidth: '56%'
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

                {/* Scrubber & Controls */}
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(10, 14, 24, 0.95)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={togglePlayMedia}
                        className="glass-button primary"
                        style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0 }}
                        title={isPlayingMedia ? 'Pause' : 'Play Video'}
                      >
                        {isPlayingMedia ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
                      </button>

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

        {/* Right Pane: Interactive Transcript, AI Summary & Follow-Up Email */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '340px',
          overflow: 'hidden'
        }}>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`glass-button ${activeTab === 'transcript' ? 'primary' : ''}`}
                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              >
                <FileText size={13} />
                <span>Transcript ({filteredTranscript.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`glass-button ${activeTab === 'summary' ? 'primary' : ''}`}
                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              >
                <Sparkles size={13} />
                <span>Executive Summary {currentMeeting?.summary ? '✅' : ''}</span>
              </button>

              <button
                onClick={() => setActiveTab('email')}
                className={`glass-button ${activeTab === 'email' ? 'primary' : ''}`}
                style={{ padding: '5px 12px', fontSize: '0.78rem' }}
              >
                <Mail size={13} />
                <span>Follow-Up Email</span>
              </button>
            </div>

            {/* Summary Style Trigger Selector */}
            {activeTab === 'summary' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Focus:</span>
                {(['executive', 'detailed', 'action_items'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      setSummaryStyle(style);
                      if (currentMeeting) onSummarizeMeeting(currentMeeting.id, style);
                    }}
                    style={{
                      background: summaryStyle === style ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                      border: summaryStyle === style ? '1px solid var(--accent-amber)' : '1px solid transparent',
                      color: summaryStyle === style ? '#fbbf24' : 'var(--text-muted)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      cursor: 'pointer'
                    }}
                  >
                    {style === 'executive' ? 'Brief' : style === 'detailed' ? 'Detailed' : 'Actions'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab 1: Interactive Transcript with MN-08 Speaker Badges */}
          {activeTab === 'transcript' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                background: 'rgba(10, 13, 20, 0.65)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {!currentMeeting || filteredTranscript.length === 0 ? (
                  <div style={{
                    margin: 'auto',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    maxWidth: '380px'
                  }}>
                    <FileText size={38} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p>Live speech recognition transcript will stream here during your meeting.</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '6px' }}>You can also type notes or tag speakers using the quick input bar below.</p>
                  </div>
                ) : (
                  filteredTranscript.map((entry) => {
                    const isNearCurrent = hasRecording && Math.abs(playbackCurrentTime - entry.timestamp) < 3;
                    const speakerColor = speakerColorMap[entry.speaker] || 'var(--accent-cyan)';

                    return (
                      <div
                        key={entry.id}
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
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {/* MN-08: Interactive Speaker Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => setEditingSpeakerEntryId(editingSpeakerEntryId === entry.id ? null : entry.id)}
                              style={{
                                background: `${speakerColor}20`,
                                border: `1px solid ${speakerColor}`,
                                borderRadius: '4px',
                                padding: '1px 7px',
                                fontSize: '0.72rem',
                                color: speakerColor,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Click to reassign speaker"
                            >
                              <span>{entry.speaker}</span>
                              <ChevronDown size={10} />
                            </button>

                            {/* Speaker Reassignment Dropdown Popover */}
                            {editingSpeakerEntryId === entry.id && (
                              <div style={{
                                position: 'absolute',
                                background: '#121827',
                                border: '1px solid var(--border-active)',
                                borderRadius: '8px',
                                padding: '6px',
                                zIndex: 50,
                                boxShadow: 'var(--shadow-lg)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '2px 4px' }}>Reassign speaker:</span>
                                {speakerStats.map((s) => (
                                  <button
                                    key={s.name}
                                    onClick={() => handleReassignSpeaker(entry.id, s.name)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: s.color,
                                      padding: '3px 8px',
                                      fontSize: '0.72rem',
                                      textAlign: 'left',
                                      cursor: 'pointer',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {s.name}
                                  </button>
                                ))}
                                <button
                                  onClick={() => {
                                    const custom = prompt('Enter new speaker name:');
                                    if (custom) handleReassignSpeaker(entry.id, custom);
                                  }}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    marginTop: '2px'
                                  }}
                                >
                                  + New Speaker...
                                </button>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {entry.bookmarked && (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 6px', borderRadius: '4px' }}>
                                ★ Highlight
                              </span>
                            )}
                            <button
                              onClick={() => handleJumpToTimestamp(entry.timestamp)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '0.72rem',
                                fontFamily: 'var(--font-mono)',
                                color: isNearCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                cursor: 'pointer'
                              }}
                              title="Jump player to this timestamp"
                            >
                              ▶ {formatTime(entry.timestamp)}
                            </button>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.4 }}>
                          {entry.text}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Real-Time Automatic Active Speaker Live Speech Indicator */}
                {isRecording && (interimTranscript || (audioLevel > 0.02 && activeSpeaker)) && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.88)',
                    border: `1.5px solid ${activeSpeaker?.color || '#00f2fe'}`,
                    boxShadow: `0 0 16px ${activeSpeaker?.color || '#00f2fe'}33`,
                    marginTop: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: `${activeSpeaker?.color || '#00f2fe'}25`,
                          border: `1px solid ${activeSpeaker?.color || '#00f2fe'}`,
                          color: activeSpeaker?.color || '#00f2fe',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: activeSpeaker?.color || '#00f2fe',
                            boxShadow: `0 0 8px ${activeSpeaker?.color || '#00f2fe'}`,
                            display: 'inline-block'
                          }} />
                          {activeSpeaker?.name || 'Speaker 1'} (Speaking...)
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Live • {formatTime(seconds)}
                        </span>
                      </div>

                      {/* Mini Live Audio Equalizer Bars */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px' }}>
                        <span style={{ width: '3px', height: `${Math.min(14, Math.max(4, audioLevel * 80))}px`, background: activeSpeaker?.color || '#00f2fe', borderRadius: '2px', transition: 'height 0.08s ease' }} />
                        <span style={{ width: '3px', height: `${Math.min(14, Math.max(6, audioLevel * 120))}px`, background: activeSpeaker?.color || '#00f2fe', borderRadius: '2px', transition: 'height 0.08s ease' }} />
                        <span style={{ width: '3px', height: `${Math.min(14, Math.max(3, audioLevel * 60))}px`, background: activeSpeaker?.color || '#00f2fe', borderRadius: '2px', transition: 'height 0.08s ease' }} />
                      </div>
                    </div>

                    <p style={{
                      margin: '2px 0 0',
                      fontSize: '0.88rem',
                      color: '#f8fafc',
                      lineHeight: 1.4
                    }}>
                      {interimTranscript ? (
                        <>
                          <span>{interimTranscript}</span>
                          <span style={{
                            display: 'inline-block',
                            width: '2px',
                            height: '1.1em',
                            background: activeSpeaker?.color || '#00f2fe',
                            marginLeft: '4px',
                            verticalAlign: 'middle'
                          }} />
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Listening to voice...
                        </span>
                      )}
                    </p>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Quick Note & Manual Transcript Entry Box */}
              {currentMeeting && (
                <form onSubmit={handleAddManualNote} style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="Speaker name"
                    value={manualSpeakerName}
                    onChange={(e) => setManualSpeakerName(e.target.value)}
                    style={{
                      width: '110px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Type note, agenda point, or manual transcript line..."
                    value={manualNoteText}
                    onChange={(e) => setManualNoteText(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />

                  <button
                    type="submit"
                    className="glass-button primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    <Plus size={13} />
                    <span>Add Note</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Full Executive Summary, Decisions & Action Items */}
          {activeTab === 'summary' && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(10, 13, 20, 0.65)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {currentMeeting?.summary ? (
                <>
                  {/* Summary Title & Tone Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>
                          {currentMeeting.summary.title}
                        </h3>
                        {currentMeeting.summary.sentiment && (
                          <span style={{
                            fontSize: '0.68rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--accent-emerald)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            🌟 {currentMeeting.summary.sentiment}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {currentMeeting.summary.date} • {formatTime(currentMeeting.summary.durationSeconds)} duration
                      </div>
                    </div>

                    <button
                      onClick={copySummaryText}
                      className="glass-button"
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                    >
                      {copiedSummary ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                      <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Executive Brief */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Executive Brief
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55, background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', margin: 0 }}>
                      {currentMeeting.summary.executiveBrief}
                    </p>
                  </div>

                  {/* Key Decisions */}
                  {currentMeeting.summary.keyDecisions.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Key Decisions & Outcomes
                      </h4>
                      <ul style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {currentMeeting.summary.keyDecisions.map((decision, i) => (
                          <li key={i} style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Interactive Action Items */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                        Action Items ({actionItems.filter((a) => a.completed).length}/{actionItems.length})
                      </h4>
                    </div>

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
                          <div style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : '#f8fafc', fontSize: '0.84rem' }}>
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

                      {/* Add Custom Action Item */}
                      <form onSubmit={handleAddCustomActionItem} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          placeholder="New action item task..."
                          value={newActionItemTask}
                          onChange={(e) => setNewActionItemTask(e.target.value)}
                          style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            color: '#fff',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Assignee"
                          value={newActionItemOwner}
                          onChange={(e) => setNewActionItemOwner(e.target.value)}
                          style={{
                            width: '100px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            color: '#fff',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                        />
                        <button type="submit" className="glass-button" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                          <Plus size={12} />
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Speaker Contributions (MN-08) */}
                  {currentMeeting.summary.speakerContributions && currentMeeting.summary.speakerContributions.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Participant Contributions
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {currentMeeting.summary.speakerContributions.map((sc, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '8px 12px',
                              background: 'rgba(139, 92, 246, 0.06)',
                              borderRadius: '8px',
                              border: '1px solid rgba(139, 92, 246, 0.2)',
                              fontSize: '0.82rem'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--accent-violet)', marginRight: '6px' }}>
                              {sc.speaker}:
                            </span>
                            <span style={{ color: '#e2e8f0' }}>{sc.contribution}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Topics Tags */}
                  {currentMeeting.summary.keyTopics.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Key Topics
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {currentMeeting.summary.keyTopics.map((topic, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.72rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            #{topic}
                          </span>
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
                  <Sparkles size={38} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p>Click "AI Summary" above to generate structured executive minutes, key decisions, and action items.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Generated Follow-Up Email */}
          {activeTab === 'email' && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(10, 13, 20, 0.65)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} color="var(--accent-cyan)" />
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>Follow-Up Recap Email</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={copyEmailText}
                    className="glass-button"
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  >
                    {copiedEmail ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                    <span>{copiedEmail ? 'Copied to Clipboard' : 'Copy Email'}</span>
                  </button>

                  {currentMeeting && (
                    <button
                      onClick={() => onSummarizeMeeting(currentMeeting.id, 'email')}
                      disabled={isSummarizing}
                      className="glass-button primary"
                      style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                    >
                      <Sparkles size={12} />
                      <span>{isSummarizing ? 'Writing...' : 'Regenerate Email'}</span>
                    </button>
                  )}
                </div>
              </div>

              {currentMeeting?.summary?.followUpEmail ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  fontSize: '0.86rem',
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)'
                }}>
                  {currentMeeting.summary.followUpEmail}
                </div>
              ) : (
                <div style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  maxWidth: '380px'
                }}>
                  <Mail size={38} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p>Click "AI Summary" or "Regenerate Email" above to automatically generate a team recap email draft.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rename Speaker Modal */}
      {renameSpeakerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            background: '#0d111d',
            border: '1px solid var(--border-active)',
            borderRadius: '14px',
            padding: '20px',
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>
              Rename Speaker
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Rename "{renameSpeakerModal.oldName}" across the entire transcript:
            </p>
            <input
              type="text"
              value={renameSpeakerModal.newName}
              onChange={(e) => setRenameSpeakerModal({ ...renameSpeakerModal, newName: e.target.value })}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setRenameSpeakerModal(null)}
                className="glass-button"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSpeakerAcrossAll}
                className="glass-button primary"
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {m.hasVideo || m.videoUrl || m.audioSource === 'tab' || m.audioSource === 'both' ? (
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
