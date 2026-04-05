import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Trophy, Zap, RefreshCw, BookOpen, Target } from 'lucide-react';

export function PostSessionReport() {
  const { 
    focusScore, successfulRecoveries, flashcards, 
    recoveryStreak, xp 
  } = useStore();

  const qaCards = flashcards.filter(c => c.type === 'qa').length;
  const regularCards = flashcards.filter(c => c.type === 'flashcard').length;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100"
      >
        <div className="bg-orange-500 p-6 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl mb-4 relative z-10"
          >
            🦊
          </motion.div>
          <h2 className="text-2xl font-bold relative z-10">Peeko's Session Report</h2>
          <p className="text-orange-100 relative z-10">{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-500 mb-2" />
              <span className="text-2xl font-bold text-gray-900">{focusScore}%</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Focus Score</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-500 mb-2" />
              <span className="text-2xl font-bold text-gray-900">{successfulRecoveries}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Recoveries</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-500 mb-2" />
              <span className="text-2xl font-bold text-gray-900">{regularCards}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Flashcards</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
              <Target className="w-6 h-6 text-purple-500 mb-2" />
              <span className="text-2xl font-bold text-gray-900">{qaCards}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Q&A Cards</span>
            </div>
          </div>

          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
            <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" /> XP Earned This Session
            </h3>
            <div className="space-y-2 text-sm text-orange-800">
              <div className="flex justify-between">
                <span>Session complete</span>
                <span className="font-bold">+50 XP</span>
              </div>
              <div className="flex justify-between">
                <span>{successfulRecoveries} recoveries</span>
                <span className="font-bold">+{successfulRecoveries * 30} XP</span>
              </div>
              <div className="flex justify-between">
                <span>{regularCards} flashcards</span>
                <span className="font-bold">+{regularCards * 15} XP</span>
              </div>
              <div className="pt-2 mt-2 border-t border-orange-200 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>+{50 + (successfulRecoveries * 30) + (regularCards * 15)} XP 🎉</span>
              </div>
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-200 italic text-gray-600">
            "You recovered every single time. That's the whole game. 🦊"
          </div>

          <div className="flex gap-3">
            <button className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
              Review Cards
            </button>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
