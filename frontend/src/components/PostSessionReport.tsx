import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Trophy, Zap, RefreshCw, BookOpen, Clock, ArrowLeft } from 'lucide-react';

interface BackendCard {
  card_id: string;
  type: 'summary' | 'catchmeup';
  content: any;
  generated_at: string;
  interval_number: number;
}

export function PostSessionReport() {
  const { focusScore, successfulRecoveries, flashcards } = useStore();

  // Extract sessionId from URL: /session/:id/notebook
  const pathParts = window.location.pathname.split('/');
  const sessionIdFromUrl = pathParts[2] || null;

  const [cards, setCards] = useState<BackendCard[]>([]);
  const [loading, setLoading] = useState(!!sessionIdFromUrl);

  useEffect(() => {
    if (!sessionIdFromUrl) return;
    fetch(`/api/session/${sessionIdFromUrl}/notebook`)
      .then(r => r.json())
      .then(data => setCards(data.cards || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionIdFromUrl]);

  const summaryCards = cards.filter(c => c.type === 'summary');
  const catchmeupCards = cards.filter(c => c.type === 'catchmeup');

  // Fallback to store data if no sessionId (just ended session)
  const localCards = flashcards.filter(c => c.type === 'flashcard').length;
  const displayCardCount = sessionIdFromUrl ? summaryCards.length : localCards;
  const displayRecoveries = sessionIdFromUrl ? catchmeupCards.length : successfulRecoveries;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Session Notebook</h1>
            <p className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border border-gray-100 mb-6"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <BookOpen className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-900">{displayCardCount}</div>
              <div className="text-xs text-gray-500">Summary Cards</div>
            </div>
            <div>
              <RefreshCw className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-900">{displayRecoveries}</div>
              <div className="text-xs text-gray-500">Recoveries</div>
            </div>
            <div>
              <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-900">{focusScore}%</div>
              <div className="text-xs text-gray-500">Focus Score</div>
            </div>
          </div>
        </motion.div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.card_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl p-5 border ${
                  card.type === 'catchmeup' ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(card.generated_at), 'HH:mm')}</span>
                  {card.type === 'catchmeup' && (
                    <span className="text-blue-600 font-medium ml-1">🔄 Catch Me Up</span>
                  )}
                  {card.type === 'summary' && (
                    <span className="text-gray-500 font-medium ml-1">Card #{card.interval_number}</span>
                  )}
                </div>

                {card.type === 'summary' && (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-2">{card.content?.title}</h3>
                    <ul className="space-y-1 mb-3">
                      {(card.content?.bullets || []).map((b: string, j: number) => (
                        <li key={j} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>{b}
                        </li>
                      ))}
                    </ul>
                    {card.content?.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {card.content.keywords.map((kw: string, j: number) => (
                          <span key={j} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                    {card.content?.qa?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {card.content.qa.map((qa: any, j: number) => (
                          <div key={j} className="text-sm">
                            <p className="font-medium text-gray-800">Q: {qa.question}</p>
                            <p className="text-gray-600 mt-0.5">A: {qa.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {card.type === 'catchmeup' && (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Now:</span> {card.content?.now}</p>
                    <p><span className="font-medium text-gray-700">Missed:</span> {card.content?.missed}</p>
                    <p><span className="font-medium text-gray-700">Tip:</span> {card.content?.rejoin_tip}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          // Fallback: show store cards if no backend data
          flashcards.length > 0 ? (
            <div className="space-y-4">
              {flashcards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-2xl p-5 border ${
                    card.type === 'catchup' ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{format(card.timestamp, 'HH:mm')}</span>
                    {card.type === 'catchup' && <span className="text-blue-600 font-medium ml-1">🔄 Catch Me Up</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{card.front}</h3>
                  <ul className="space-y-1">
                    {card.back.map((b, j) => (
                      <li key={j} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-gray-400">•</span>{b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No cards in this session</p>
            </div>
          )
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
