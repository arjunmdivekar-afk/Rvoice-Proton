import { Check, Code2, Copy, Download, FileCode, Play, Send, Terminal } from 'lucide-react';
import React, { useState } from 'react';
import { ChatMessage } from '../../../../shared/types';

interface CodeStudioProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendPrompt: (text: string) => void;
}

export const CodeStudio: React.FC<CodeStudioProps> = ({
  messages,
  streamingText,
  isStreaming,
  onSendPrompt
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');

  // Extract the latest code snippet if available
  const extractCode = (text: string): { code: string; lang: string } | null => {
    const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
    if (match) {
      return { lang: match[1] || 'plaintext', code: match[2].trim() };
    }
    return null;
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    onSendPrompt(inputText.trim());
    setInputText('');
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleDownload = (code: string, lang: string) => {
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rs',
      sql: 'sql',
      html: 'html',
      css: 'css',
      json: 'json'
    };
    const ext = extensions[lang.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snippet-${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Find the latest code snippet in chat or streaming text
  const currentSnippet = extractCode(streamingText) ||
    [...messages].reverse().map(m => extractCode(m.content)).find(c => c !== null);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '400px 1fr',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      borderTop: '1px solid var(--border-subtle)'
    }}>
      {/* Left Column: Text-Only Chat Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        background: 'rgba(10, 13, 20, 0.75)',
        height: '100%'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--accent-violet)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Text Prompting & Chat</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TTS Disabled</span>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && !streamingText && (
            <div style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              maxWidth: '280px'
            }}>
              <FileCode size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Type your programming question or feature request. Complete code will appear in the Code Canvas.</p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: m.role === 'user' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${m.role === 'user' ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)'}`,
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: m.role === 'user' ? '#c084fc' : '#34d399', marginBottom: '4px' }}>
                {m.role === 'user' ? 'You' : 'Code Studio'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {/* Strip large code blocks from the compact left chat */}
                {m.content.replace(/```[\s\S]*?```/g, '*(See Code Canvas on the right)*')}
              </div>
            </div>
          ))}

          {streamingText && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-active)',
              fontSize: '0.85rem',
              lineHeight: 1.5
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                Code Studio (Streaming...)
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {streamingText.replace(/```[\s\S]*?```/g, '*(Streaming Code Canvas...)*')}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="e.g. Write a Fastify JWT auth middleware in TS..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isStreaming}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="glass-button primary"
              style={{ padding: '8px 14px' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Dedicated IDE-Style Code Canvas */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#07090e',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Code Canvas Toolbar */}
        <div style={{
          height: '48px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(12, 16, 26, 0.9)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={16} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Code Canvas</span>
            {currentSnippet && (
              <span style={{
                background: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: '#00f2fe',
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)'
              }}>
                {currentSnippet.lang}
              </span>
            )}
          </div>

          {currentSnippet && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleCopy(currentSnippet.code, 'current')}
                className="glass-button"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {copiedCodeId === 'current' ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedCodeId === 'current' ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleDownload(currentSnippet.code, currentSnippet.lang)}
                className="glass-button"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <Download size={14} />
                <span>Save File</span>
              </button>
            </div>
          )}
        </div>

        {/* Code Viewer Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', position: 'relative' }}>
          {currentSnippet ? (
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: '#e2e8f0',
              tabSize: 2
            }}>
              <code>{currentSnippet.code}</code>
            </pre>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '12px'
            }}>
              <Code2 size={48} opacity={0.3} />
              <p style={{ fontSize: '0.9rem' }}>No code generated yet. Send a prompt on the left to start coding.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
