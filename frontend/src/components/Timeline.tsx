import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export function Timeline() {
  const { flashcards, addXp, updateQuestProgress } = useStore();

  const handleQaAnswer = (id: string, correct: boolean) => {
    if (correct) {
      addXp(25);
      updateQuestProgress('qa_correct', 1);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Timeline header */}
      <div
        className="px-6 pt-5 pb-4 border-b border-ink-100 flex items-center justify-between shrink-0"
      >
        <h2 className="text-xs font-black uppercase tracking-widest text-ink-400">
          Live Timeline
        </h2>
        {flashcards.length > 0 && (
          <span className="text-xs font-black tabular text-ink-300">
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <AnimatePresence initial={false}>
          {flashcards.map((card, i) => {
            const isCatchup = card.type === 'catchup' || card.type === 'catchmeup';
            const isQa = card.type === 'qa';

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className={`rounded-xl overflow-hidden bg-surface ${
                    isCatchup ? 'card-accent-catchup' : isQa ? 'card-accent-qa' : 'card-accent-brand'
                  }`}
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div
                    className="px-4 pt-3.5 pb-4"
                    style={{
                      backgroundColor: isCatchup
                        ? 'oklch(97.5% 0.018 180)'
                        : isQa
                        ? 'oklch(98% 0.018 82)'
                        : 'var(--bg-surface)',
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className="text-xs font-black uppercase tracking-wider"
                        style={{
                          color: isCatchup
                            ? 'var(--catchup)'
                            : isQa
                            ? 'oklch(58% 0.14 85)'
                            : 'var(--brand)',
                        }}
                      >
                        {isCatchup ? '⚡ Catch Me Up' : isQa ? '❓ Q&A' : `⭐ ${card.topic || 'Summary'}`}
                      </span>
                      <span className="text-xs font-bold tabular text-ink-300">
                        {format(card.timestamp, 'HH:mm')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-sm text-ink-900 mb-2 leading-snug">
                      {card.type === 'qa' ? `Q: "${card.front}"` : card.front}
                    </h3>

                    {/* Bullets */}
                    {card.back.length > 0 && (
                      <ul className="space-y-1 mb-3">
                        {card.back.map((bullet, j) => (
                          <li key={j} className="text-xs text-ink-500 font-semibold flex gap-2 leading-relaxed">
                            <span className="text-ink-300 shrink-0 mt-px">—</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Keywords */}
                    {card.keywords && card.keywords.length > 0 && !isCatchup && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {card.keywords.slice(0, 5).map((kw, j) => (
                          <span key={j} className="kw-chip animate-bubble-pop" style={{ animationDelay: `${j * 60}ms` }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Q&A actions */}
                    {isQa && (
                      <div className="flex gap-2 mt-3.5">
                        <button
                          onClick={() => handleQaAnswer(card.id, true)}
                          className="flex-1 py-2 rounded-lg text-xs font-black transition-colors"
                          style={{
                            backgroundColor: 'oklch(93% 0.06 82)',
                            color: 'oklch(42% 0.14 85)',
                          }}
                        >
                          I know this ✓
                        </button>
                        <button
                          className="flex-1 py-2 rounded-lg text-xs font-black bg-subtle text-ink-500 transition-colors"
                        >
                          Review later
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {flashcards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-16 text-center px-4"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ backgroundColor: 'var(--brand-subtle)' }}
            >
              🦊
            </div>
            <p className="text-sm font-black text-ink-700 mb-1">Cards appear here</p>
            <p className="text-xs text-ink-400 font-semibold max-w-[18ch] leading-relaxed">
              Start recording and summary cards will arrive every few minutes
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
