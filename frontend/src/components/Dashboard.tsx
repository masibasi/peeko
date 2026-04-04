import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Mic, MicOff, MessageSquare, RefreshCw, ExternalLink, BookOpen, LayoutList } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const { 
    sessionId, isRecording, transcripts, cards, interimTranscript,
    setSessionId, setIsRecording, setInterimTranscript, addTranscript, addCard
  } = useStore();

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isCatchingUp, setIsCatchingUp] = useState(false);
  const [view, setView] = useState<'live' | 'notebook'>('live');
  
  const recognitionRef = useRef<any>(null);
  const cardIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const cardsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (view === 'live') {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, interimTranscript, view]);

  useEffect(() => {
    if (view === 'live') {
      cardsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cards, view]);

  const startRecording = async () => {
    try {
      const { session_id } = await api.startSession();
      setSessionId(session_id);
      setIsRecording(true);
      setView('live');

      // Initialize Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = async (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          setInterimTranscript(interim);

          if (final.trim()) {
            const chunk = {
              chunk_id: Math.random().toString(),
              session_id,
              text: final.trim(),
              timestamp: Date.now(),
              is_final: true
            };
            addTranscript(chunk);
            await api.sendTranscript(session_id, final.trim(), true);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
        };

        recognition.onend = () => {
          // Restart if still supposed to be recording
          if (useStore.getState().isRecording) {
            recognition.start();
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        alert("Speech Recognition API not supported in this browser.");
      }

      // Start 5-minute interval for card generation
      cardIntervalRef.current = setInterval(async () => {
        const res = await api.generateCard(session_id);
        if (res.success && res.card) {
          addCard(res.card);
          updatePipWindow();
        }
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (cardIntervalRef.current) {
      clearInterval(cardIntervalRef.current);
    }
    if (sessionId) {
      // Generate final card
      const res = await api.generateCard(sessionId);
      if (res.success && res.card) {
        addCard(res.card);
      }
      await api.endSession(sessionId);
      setView('notebook');
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !sessionId || isAsking) return;
    
    setIsAsking(true);
    try {
      const res = await api.askQuestion(sessionId, question);
      if (res.success && res.card) {
        addCard(res.card);
        setQuestion('');
        updatePipWindow();
      }
    } catch (error) {
      console.error("Failed to ask question:", error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCatchMeUp = async () => {
    if (!sessionId || isCatchingUp) return;
    
    setIsCatchingUp(true);
    try {
      const res = await api.catchMeUp(sessionId);
      if (res.success && res.card) {
        addCard(res.card);
        updatePipWindow();
      }
    } catch (error) {
      console.error("Failed to catch up:", error);
    } finally {
      setIsCatchingUp(false);
    }
  };

  // Picture-in-Picture Support
  const pipWindowRef = useRef<any>(null);

  const openPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert("Document Picture-in-Picture API is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 400,
        height: 500,
      });

      pipWindowRef.current = pipWindow;

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media.mediaText;
          link.href = styleSheet.href || '';
          pipWindow.document.head.appendChild(link);
        }
      });
      
      pipWindow.document.body.innerHTML = `
        <div class="p-4 h-full flex flex-col bg-gray-50 font-sans">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              ClassMate AI
            </h3>
          </div>
          
          <div class="flex-1 overflow-y-auto mb-4" id="pip-cards">
            <!-- Cards will be injected here -->
          </div>
          
          <div class="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <p class="text-xs font-bold text-gray-500 mb-1 uppercase">Live Transcript</p>
            <p class="text-sm text-gray-700 italic" id="pip-transcript">Listening...</p>
          </div>
        </div>
      `;

      pipWindow.addEventListener("pagehide", () => {
        pipWindowRef.current = null;
      });

      updatePipWindow();

    } catch (error) {
      console.error("Failed to open PiP:", error);
    }
  };

  const updatePipWindow = () => {
    if (!pipWindowRef.current) return;
    
    const pipDoc = pipWindowRef.current.document;
    
    // Update transcript
    const transcriptEl = pipDoc.getElementById('pip-transcript');
    if (transcriptEl) {
      const latestText = interimTranscript || (transcripts.length > 0 ? transcripts[transcripts.length - 1].text : 'Listening...');
      transcriptEl.textContent = latestText;
    }

    // Update cards (show latest)
    const cardsEl = pipDoc.getElementById('pip-cards');
    if (cardsEl && cards.length > 0) {
      const latestCard = cards[cards.length - 1];
      cardsEl.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border ${
          latestCard.type === 'qa' ? 'border-purple-200 bg-purple-50' :
          latestCard.type === 'catchmeup' ? 'border-orange-200 bg-orange-50' :
          'border-blue-200 bg-blue-50'
        }">
          <div class="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
            ${latestCard.type === 'qa' ? 'Q&A' : latestCard.type === 'catchmeup' ? 'Catch Up' : 'Summary'}
          </div>
          <h4 class="font-bold text-gray-900 mb-2">${latestCard.content.title}</h4>
          <ul class="space-y-1">
            ${latestCard.content.bullets.map((b: string) => `<li class="text-sm text-gray-700 flex gap-2"><span class="text-gray-400">•</span>${b}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  };

  // Sync PiP transcript continuously
  useEffect(() => {
    updatePipWindow();
  }, [interimTranscript, transcripts, cards]);

  if (view === 'notebook') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Class Notebook
            </h1>
            <button
              onClick={() => setView('live')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              Back to Live View
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-blue-50/50">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Lecture Summary</h2>
              <p className="text-gray-500 text-sm">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
            
            <div className="p-8 space-y-8">
              {cards.filter(c => c.type === 'card').map((card, idx) => (
                <div key={card.card_id} className="relative">
                  {idx !== 0 && <div className="absolute -top-8 left-4 w-px h-8 bg-gray-200" />}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 z-10 relative">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">{card.content.title}</h3>
                      <ul className="space-y-2 mb-4">
                        {card.content.bullets.map((bullet, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-blue-400 mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      {card.content.keywords && card.content.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {card.content.keywords.map((kw, i) => (
                            <span key={i} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {cards.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No summary cards generated yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Left Panel: Transcript */}
      <div className="w-1/3 flex flex-col bg-white border-r border-gray-200 shadow-sm z-10">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            Live Transcript
          </h2>
          <div className="flex gap-2">
            {cards.length > 0 && (
              <button
                onClick={() => setView('notebook')}
                className="px-3 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                title="View Notebook"
              >
                <LayoutList className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isRecording 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isRecording ? 'End Session' : 'Start Session'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isRecording && transcripts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MicOff className="w-12 h-12 mb-4 opacity-20" />
              <p>Start a session to begin transcribing.</p>
            </div>
          )}
          
          {transcripts.map((t) => (
            <div key={t.chunk_id} className="text-gray-800 leading-relaxed">
              <span className="text-xs text-gray-400 mr-2 select-none">
                {format(t.timestamp, 'HH:mm')}
              </span>
              {t.text}
            </div>
          ))}
          
          {interimTranscript && (
            <div className="text-gray-500 italic leading-relaxed">
              {interimTranscript}
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Right Panel: Cards & Actions */}
      <div className="flex-1 flex flex-col bg-gray-50 relative">
        {/* Header Actions */}
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <button
            onClick={openPiP}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Pop Out (PiP)
          </button>
          <button
            onClick={handleCatchMeUp}
            disabled={!isRecording || isCatchingUp}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isCatchingUp ? 'animate-spin' : ''}`} />
            Catch Me Up
          </button>
        </div>

        {/* Cards Area */}
        <div className="flex-1 overflow-y-auto p-8 pt-20">
          <div className="max-w-3xl mx-auto space-y-6">
            {cards.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">AI Summary Cards will appear here.</p>
                <p className="text-sm mt-2">Cards are generated automatically every 5 minutes.</p>
              </div>
            )}

            {cards.map((card) => (
              <div 
                key={card.card_id} 
                className={`p-6 rounded-2xl shadow-sm border ${
                  card.type === 'qa' ? 'bg-purple-50 border-purple-100' :
                  card.type === 'catchmeup' ? 'bg-orange-50 border-orange-100' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-block ${
                    card.type === 'qa' ? 'bg-purple-200 text-purple-800' :
                    card.type === 'catchmeup' ? 'bg-orange-200 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {card.type === 'qa' ? 'Q&A' : card.type === 'catchmeup' ? 'Catch Up' : 'Summary'}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {format(card.generated_at, 'HH:mm')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">{card.content.title}</h3>
                
                <ul className="space-y-3 mb-6">
                  {card.content.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <span className="text-gray-300 mt-1">•</span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>

                {card.content.keywords && card.content.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100/50">
                    {card.content.keywords.map((kw, i) => (
                      <span key={i} className="text-xs font-medium text-gray-500 bg-gray-100/50 px-2 py-1 rounded-md">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={cardsEndRef} />
          </div>
        </div>

        {/* Q&A Input */}
        <div className="p-6 bg-white border-t border-gray-200">
          <form onSubmit={handleAsk} className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the lecture..."
              disabled={!isRecording || isAsking}
              className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isRecording || !question.trim() || isAsking}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
