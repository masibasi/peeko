import { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export function Timeline() {
  const { flashcards, addXp, updateQuestProgress } = useStore();

  const summaryEndRef = useRef<HTMLDivElement>(null);
  const catchupEndRef = useRef<HTMLDivElement>(null);

  const summaryCards = flashcards.filter(c => c.type !== 'catchup' && c.type !== 'catchmeup');
  const catchupCards = flashcards.filter(c => c.type === 'catchup' || c.type === 'catchmeup');

  // Auto-scroll to bottom when new cards arrive
  useEffect(() => {
    summaryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [summaryCards.length]);

  useEffect(() => {
    catchupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [catchupCards.length]);

  const handleQaAnswer = (id: string, correct: boolean) => {
    if (correct) {
      addXp(25);
      updateQuestProgress('qa_correct', 1);
    }
  };

  const renderSummaryCard = (card: typeof flashcards[0], i: number) => {
    const isQa = card.type === 'qa';
    return (
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`rounded-xl overflow-hidden bg-surface ${isQa ? 'card-accent-qa' : 'card-accent-brand'}`}
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="px-4 pt-3.5 pb-4"
            style={{
              backgroundColor: isQa ? 'oklch(98% 0.018 82)' : 'var(--bg-surface)',
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: isQa ? 'oklch(58% 0.14 85)' : 'var(--brand)' }}>
                {isQa ? '❓ Q&A' : `⭐ ${card.topic || 'Summary'}`}
              </span>
              <span className="text-xs font-bold tabular text-ink-300">
                {format(card.timestamp, 'HH:mm')}
              </span>
            </div>
            <h3 className="font-black text-sm text-ink-900 mb-2 leading-snug">
              {card.type === 'qa' ? `Q: "${card.front}"` : card.front}
            </h3>
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
            {card.keywords && card.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {card.keywords.slice(0, 5).map((kw, j) => (
                  <span key={j} className="kw-chip animate-bubble-pop" style={{ animationDelay: `${j * 60}ms` }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
            {isQa && (
              <div className="flex gap-2 mt-3.5">
                <button
                  onClick={() => handleQaAnswer(card.id, true)}
                  className="flex-1 py-2 rounded-lg text-xs font-black transition-colors"
                  style={{ backgroundColor: 'oklch(93% 0.06 82)', color: 'oklch(42% 0.14 85)' }}
                >
                  I know this ✓
                </button>
                <button className="flex-1 py-2 rounded-lg text-xs font-black bg-subtle text-ink-500 transition-colors">
                  Review later
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCatchupCard = (card: typeof flashcards[0], i: number) => (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-xl overflow-hidden card-accent-catchup" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="px-4 pt-3.5 pb-4" style={{ backgroundColor: 'oklch(97.5% 0.018 180)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--catchup)' }}>
              ⚡ Catch Me Up
            </span>
            <span className="text-xs font-bold tabular text-ink-300">
              {format(card.timestamp, 'HH:mm')}
            </span>
          </div>
          <h3 className="font-black text-sm text-ink-900 mb-2 leading-snug">{card.front}</h3>
          {card.back.length > 0 && (
            <ul className="space-y-1">
              {card.back.map((bullet, j) => (
                <li key={j} className="text-xs text-ink-500 font-semibold flex gap-2 leading-relaxed">
                  <span className="text-ink-300 shrink-0 mt-px">—</span>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-ink-100 flex items-center justify-between shrink-0">
        <h2 className="text-xs font-black uppercase tracking-widest text-ink-400">Live Timeline</h2>
        {flashcards.length > 0 && (
          <span className="text-xs font-black tabular text-ink-300">
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Two-column body */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Summary cards */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-ink-100">
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-ink-50">
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
              ⭐ Summary
            </span>
            {summaryCards.length > 0 && (
              <span className="text-[11px] font-bold text-ink-300 ml-2">{summaryCards.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {summaryCards.map((card, i) => renderSummaryCard(card, i))}
            </AnimatePresence>
            {summaryCards.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center px-4"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3"
                  style={{ backgroundColor: 'var(--brand-subtle)' }}
                >
                  🦊
                </div>
                <p className="text-xs font-black text-ink-700 mb-1">Summary cards appear here</p>
                <p className="text-xs text-ink-400 font-semibold max-w-[18ch] leading-relaxed">
                  Cards arrive every 30s while recording
                </p>
              </motion.div>
            )}
            <div ref={summaryEndRef} />
          </div>
        </div>

        {/* Right: Catch Me Up cards */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-ink-50">
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--catchup)' }}>
              ⚡ Catch Me Up
            </span>
            {catchupCards.length > 0 && (
              <span className="text-[11px] font-bold text-ink-300 ml-2">{catchupCards.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {catchupCards.map((card, i) => renderCatchupCard(card, i))}
            </AnimatePresence>
            {catchupCards.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center justify-center py-16 text-center px-4"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3"
                  style={{ backgroundColor: 'oklch(96% 0.018 180)' }}
                >
                  ⚡
                </div>
                <p className="text-xs font-black text-ink-700 mb-1">Recovery cards appear here</p>
                <p className="text-xs text-ink-400 font-semibold max-w-[18ch] leading-relaxed">
                  Tap Catch Me Up when you zone out
                </p>
              </motion.div>
            )}
            <div ref={catchupEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
