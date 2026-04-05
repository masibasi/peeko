import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Trophy, RefreshCw, BookOpen, Clock, ArrowLeft, Zap } from 'lucide-react';

interface BackendCard {
  card_id: string;
  type: 'summary' | 'catchmeup';
  content: any;
  generated_at: string;
  interval_number: number;
}

export function PostSessionReport() {
  const { focusScore, successfulRecoveries, flashcards } = useStore();

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

  const summaryCards   = cards.filter(c => c.type === 'summary');
  const catchmeupCards = cards.filter(c => c.type === 'catchmeup');

  const localCards       = flashcards.filter(c => c.type === 'flashcard').length;
  const displayCardCount = sessionIdFromUrl ? summaryCards.length   : localCards;
  const displayRecoveries = sessionIdFromUrl ? catchmeupCards.length : successfulRecoveries;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="p-2 rounded-lg text-ink-400 hover:text-ink-900 hover:bg-subtle transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-ink-900">Session notebook</h1>
            <p className="text-sm font-semibold text-ink-400">
              {format(new Date(), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Stats — horizontal strip, not a card grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl mb-8 overflow-hidden"
          style={{
            backgroundColor: 'var(--brand-subtle)',
            border: '1px solid oklch(88% 0.07 70)',
          }}
        >
          <div className="grid grid-cols-3 divide-x"
            style={{ borderColor: 'oklch(86% 0.07 70)' }}
          >
            {[
              { icon: BookOpen,   value: displayCardCount,  label: 'Summary cards',  color: 'var(--brand)' },
              { icon: RefreshCw,  value: displayRecoveries, label: 'Recoveries',     color: 'var(--catchup)' },
              { icon: Zap,        value: `${focusScore}%`,  label: 'Focus score',    color: 'oklch(60% 0.16 295)' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="py-5 px-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
                <div className="text-2xl font-black tabular text-ink-900">{value}</div>
                <div className="text-xs font-bold text-ink-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-9 h-9 rounded-full animate-spin border-2 border-ink-100"
              style={{ borderTopColor: 'var(--brand)' }}
            />
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-3">
            {cards.map((card, i) => {
              const isCatchup = card.type === 'catchmeup';
              return (
                <motion.div
                  key={card.card_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div
                    className={`rounded-xl overflow-hidden ${isCatchup ? 'card-accent-catchup' : 'card-accent-brand'}`}
                    style={{
                      backgroundColor: isCatchup ? 'oklch(97.5% 0.018 180)' : 'var(--bg-surface)',
                      border: '1px solid var(--ink-100)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div className="px-5 py-4">
                      {/* Card meta */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <Clock className="w-3 h-3 text-ink-300" />
                        <span className="text-xs font-bold tabular text-ink-400">
                          {format(new Date(card.generated_at), 'HH:mm')}
                        </span>
                        {isCatchup ? (
                          <span className="text-xs font-black text-catchup ml-1">⚡ Catch Me Up</span>
                        ) : (
                          <span className="text-xs font-bold text-ink-400 ml-1">
                            Card #{card.interval_number}
                          </span>
                        )}
                      </div>

                      {/* Summary card */}
                      {card.type === 'summary' && (
                        <>
                          <h3 className="font-black text-ink-900 mb-2.5 leading-snug">
                            {card.content?.title}
                          </h3>
                          <ul className="space-y-1.5 mb-3.5">
                            {(card.content?.bullets || []).map((b: string, j: number) => (
                              <li key={j} className="text-sm text-ink-500 font-semibold flex gap-2 leading-relaxed">
                                <span className="text-ink-300 shrink-0 mt-px">—</span>
                                {b}
                              </li>
                            ))}
                          </ul>
                          {card.content?.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3.5">
                              {card.content.keywords.map((kw: string, j: number) => (
                                <span key={j} className="kw-chip">{kw}</span>
                              ))}
                            </div>
                          )}
                          {card.content?.qa?.length > 0 && (
                            <div
                              className="mt-3.5 pt-3.5 space-y-2"
                              style={{ borderTop: '1px solid var(--ink-100)' }}
                            >
                              {card.content.qa.map((qa: any, j: number) => (
                                <div key={j} className="text-sm">
                                  <p className="font-black text-ink-700">Q: {qa.question}</p>
                                  <p className="font-semibold text-ink-500 mt-0.5">A: {qa.answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Catch Me Up card */}
                      {card.type === 'catchmeup' && (
                        <div className="space-y-2">
                          {[
                            { label: 'Now',   value: card.content?.now },
                            { label: 'Missed', value: card.content?.missed },
                            { label: 'Tip',   value: card.content?.rejoin_tip },
                          ].filter(f => f.value).map(({ label, value }) => (
                            <div key={label} className="text-sm">
                              <span className="font-black text-ink-700">{label}: </span>
                              <span className="font-semibold text-ink-500">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : flashcards.length > 0 ? (
          /* Fallback: store cards */
          <div className="space-y-3">
            {flashcards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  className={`rounded-xl overflow-hidden ${card.type === 'catchup' ? 'card-accent-catchup' : 'card-accent-brand'}`}
                  style={{
                    backgroundColor: card.type === 'catchup' ? 'oklch(97.5% 0.018 180)' : 'var(--bg-surface)',
                    border: '1px solid var(--ink-100)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Clock className="w-3 h-3 text-ink-300" />
                      <span className="text-xs font-bold tabular text-ink-400">
                        {format(card.timestamp, 'HH:mm')}
                      </span>
                      {card.type === 'catchup' && (
                        <span className="text-xs font-black text-catchup ml-1">⚡ Catch Me Up</span>
                      )}
                    </div>
                    <h3 className="font-black text-ink-900 mb-2.5 leading-snug">{card.front}</h3>
                    <ul className="space-y-1.5">
                      {card.back.map((b, j) => (
                        <li key={j} className="text-sm text-ink-500 font-semibold flex gap-2">
                          <span className="text-ink-300 shrink-0">—</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--brand-subtle)' }}
            >
              <Trophy className="w-8 h-8" style={{ color: 'var(--brand)' }} />
            </div>
            <p className="font-black text-ink-700 mb-1">No cards in this session</p>
            <p className="text-sm font-semibold text-ink-400">Start recording to generate summary cards</p>
          </div>
        )}

        {/* Back button */}
        <div className="mt-10 text-center">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-8 py-3.5 font-black text-sm text-white rounded-xl transition-all btn-depth-dark hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'oklch(16% 0.015 58)' }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
