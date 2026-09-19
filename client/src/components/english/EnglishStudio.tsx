import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  HelpCircle,
  Layers,
  MessageSquare,
  RefreshCw,
  Send,
  Shuffle,
  Sparkles,
  Volume2,
  XCircle
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, VocabCard, VocabEvaluation } from '../../../../shared/types';

// Curated comprehensive vocabulary deck across difficulty tiers
export const CURATED_VOCAB_DECK: VocabCard[] = [
  {
    id: 'v1',
    word: 'Eloquent',
    partOfSpeech: 'adjective',
    phonetic: '/ˈɛl.ə.kwənt/',
    difficulty: 'intermediate',
    correctDefinition: 'Fluent or persuasive in speaking or writing; clearly expressing ideas.',
    exampleSentence: 'Her eloquent presentation convinced the executive committee to approve the project.',
    synonyms: ['Articulate', 'Expressive', 'Fluent', 'Persuasive'],
    antonyms: ['Inarticulate', 'Hesitant']
  },
  {
    id: 'v2',
    word: 'Resilient',
    partOfSpeech: 'adjective',
    phonetic: '/rɪˈzɪl.jənt/',
    difficulty: 'beginner',
    correctDefinition: 'Able to withstand or recover quickly from difficult conditions or setbacks.',
    exampleSentence: 'The startup proved resilient despite the sudden market downturn.',
    synonyms: ['Tough', 'Adaptable', 'Robust', 'Enduring'],
    antonyms: ['Fragile', 'Vulnerable']
  },
  {
    id: 'v3',
    word: 'Pragmatic',
    partOfSpeech: 'adjective',
    phonetic: '/præɡˈmæt.ɪk/',
    difficulty: 'intermediate',
    correctDefinition: 'Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.',
    exampleSentence: 'We need a pragmatic solution that works within our current budget.',
    synonyms: ['Practical', 'Realistic', 'Sensible', 'Hard-headed'],
    antonyms: ['Idealistic', 'Impractical']
  },
  {
    id: 'v4',
    word: 'Ambiguous',
    partOfSpeech: 'adjective',
    phonetic: '/æmˈbɪɡ.ju.əs/',
    difficulty: 'intermediate',
    correctDefinition: 'Open to more than one interpretation; not having one obvious meaning; unclear.',
    exampleSentence: 'The contract contained ambiguous language that led to a legal dispute.',
    synonyms: ['Equivocal', 'Unclear', 'Vague', 'Obscure'],
    antonyms: ['Clear', 'Definite', 'Unambiguous']
  },
  {
    id: 'v5',
    word: 'Ephemeral',
    partOfSpeech: 'adjective',
    phonetic: '/ɪˈfɛm.ər.əl/',
    difficulty: 'advanced',
    correctDefinition: 'Lasting for a very short time; fleeting or transient.',
    exampleSentence: 'Fame on social media can be ephemeral, vanishing as quickly as it arrives.',
    synonyms: ['Transient', 'Fleeting', 'Momentary', 'Short-lived'],
    antonyms: ['Permanent', 'Enduring', 'Eternal']
  },
  {
    id: 'v6',
    word: 'Meticulous',
    partOfSpeech: 'adjective',
    phonetic: '/məˈtɪk.jʊ.ləs/',
    difficulty: 'intermediate',
    correctDefinition: 'Showing great attention to detail; very careful and precise.',
    exampleSentence: 'The architect was meticulous about checking every measurement.',
    synonyms: ['Diligent', 'Scrupulous', 'Painstaking', 'Thorough'],
    antonyms: ['Careless', 'Sloppy', 'Slapdash']
  },
  {
    id: 'v7',
    word: 'Ubiquitous',
    partOfSpeech: 'adjective',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    difficulty: 'advanced',
    correctDefinition: 'Present, appearing, or found everywhere at the same time.',
    exampleSentence: 'Smartphones have become ubiquitous in modern daily life.',
    synonyms: ['Omnipresent', 'Pervasive', 'Prevalent', 'Universal'],
    antonyms: ['Rare', 'Scarce', 'Uncommon']
  },
  {
    id: 'v8',
    word: 'Candor',
    partOfSpeech: 'noun',
    phonetic: '/ˈkæn.dər/',
    difficulty: 'intermediate',
    correctDefinition: 'The quality of being open, honest, and sincere in speech or expression.',
    exampleSentence: 'I appreciate your candor in sharing honest feedback on the draft.',
    synonyms: ['Honesty', 'Frankness', 'Openness', 'Sincerity'],
    antonyms: ['Deceit', 'Dishonesty', 'Insincerity']
  },
  {
    id: 'v9',
    word: 'Benevolent',
    partOfSpeech: 'adjective',
    phonetic: '/bəˈnɛv.əl.ənt/',
    difficulty: 'beginner',
    correctDefinition: 'Well-meaning, kindly, and motivated by a desire to do good to others.',
    exampleSentence: 'A benevolent donor provided scholarships for dozens of underprivileged students.',
    synonyms: ['Kind', 'Generous', 'Altruistic', 'Charitable'],
    antonyms: ['Malevolent', 'Spiteful', 'Hostile']
  },
  {
    id: 'v10',
    word: 'Fastidious',
    partOfSpeech: 'adjective',
    phonetic: '/fæˈstɪd.i.əs/',
    difficulty: 'advanced',
    correctDefinition: 'Very attentive to and concerned about accuracy and detail; hard to please.',
    exampleSentence: 'He was fastidious about the hygiene and preparation in his kitchen.',
    synonyms: ['Demanding', 'Exacting', 'Finicky', 'Punctilious'],
    antonyms: ['Careless', 'Easy-going']
  },
  {
    id: 'v11',
    word: 'Perseverance',
    partOfSpeech: 'noun',
    phonetic: '/ˌpɜː.sɪˈvɪə.rəns/',
    difficulty: 'beginner',
    correctDefinition: 'Persistence in doing something despite difficulty or delay in achieving success.',
    exampleSentence: 'Through perseverance and hard work, she mastered fluent conversational English.',
    synonyms: ['Persistence', 'Tenacity', 'Determination', 'Endurance'],
    antonyms: ['Giving up', 'Hesitation']
  },
  {
    id: 'v12',
    word: 'Serendipity',
    partOfSpeech: 'noun',
    phonetic: '/ˌsɛr.ənˈdɪp.ɪ.ti/',
    difficulty: 'advanced',
    correctDefinition: 'The occurrence and development of events by chance in a happy or beneficial way.',
    exampleSentence: 'Finding my future business partner at an airport was pure serendipity.',
    synonyms: ['Good fortune', 'Chance', 'Fluke', 'Happy accident'],
    antonyms: ['Misfortune', 'Bad luck']
  }
];

interface EnglishStudioProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendPrompt: (text: string) => void;
  onEvaluateVocab?: (card: VocabCard, userMeaning: string) => void;
  latestEvaluation?: VocabEvaluation | null;
  isEvaluatingVocab?: boolean;
}

export const EnglishStudio: React.FC<EnglishStudioProps> = ({
  messages,
  streamingText,
  isStreaming,
  onSendPrompt,
  onEvaluateVocab,
  latestEvaluation,
  isEvaluatingVocab
}) => {
  // Navigation Tabs: 'cards' (Vocabulary Meaning Challenge) | 'chat' (Strict English Tutor Chat)
  const [activeTab, setActiveTab] = useState<'cards' | 'chat'>('cards');

  // Vocabulary Challenge State
  const [deck, setDeck] = useState<VocabCard[]>(CURATED_VOCAB_DECK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [userMeaningInput, setUserMeaningInput] = useState('');
  const [localEvaluation, setLocalEvaluation] = useState<VocabEvaluation | null>(null);
  const [isLocalEvaluating, setIsLocalEvaluating] = useState(false);

  // Score & Streak Tracker
  const [stats, setStats] = useState({
    streak: 0,
    bestStreak: 0,
    totalAttempted: 0,
    totalCorrect: 0
  });

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    if (difficultyFilter === 'all') return deck;
    return deck.filter((c) => c.difficulty === difficultyFilter);
  }, [deck, difficultyFilter]);

  const activeCard: VocabCard = filteredCards[currentIndex % Math.max(1, filteredCards.length)] || deck[0];

  // Sync external evaluation
  useEffect(() => {
    if (latestEvaluation && latestEvaluation.cardId === activeCard.id) {
      setLocalEvaluation(latestEvaluation);
      setIsLocalEvaluating(false);
      updateStats(latestEvaluation.verdict);
    }
  }, [latestEvaluation]);

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  // Update Score & Streak
  const updateStats = (verdict: 'correct' | 'partially_correct' | 'incorrect') => {
    setStats((prev) => {
      const isCorrect = verdict === 'correct';
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        totalAttempted: prev.totalAttempted + 1,
        totalCorrect: isCorrect ? prev.totalCorrect + 1 : prev.totalCorrect
      };
    });
  };

  // Pronounce Word (EN-04 Audio Phonetic Engine)
  const handlePronounce = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // clear, slightly deliberate pace for learners
    utterance.pitch = 1.0;

    // Pick natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) utterance.voice = enVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Submit User Meaning for AI Evaluation (EN-02)
  const handleSubmitMeaning = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userMeaningInput.trim() || isLocalEvaluating || isEvaluatingVocab) return;

    setIsLocalEvaluating(true);

    if (onEvaluateVocab) {
      onEvaluateVocab(activeCard, userMeaningInput.trim());
    } else {
      // Internal smart fallback evaluation
      setTimeout(() => {
        const cleanUser = userMeaningInput.toLowerCase().trim();
        const cleanDef = activeCard.correctDefinition.toLowerCase();
        const userWords = cleanUser.split(/\s+/).filter((w) => w.length > 3);
        const defWords = cleanDef.split(/\s+/).filter((w) => w.length > 3);
        const matches = userWords.filter((w) => defWords.some((d) => d.includes(w) || w.includes(d)));
        const matchRatio = userWords.length > 0 ? matches.length / userWords.length : 0;

        let verdict: 'correct' | 'partially_correct' | 'incorrect' = 'incorrect';
        let score = 35;
        if (matchRatio >= 0.35 || cleanDef.includes(cleanUser) || activeCard.synonyms.some((s) => cleanUser.includes(s.toLowerCase()))) {
          verdict = 'correct';
          score = 92;
        } else if (matchRatio > 0.1 || userWords.length >= 2) {
          verdict = 'partially_correct';
          score = 65;
        }

        const evalResult: VocabEvaluation = {
          cardId: activeCard.id,
          word: activeCard.word,
          userMeaning: userMeaningInput.trim(),
          verdict,
          score,
          feedback:
            verdict === 'correct'
              ? `Outstanding! Your explanation accurately conveys the meaning of "${activeCard.word}".`
              : verdict === 'partially_correct'
              ? `Good effort! You captured part of "${activeCard.word}", but the formal definition is more specific.`
              : `Not quite. "${activeCard.word}" means: ${activeCard.correctDefinition}.`,
          betterPhrasing: activeCard.correctDefinition,
          correctDefinition: activeCard.correctDefinition,
          exampleSentence: activeCard.exampleSentence,
          synonyms: activeCard.synonyms
        };

        setLocalEvaluation(evalResult);
        setIsLocalEvaluating(false);
        updateStats(verdict);
      }, 700);
    }
  };

  // Next Word Navigation
  const handleNextWord = () => {
    setUserMeaningInput('');
    setLocalEvaluation(null);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  // Random Word Shuffle
  const handleShuffleWord = () => {
    setUserMeaningInput('');
    setLocalEvaluation(null);
    const rand = Math.floor(Math.random() * filteredCards.length);
    setCurrentIndex(rand);
  };

  // Chat Send Handler
  const handleSendChat = () => {
    if (!chatInput.trim() || isStreaming) return;
    onSendPrompt(chatInput.trim());
    setChatInput('');
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const accuracyPercent = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      padding: '16px 24px',
      gap: '14px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.08) 0%, rgba(5, 6, 8, 0.98) 75%)'
    }}>
      {/* Top Bar: Tabs & Streak Metrics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        {/* Sub-Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('cards')}
            className={`glass-button ${activeTab === 'cards' ? 'primary' : ''}`}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              borderColor: activeTab === 'cards' ? '#10b981' : 'var(--border-subtle)',
              color: activeTab === 'cards' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            <Layers size={15} />
            <span>Vocabulary Cards Challenge</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`glass-button ${activeTab === 'chat' ? 'primary' : ''}`}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              borderColor: activeTab === 'chat' ? '#10b981' : 'var(--border-subtle)',
              color: activeTab === 'chat' ? '#34d399' : 'var(--text-secondary)'
            }}
          >
            <MessageSquare size={15} />
            <span>Strict English & Grammar Tutor</span>
          </button>
        </div>

        {/* Learning Streak & Stats Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            color: '#fbbf24',
            fontWeight: 600
          }}>
            <Flame size={14} color="#f59e0b" />
            <span>{stats.streak} Streak</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            color: '#34d399',
            fontWeight: 600
          }}>
            <Award size={14} color="#10b981" />
            <span>{accuracyPercent}% Accuracy ({stats.totalCorrect}/{stats.totalAttempted})</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: VOCABULARY FLASHCARD MEANING CHALLENGE (EN-02 & EN-04) */}
      {activeTab === 'cards' && (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 460px) 1fr',
          gap: '20px',
          overflow: 'hidden',
          minHeight: 0
        }}>
          {/* Left Column: Interactive 3D Word Flashcard & Audio Pronunciation */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto'
          }}>
            {/* Difficulty Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Level:</span>
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setDifficultyFilter(lvl);
                    setCurrentIndex(0);
                    setUserMeaningInput('');
                    setLocalEvaluation(null);
                  }}
                  style={{
                    background: difficultyFilter === lvl ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${difficultyFilter === lvl ? '#10b981' : 'var(--border-subtle)'}`,
                    color: difficultyFilter === lvl ? '#34d399' : 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Word Flashcard Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(15, 23, 42, 0.85))',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative'
            }}>
              {/* Card Meta Tag Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}>
                    {activeCard.partOfSpeech}
                  </span>
                  <span style={{
                    background:
                      activeCard.difficulty === 'beginner'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : activeCard.difficulty === 'intermediate'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(236, 72, 153, 0.15)',
                    border: `1px solid ${
                      activeCard.difficulty === 'beginner'
                        ? '#38bdf8'
                        : activeCard.difficulty === 'intermediate'
                        ? '#f59e0b'
                        : '#ec4899'
                    }`,
                    color:
                      activeCard.difficulty === 'beginner'
                        ? '#38bdf8'
                        : activeCard.difficulty === 'intermediate'
                        ? '#fbbf24'
                        : '#f472b6',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'capitalize'
                  }}>
                    {activeCard.difficulty}
                  </span>
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Card {(currentIndex % filteredCards.length) + 1} of {filteredCards.length}
                </span>
              </div>

              {/* Word Display & Audio Pronunciation Button (EN-04) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.4rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #ffffff 40%, #34d399 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {activeCard.word}
                  </h1>
                  {activeCard.phonetic && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                      display: 'inline-block'
                    }}>
                      {activeCard.phonetic}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handlePronounce(activeCard.word)}
                  className="glass-button"
                  title="Listen to native pronunciation (EN-04)"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Volume2 size={22} />
                </button>
              </div>

              {/* Synonyms (Revealed ONLY after user has submitted their answer to the AI) */}
              {localEvaluation ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', alignSelf: 'center', fontWeight: 600 }}>
                    Unlocked Synonyms:
                  </span>
                  {activeCard.synonyms.map((syn) => (
                    <span
                      key={syn}
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        color: '#34d399'
                      }}
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🔒 Synonyms unlocked after submitting your definition
                  </span>
                </div>
              )}

              {/* Card Controls: Next & Shuffle */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={handleNextWord}
                  className="glass-button"
                  style={{ flex: 1, padding: '8px 14px', fontSize: '0.8rem', justifyContent: 'center' }}
                >
                  <ArrowRight size={15} />
                  <span>Next Word</span>
                </button>

                <button
                  onClick={handleShuffleWord}
                  className="glass-button"
                  title="Random shuffle word"
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  <Shuffle size={15} />
                </button>
              </div>
            </div>

            {/* Quick Tips Box */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5
            }}>
              💡 <strong>How to Play:</strong> Read the word and listen to its pronunciation. In the text box on the right, write what you think this word means. The AI will analyze your explanation and score your accuracy!
            </div>
          </div>

          {/* Right Column: User Meaning Text Box & AI Evaluation Card (EN-02) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto'
          }}>
            {/* Input Form: User Writes Meaning */}
            <form
              onSubmit={handleSubmitMeaning}
              style={{
                background: 'rgba(10, 13, 20, 0.65)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={16} color="#34d399" />
                  <span>What does &quot;{activeCard.word}&quot; mean?</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {userMeaningInput.length} characters
                </span>
              </div>

              <textarea
                value={userMeaningInput}
                onChange={(e) => setUserMeaningInput(e.target.value)}
                placeholder="In your own words, write what this word means or how it is used..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.9rem',
                  color: '#fff',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.4
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitMeaning();
                  }
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Press Ctrl+Enter or click Check Meaning
                </span>

                <button
                  type="submit"
                  disabled={!userMeaningInput.trim() || isLocalEvaluating || isEvaluatingVocab}
                  className="glass-button primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.82rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderColor: '#34d399',
                    color: '#fff',
                    fontWeight: 600
                  }}
                >
                  <Sparkles size={15} />
                  <span>{isLocalEvaluating || isEvaluatingVocab ? 'Analyzing Meaning...' : 'Check Meaning with AI'}</span>
                </button>
              </div>
            </form>

            {/* AI Correctness Evaluation Card (EN-02) */}
            {localEvaluation && (
              <div style={{
                background:
                  localEvaluation.verdict === 'correct'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : localEvaluation.verdict === 'partially_correct'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(244, 63, 94, 0.08)',
                border: `1.5px solid ${
                  localEvaluation.verdict === 'correct'
                    ? '#10b981'
                    : localEvaluation.verdict === 'partially_correct'
                    ? '#f59e0b'
                    : '#f43f5e'
                }`,
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: `0 8px 30px ${
                  localEvaluation.verdict === 'correct'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : localEvaluation.verdict === 'partially_correct'
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(244, 63, 94, 0.15)'
                }`
              }}>
                {/* Header Verdict & Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {localEvaluation.verdict === 'correct' ? (
                      <CheckCircle2 size={24} color="#10b981" />
                    ) : localEvaluation.verdict === 'partially_correct' ? (
                      <AlertCircle size={24} color="#f59e0b" />
                    ) : (
                      <XCircle size={24} color="#f43f5e" />
                    )}
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color:
                          localEvaluation.verdict === 'correct'
                            ? '#34d399'
                            : localEvaluation.verdict === 'partially_correct'
                            ? '#fbbf24'
                            : '#fb7185'
                      }}>
                        {localEvaluation.verdict === 'correct'
                          ? 'Correct Definition!'
                          : localEvaluation.verdict === 'partially_correct'
                          ? 'Partially Correct'
                          : 'Needs Work'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        AI Correctness Score
                      </span>
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    color:
                      localEvaluation.score >= 80
                        ? '#34d399'
                        : localEvaluation.score >= 50
                        ? '#fbbf24'
                        : '#fb7185',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {localEvaluation.score} / 100
                  </div>
                </div>

                {/* AI Feedback */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  color: '#f1f5f9'
                }}>
                  {localEvaluation.feedback}
                </div>

                {/* Dictionary Definition & Example */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <strong>Official Definition:</strong> {localEvaluation.correctDefinition}
                  </div>
                  <div style={{
                    fontSize: '0.82rem',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    borderLeft: '3px solid #10b981'
                  }}>
                    &quot;{localEvaluation.exampleSentence}&quot;
                  </div>

                  {/* Synonyms & Antonyms (Revealed after answer is given) */}
                  {((localEvaluation.synonyms && localEvaluation.synonyms.length > 0) || (activeCard.synonyms && activeCard.synonyms.length > 0)) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Key Synonyms:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(localEvaluation.synonyms || activeCard.synonyms).map((syn) => (
                          <span
                            key={syn}
                            style={{
                              background: 'rgba(52, 211, 153, 0.12)',
                              border: '1px solid rgba(52, 211, 153, 0.35)',
                              borderRadius: '6px',
                              padding: '3px 10px',
                              fontSize: '0.75rem',
                              color: '#34d399',
                              fontWeight: 500
                            }}
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Challenge Button */}
                <button
                  onClick={handleNextWord}
                  className="glass-button"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    padding: '10px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    justifyContent: 'center',
                    marginTop: '4px'
                  }}
                >
                  <span>Continue to Next Word</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: STRICT ENGLISH & GRAMMAR TUTOR CHAT (EN-01 & EN-03) */}
      {activeTab === 'chat' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflow: 'hidden',
          minHeight: 0
        }}>
          {/* Strict English Guardrails Banner */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#34d399' }}>
              <BookOpen size={15} />
              <span>
                <strong>Strict English & Grammar Mode Active:</strong> Only English language, grammar rules, vocabulary, and writing practice are discussed.
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Zero Coding • 100% English Learning
            </span>
          </div>

          {/* Quick Prompt Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', flexShrink: 0 }}>
            {[
              "Explain the difference between 'affect' and 'effect'",
              "Teach me 3 advanced business idioms",
              "Check my grammar: 'She don't have no time'",
              "Give me a 5-question vocabulary quiz",
              "How to use semicolons vs commas?"
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  onSendPrompt(chip);
                }}
                disabled={isStreaming}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: 'rgba(10, 13, 20, 0.65)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted)',
                maxWidth: '420px',
                padding: '20px'
              }}>
                <Brain size={42} style={{ margin: '0 auto 12px', color: '#10b981', opacity: 0.7 }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f1f5f9' }}>English & Grammar AI Tutor</h3>
                <p style={{ fontSize: '0.82rem', marginTop: '6px', lineHeight: 1.5 }}>
                  Ask questions about English grammar, check sentences for errors, expand your vocabulary, or practice everyday conversation.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    gap: '6px'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background:
                      msg.role === 'user'
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 95, 70, 0.4))'
                        : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                    color: '#f8fafc',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>

                  {/* Assistant Actions Bar: Audio Pronounce & Copy */}
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
                      <button
                        onClick={() => handlePronounce(msg.content)}
                        className="glass-button"
                        title="Listen to this explanation (EN-04)"
                        style={{ padding: '2px 8px', fontSize: '0.7rem', color: '#34d399', background: 'transparent', border: 'none' }}
                      >
                        <Volume2 size={13} />
                        <span>Listen</span>
                      </button>

                      <button
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className="glass-button"
                        title="Copy text"
                        style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'transparent', border: 'none' }}
                      >
                        {copiedId === msg.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* In-Flight Streaming Message */}
            {isStreaming && streamingText && (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: '14px 14px 14px 2px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#f8fafc',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {streamingText}
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1em',
                  background: '#10b981',
                  marginLeft: '4px',
                  verticalAlign: 'middle',
                  animation: 'pulse 1s infinite'
                }} />
              </div>
            )}

            <div ref={chatScrollRef} />
          </div>

          {/* Chat Input Box */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(10, 13, 20, 0.85)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '6px 10px',
            flexShrink: 0
          }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask an English grammar question or practice sentences..."
              disabled={isStreaming}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendChat();
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.88rem',
                padding: '6px 8px'
              }}
            />

            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isStreaming}
              className="glass-button primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderColor: '#34d399',
                color: '#fff'
              }}
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
