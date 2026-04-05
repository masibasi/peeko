import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Zap, ArrowLeft, BookOpen, RefreshCw } from 'lucide-react';
import { PeekoCharacter } from './PeekoCharacter';
import { Timeline } from './Timeline';
import { PeekoPiP } from './PeekoPiP';

export function SessionView() {
  const { token } = useAuth();
  const {
    sessionId, setSessionId,
    isRecording, setIsRecording,
    xp, level, recoveryStreak,
    startSession, endSession,
    addFlashcard, setQuests,
    focusScore, updateFocusScore,
  } = useStore();

  const CARD_INTERVAL_S = 10;

  const [loading, setLoading] = useState(true);
  const [catchingUp, setCatchingUp] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [countdown, setCountdown] = useState(CARD_INTERVAL_S);

  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const seenCardIds = useRef<Set<string>>(new Set());
  const sessionIdRef = useRef<string | null>(null);
  const initCalledRef = useRef(false);

  const countdownPct = (countdown / CARD_INTERVAL_S) * 100;

  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    initSession();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    const focusInterval = setInterval(updateFocusScore, 10000);
    return () => clearInterval(focusInterval);
  }, []);

  const initSession = async () => {
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      startSession();

      setQuests([
        { id: '1', title: 'Complete a session', description: '', xp: 50, type: 'focus_streak', target: 1, progress: 0, completed: false },
        { id: '2', title: 'Recover 3 times',    description: '', xp: 30, type: 'recovery',      target: 3, progress: 0, completed: false },
        { id: '3', title: 'Get 5 cards',        description: '', xp: 25, type: 'flashcard_count', target: 5, progress: 0, completed: false },
      ]);

      pollRef.current = setInterval(async () => {
        try {
          const cardsRes = await fetch(`/api/session/${data.session_id}/cards`);
          const cardsData = await cardsRes.json();
          (cardsData.cards || []).forEach((card: any) => {
            if (seenCardIds.current.has(card.card_id)) return;
            seenCardIds.current.add(card.card_id);
            addFlashcard({
              topic: card.content?.title || 'Summary',
              front: card.type === 'catchmeup' ? (card.content?.now || 'Catch Me Up') : (card.content?.title || 'Summary'),
              back: card.type === 'catchmeup'
                ? [card.content?.missed, card.content?.rejoin_tip].filter(Boolean)
                : (card.content?.bullets || card.content?.bullet_points || []),
              keywords: card.content?.keywords || card.content?.key_concepts || [],
              importance: card.type === 'catchmeup' ? 'high' : 'medium',
              type: card.type === 'catchmeup' ? 'catchup' : 'flashcard',
            });
          });
        } catch {}
      }, 3000);

      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      if (final) {
        setTranscript(prev => prev + final);
        const sid = sessionIdRef.current;
        if (sid) fetch(`/api/session/${sid}/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: final.trim(), is_final: true }),
        });
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') setIsRecording(false);
    };
    recognition.onend = () => {
      if (isRecording) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    setCountdown(CARD_INTERVAL_S);
    intervalRef.current = setInterval(() => {
      generateCard();
      setCountdown(CARD_INTERVAL_S);
    }, CARD_INTERVAL_S * 1000);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? CARD_INTERVAL_S : prev - 1));
    }, 1000);
  };

  const stopRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(CARD_INTERVAL_S);
    setIsRecording(false);
  };

  const generateCard = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      await fetch(`/api/session/${sid}/generate-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {}
  };

  const handleCatchMeUp = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    setCatchingUp(true);
    try {
      await fetch(`/api/session/${sid}/catch-me-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {}
    finally { setCatchingUp(false); }
  };

  const handleEndSession = async () => {
    setEndingSession(true);
    stopRecording();
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await fetch(`/api/session/${sid}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {}
    }
    endSession();
    window.location.href = sid ? `/session/${sid}/notebook` : '/dashboard';
  };

  const handleBack = () => {
    if (isRecording) {
      if (confirm('End the current session?')) handleEndSession();
    } else {
      window.location.href = '/dashboard';
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="text-7xl mb-5"
          >
            🦊
          </motion.div>
          <p className="text-sm font-black text-ink-500 tracking-wider uppercase">Starting session…</p>
        </div>
      </div>
    );
  }

  /* ── Ending ── */
  if (endingSession) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl mb-5"
          >
            🦊
          </motion.div>
          <p className="font-black text-ink-900 text-lg mb-1">Wrapping up…</p>
          <p className="text-sm font-semibold text-ink-400">Generating your final summary card</p>
        </div>
      </div>
    );
  }

  /* ── Main UI ── */
  return (
    <div className="h-screen bg-base flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <header
        className="shrink-0 px-5 py-3 flex items-center justify-between border-b border-ink-100"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-subtle transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">🦊</span>
            <span className="font-black text-ink-900">peeko</span>
          </div>
        </div>

        {/* XP pill */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'var(--bg-subtle)' }}
        >
          <span className="text-xs font-black tabular text-brand">Lvl {level}</span>
          <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ink-100)' }}>
            <div
              className="h-full xp-fill rounded-full transition-all duration-500"
              style={{ width: `${(xp % 300) / 3}%` }}
            />
          </div>
          <span className="text-xs font-black tabular text-ink-400">{xp} XP</span>
          {recoveryStreak > 0 && (
            <>
              <div className="w-px h-3.5" style={{ backgroundColor: 'var(--ink-200)' }} />
              <span className="text-xs font-black tabular text-brand">🔥 {recoveryStreak}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <PeekoPiP isSessionActive={isRecording} transcript={transcript} />
          <button
            onClick={handleEndSession}
            className="text-xs font-black text-ink-400 hover:text-ink-900 px-3 py-1.5 rounded-lg hover:bg-subtle transition-colors"
          >
            End session
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left panel ── */}
        <div
          className="w-72 xl:w-80 shrink-0 flex flex-col overflow-hidden transition-colors duration-700"
          style={{
            backgroundColor: isRecording ? 'oklch(97.5% 0.022 72)' : 'var(--bg-base)',
            borderRight: '1px solid var(--ink-100)',
          }}
        >
          {/* Peeko */}
          <div className="shrink-0 px-4 pt-4">
            <PeekoCharacter />
          </div>

          {/* Countdown strip */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 mb-3 shrink-0"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-ink-400">Next card in</span>
                  <span className="font-black tabular text-brand">{countdown}s</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--brand-subtle)' }}>
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    animate={{ width: `${countdownPct}%` }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording button */}
          <div className="px-4 mb-3 shrink-0">
            <div className="relative">
              {isRecording && (
                <>
                  <div
                    className="absolute inset-0 rounded-2xl animate-recording-ring"
                    style={{ border: '2px solid var(--brand)', pointerEvents: 'none' }}
                  />
                  <div
                    className="absolute inset-0 rounded-2xl animate-recording-ring"
                    style={{ border: '2px solid var(--brand)', animationDelay: '0.9s', pointerEvents: 'none' }}
                  />
                </>
              )}
              <motion.button
                whileTap={{ scale: 0.97, y: 2 }}
                onClick={isRecording ? stopRecording : startRecording}
                className="relative w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base text-white transition-colors"
                style={{
                  backgroundColor: isRecording ? 'oklch(56% 0.20 25)' : 'var(--brand)',
                  boxShadow: isRecording
                    ? '0 4px 0 oklch(44% 0.20 25), 0 4px 16px oklch(56% 0.20 25 / 0.35)'
                    : '0 4px 0 var(--brand-dark), var(--shadow-brand)',
                }}
              >
                {isRecording ? (
                  <><MicOff className="w-5 h-5" /> Stop recording</>
                ) : (
                  <><Mic className="w-5 h-5" /> Start recording</>
                )}
              </motion.button>
            </div>
          </div>

          {/* Focus score */}
          <div className="px-4 mb-3 shrink-0">
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: 'var(--ink-50)' }}
            >
              <span className="text-xs font-black text-ink-500">Focus score</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ink-100)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${focusScore}%`,
                      backgroundColor: focusScore > 75
                        ? 'oklch(60% 0.15 145)'
                        : focusScore > 45
                        ? 'oklch(70% 0.16 82)'
                        : 'oklch(60% 0.18 28)',
                    }}
                  />
                </div>
                <span className="text-xs font-black tabular text-ink-700">{focusScore}%</span>
              </div>
            </div>
          </div>

          {/* Catch Me Up */}
          <div className="px-4 mb-4 shrink-0">
            <motion.button
              whileTap={{ scale: 0.97, y: 2 }}
              onClick={handleCatchMeUp}
              disabled={catchingUp || !isRecording}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm transition-all disabled:cursor-not-allowed"
              style={
                !catchingUp && isRecording
                  ? {
                      backgroundColor: 'var(--catchup)',
                      color: 'white',
                      boxShadow: '0 4px 0 var(--catchup-dark), var(--shadow-catchup)',
                    }
                  : {
                      backgroundColor: 'var(--ink-100)',
                      color: 'var(--ink-400)',
                    }
              }
            >
              {catchingUp ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Catching up…</>
              ) : (
                <><Zap className="w-4 h-4" /> Catch Me Up</>
              )}
            </motion.button>
          </div>

          {/* Live transcript */}
          <div
            className="flex-1 mx-4 mb-4 rounded-xl overflow-hidden flex flex-col min-h-0"
            style={{ backgroundColor: 'var(--ink-50)' }}
          >
            <div className="px-3.5 pt-3 pb-2 flex items-center gap-2 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-ink-400" />
              <span className="text-xs font-black uppercase tracking-widest text-ink-400">Transcript</span>
              {isRecording && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-3.5 pb-3.5">
              <p className="text-xs font-semibold text-ink-700 leading-relaxed whitespace-pre-wrap">
                {transcript}
                {interimText && <span style={{ color: 'var(--ink-300)' }}>{interimText}</span>}
                {!transcript && !interimText && (
                  <span style={{ color: 'var(--ink-300)' }} className="italic">
                    {isRecording ? 'Listening…' : 'Press start to begin'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="flex-1 overflow-hidden">
          <Timeline />
        </div>
      </div>
    </div>
  );
}
