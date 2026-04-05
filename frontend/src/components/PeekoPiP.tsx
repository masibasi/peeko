import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface PeekoPiPProps {
  isSessionActive: boolean;
}

export function PeekoPiP({ isSessionActive }: PeekoPiPProps) {
  const { flashcards, peekoState, level } = useStore();
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get keywords from the latest flashcard
  const latestKeywords = flashcards.length > 0 
    ? flashcards[0].keywords.slice(0, 4) 
    : [];

  useEffect(() => {
    // Check if Document PiP is supported
    setIsPiPSupported('documentPictureInPicture' in window);
  }, []);

  useEffect(() => {
    // Update PiP content when state changes
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      updatePiPContent();
    }
  }, [flashcards, peekoState, level]);

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

    if (foxEl) {
      foxEl.textContent = getFoxEmoji();
      foxEl.className = `text-6xl ${getPeekoAnimation()}`;
    }
    if (stateEl) {
      stateEl.textContent = `Lvl ${level} • ${peekoState}`;
    }
    if (keywordsEl) {
      keywordsEl.innerHTML = latestKeywords.map((kw, i) => 
        `<span class="keyword" style="animation-delay: ${i * 0.2}s">${kw}</span>`
      ).join('');
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
          font-size: 80px;
          margin-bottom: 16px;
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
          bottom: 16px;
          font-size: 11px;
          color: #9a3412;
          opacity: 0.7;
        }
      `;
      pipWindow.document.head.appendChild(style);

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
        </div>
        <div class="hint">Keywords update every 5 min</div>
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
