import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export function Timeline() {
  const { flashcards, addXp, updateQuestProgress } = useStore();

  const handleQaAnswer = (id: string, correct: boolean) => {
    if (correct) {
      addXp(25);
      updateQuestProgress('qa_correct', 1);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 border-l border-gray-200">
      <h2 className="text-sm font-bold text-gray-500 mb-6 tracking-wider flex items-center gap-2">
        <Clock className="w-4 h-4" /> LIVE TIMELINE
      </h2>
      
      <div className="space-y-6">
        <AnimatePresence>
          {flashcards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-xl shadow-sm border ${
                card.type === 'qa' ? 'bg-yellow-50 border-yellow-200' : 
                card.type === 'catchup' ? 'bg-blue-50 border-blue-200' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <span>{format(card.timestamp, 'HH:mm')}</span>
                {card.type === 'qa' && <span className="text-yellow-600 font-medium">❓ Q&A Card ✨</span>}
                {card.type === 'catchup' && <span className="text-blue-600 font-medium">🔄 Catch Up</span>}
                {card.type === 'flashcard' && <span className="text-gray-700 font-medium">⭐ {card.topic}</span>}
              </div>
              
              <h3 className="font-medium text-gray-900 mb-3">
                {card.type === 'qa' ? `Q: "${card.front}"` : card.front}
              </h3>
              
              <ul className="space-y-1 mb-4">
                {card.back.map((bullet, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              {card.type === 'qa' && (
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => handleQaAnswer(card.id, true)}
                    className="flex-1 bg-white border border-yellow-300 text-yellow-700 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors"
                  >
                    I know this!
                  </button>
                  <button className="flex-1 bg-white border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Review later
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {flashcards.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            Waiting for lecture to begin...
          </div>
        )}
      </div>
    </div>
  );
}
