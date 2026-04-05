import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Zap, ArrowLeft, Flame, BookOpen, RefreshCw } from 'lucide-react';
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
    focusScore, updateFocusScore
  } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [catchingUp, setCatchingUp] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initSession();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Update focus score every 10 seconds
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setSessionId(data.session_id);
      startSession();
      
      // Set initial quests
      setQuests([
        { id: '1', title: 'Complete a session', description: '', xp: 50, type: 'focus_streak', target: 1, progress: 0, completed: false },
        { id: '2', title: 'Recover 3 times', description: '', xp: 30, type: 'recovery', target: 3, progress: 0, completed: false },
        { id: '3', title: 'Get 5 flashcards', description: '', xp: 25, type: 'flashcard_count', target: 5, progress: 0, completed: false },
      ]);
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to start session:', err);
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
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + final);
        // Send to backend
        if (sessionId) {
          fetch(`/api/session/${sessionId}/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: final.trim(), is_final: true })
          });
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start(); // Restart if still recording
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    // Generate cards every 5 minutes
    intervalRef.current = setInterval(() => {
      generateCard();
    }, 5 * 60 * 1000);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRecording(false);
  };

  const generateCard = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/session/${sessionId}/generate-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.card) {
        addFlashcard({
          topic: data.card.content?.title || 'Summary',
          front: data.card.content?.title || 'Lecture Summary',
          back: data.card.content?.bullets || [],
          keywords: data.card.content?.keywords || [],
          importance: 'medium',
          type: 'flashcard'
        });
      }
    } catch (err) {
      console.error('Failed to generate card:', err);
    }
  };

  const handleCatchMeUp = async () => {
    if (!sessionId) return;
    setCatchingUp(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/catch-me-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.card) {
        addFlashcard({
          topic: 'Catch Me Up',
          front: data.card.content?.now || 'Recovery Summary',
          back: [
            data.card.content?.missed || '',
            data.card.content?.rejoin_tip || ''
          ].filter(Boolean),
          keywords: [],
          importance: 'high',
          type: 'catchup'
        });
      }
    } catch (err) {
      console.error('Failed to catch me up:', err);
    } finally {
      setCatchingUp(false);
    }
  };

  const handleEndSession = async () => {
    stopRecording();
    if (sessionId) {
      await fetch(`/api/session/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    endSession();
    window.location.href = '/dashboard';
  };

  const handleBack = () => {
    if (isRecording) {
      if (confirm('End the current session?')) {
        handleEndSession();
      }
    } else {
      window.location.href = '/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🦊</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Starting session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦊</span>
            <span className="font-bold text-gray-900">Peeko</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-3 py-1.5 rounded-full">
            <span className="text-orange-500 font-medium">Lvl {level}</span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(xp % 300) / 3}%` }} />
            </div>
            <span className="text-gray-500">{xp} XP</span>
          </div>
          <div className="flex items-center gap-1 text-orange-500 font-medium">
            <Flame className="w-4 h-4" />
            <span>{recoveryStreak}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <PeekoPiP isSessionActive={isRecording} transcript={transcript} />
          <button
            onClick={handleEndSession}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Peeko & Controls */}
        <div className="w-1/3 flex flex-col p-6 bg-white border-r border-gray-100">
          <PeekoCharacter />
          
          {/* Focus Score */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Focus Score</span>
              <span className="font-bold text-gray-900">{focusScore}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${focusScore > 80 ? 'bg-green-500' : focusScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${focusScore}%` }}
              />
            </div>
          </div>

          {/* Recording Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg mb-4 transition-all ${
              isRecording 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-6 h-6" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Start Recording
              </>
            )}
          </motion.button>

          {/* Catch Me Up Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCatchMeUp}
            disabled={catchingUp || !isRecording}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              catchingUp || !isRecording
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {catchingUp ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Catching up...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Catch Me Up
              </>
            )}
          </motion.button>

          {/* Live Transcript */}
          <div className="flex-1 mt-4 bg-gray-50 rounded-xl p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Live Transcript
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {transcript}
              {interimText && <span className="text-gray-400">{interimText}</span>}
              {!transcript && !interimText && (
                <span className="text-gray-400 italic">
                  {isRecording ? 'Listening...' : 'Click "Start Recording" to begin'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <Timeline />
      </div>
    </div>
  );
}
