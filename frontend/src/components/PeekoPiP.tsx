import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

interface PeekoPiPProps {
  isSessionActive: boolean;
  transcript?: string;
  isGenerating?: boolean;
}

export function PeekoPiP({ isSessionActive, transcript = '', isGenerating = false }: PeekoPiPProps) {
  const { flashcards, peekoState, level } = useStore();
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get keywords from the latest flashcard
  const latestKeywords = flashcards.length > 0 
    ? flashcards[0].keywords.slice(0, 4) 
    : [];

  // Get latest summary from flashcards
  const latestSummary = flashcards.length > 0 
    ? flashcards[0].front 
    : '';

  // Get last 2 sentences from transcript
  const getLastSentences = (text: string, count: number = 2) => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(-count).join('. ').trim() + (sentences.length > 0 ? '.' : '');
  };

  const lastTranscript = getLastSentences(transcript, 2);

  useEffect(() => {
    // Check if Document PiP is supported
    setIsPiPSupported('documentPictureInPicture' in window);
  }, []);

  // Auto-open PiP when tab becomes hidden (user switches tabs)
  useEffect(() => {
    if (!isPiPSupported || !isSessionActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSessionActive && !isPiPOpen) {
        // User switched away from tab - auto-open PiP
        openPiP();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPiPSupported, isSessionActive, isPiPOpen]);

  useEffect(() => {
    // Update PiP content when state changes
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      updatePiPContent();
    }
  }, [flashcards, peekoState, level, transcript, isGenerating]);

  // Close PiP when session ends
  useEffect(() => {
    if (!isSessionActive && pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      setIsPiPOpen(false);
    }
  }, [isSessionActive]);

  const getFoxEmoji = () => {
    switch (level) {
      case 1: return '🦊';
      case 2: return '🦊';
      case 3: return '🦊';
      case 4: return '🦊🎓';
      case 5: return '🦊✨';
      default: return '🦊';
    }
  };

  const getPeekoAnimation = () => {
    switch (peekoState) {
      case 'calm': return 'animate-bounce-slow';
      case 'fidgety': return 'animate-wiggle';
      case 'puffed': return 'animate-pulse';
      case 'happy': return 'animate-bounce';
      case 'sleepy': return 'animate-fade';
      default: return '';
    }
  };

  const updatePiPContent = () => {
    if (!pipWindowRef.current || pipWindowRef.current.closed) return;

    const doc = pipWindowRef.current.document;
    const foxEl = doc.getElementById('peeko-fox');
    const keywordsEl = doc.getElementById('peeko-keywords');
    const stateEl = doc.getElementById('peeko-state');
    const transcriptEl = doc.getElementById('peeko-transcript');
    const summaryEl = doc.getElementById('peeko-summary');

    if (foxEl) {
      foxEl.textContent = getFoxEmoji();
      foxEl.className = `fox ${getPeekoAnimation()}`;
    }
    if (stateEl) {
      stateEl.textContent = `Lvl ${level} • ${peekoState}`;
    }
    if (keywordsEl) {
      keywordsEl.innerHTML = latestKeywords.map((kw, i) => 
        `<span class="keyword" style="animation-delay: ${i * 0.2}s">${kw}</span>`
      ).join('');
    }
    if (transcriptEl) {
      const lastSentences = getLastSentences(transcript || '', 2);
      transcriptEl.textContent = lastSentences || 'Listening...';
      transcriptEl.className = `transcript-text ${!lastSentences ? 'empty-state' : ''}`;
    }
    if (summaryEl) {
      const latestSummary = flashcards.length > 0 ? flashcards[0].front : '';
      if (isGenerating || (!latestSummary && isSessionActive)) {
        summaryEl.textContent = '';
        summaryEl.className = 'summary-text generating';
      } else {
        summaryEl.textContent = latestSummary || 'No summary yet';
        summaryEl.className = `summary-text ${!latestSummary ? 'empty-state' : ''}`;
      }
    }
  };

  const openPiP = async () => {
    if (!isPiPSupported) {
      alert('Picture-in-Picture is not supported in this browser');
      return;
    }

    try {
      // @ts-ignore - Document PiP API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 300,
        height: 400,
      });

      pipWindowRef.current = pipWindow;

      // Add styles to PiP window
      const style = pipWindow.document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          text-align: center;
        }
        .fox {
          font-size: 20px;
          margin-bottom: 8px;
        }
        .state {
          font-size: 14px;
          color: #9a3412;
          font-weight: 600;
          margin-bottom: 20px;
          text-transform: capitalize;
        }
        .keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          max-width: 260px;
        }
        .keyword {
          background: #ea580c;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          to { opacity: 1; transform: translateY(0); }
          from { opacity: 0; transform: translateY(10px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
        .animate-pulse { animation: pulse 1s ease-in-out infinite; }
        .animate-bounce { animation: bounce 0.5s ease infinite; }
        .animate-fade { opacity: 0.7; }
        .hint {
          position: absolute;
          bottom: 8px;
          font-size: 10px;
          color: #9a3412;
          opacity: 0.7;
        }
        .transcript-section {
          margin-top: 12px;
          padding: 10px;
          background: rgba(255, 237, 213, 0.8);
          border-radius: 10px;
          max-width: 280px;
          width: 100%;
        }
        .transcript-label {
          font-size: 10px;
          color: #9a3412;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .transcript-text {
          font-size: 12px;
          color: #431407;
          line-height: 1.4;
          max-height: 50px;
          overflow-y: auto;
        }
        .summary-section {
          margin-top: 8px;
          padding: 10px;
          background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
          border-radius: 10px;
          max-width: 280px;
          width: 100%;
        }
        .summary-label {
          font-size: 10px;
          color: #9a3412;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .summary-text {
          font-size: 12px;
          color: #431407;
          line-height: 1.4;
          font-weight: 500;
        }
        .empty-state {
          font-style: italic;
          opacity: 0.6;
        }
        .generating::after {
          content: 'Summarizing...';
          animation: blink 1.2s ease-in-out infinite;
          font-style: italic;
          opacity: 0.7;
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `;
      pipWindow.document.head.appendChild(style);

      // Get latest summary from flashcards
      const latestSummary = flashcards.length > 0 ? flashcards[0].front : '';
      const lastSentences = getLastSentences(transcript || '', 2);

      // Add content
      pipWindow.document.body.innerHTML = `
        <div class="container">
          <div id="peeko-fox" class="fox ${getPeekoAnimation()}">${getFoxEmoji()}</div>
          <div id="peeko-state" class="state">Lvl ${level} • ${peekoState}</div>
          <div id="peeko-keywords" class="keywords">
            ${latestKeywords.map((kw, i) => 
              `<span class="keyword" style="animation-delay: ${i * 0.2}s">${kw}</span>`
            ).join('')}
          </div>
          <div class="transcript-section">
            <div class="transcript-label">📝 Last Transcript</div>
            <div id="peeko-transcript" class="transcript-text ${!lastSentences ? 'empty-state' : ''}">
              ${lastSentences || 'Listening...'}
            </div>
          </div>
          <div class="summary-section">
            <div class="summary-label">✨ Latest Summary</div>
            <div id="peeko-summary" class="${latestSummary ? 'summary-text' : 'summary-text generating'}">
              ${latestSummary || ''}
            </div>
          </div>
        </div>
        <div class="hint">Updates live during session</div>
      `;

      setIsPiPOpen(true);

      // Handle PiP window close
      pipWindow.addEventListener('pagehide', () => {
        setIsPiPOpen(false);
        pipWindowRef.current = null;
      });

    } catch (err) {
      console.error('Failed to open PiP:', err);
    }
  };

  const closePiP = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    setIsPiPOpen(false);
  };

  if (!isPiPSupported) {
    return null;
  }

  return (
    <button
      onClick={isPiPOpen ? closePiP : openPiP}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
        isPiPOpen 
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span className="text-lg">🦊</span>
      {isPiPOpen ? 'Close Peeko PiP' : 'Open Peeko PiP'}
    </button>
  );
}
