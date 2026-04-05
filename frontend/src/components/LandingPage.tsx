import { motion } from 'motion/react';
import { Zap, Target, Trophy, Flame, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'dashboard') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦊</span>
            <span className="text-2xl font-bold text-gray-900">Peeko</span>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="px-5 py-2 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 pt-12 pb-20 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-white to-white -z-10" />
        
        <div className="max-w-5xl mx-auto">
          {/* Hero content */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-8xl mb-6"
            >
              🦊
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              Zone out? <span className="text-orange-500">Bounce back.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
            >
              Peeko is your AI lecture companion that turns distraction into a game. 
              Earn XP, complete quests, and level up your focus — one recovery at a time.
            </motion.p>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-4"
            >
              <button
                onClick={() => onNavigate('login')}
                className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 flex items-center gap-2 group"
              >
                Start Learning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div 
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900 rounded-3xl p-6 mb-16 flex items-center justify-around text-white"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">+50</div>
              <div className="text-sm text-gray-400">XP per session</div>
            </div>
            <div className="h-12 w-px bg-gray-700" />
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">+30</div>
              <div className="text-sm text-gray-400">XP per recovery</div>
            </div>
            <div className="h-12 w-px bg-gray-700" />
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">5</div>
              <div className="text-sm text-gray-400">Levels to master</div>
            </div>
            <div className="h-12 w-px bg-gray-700" />
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">∞</div>
              <div className="text-sm text-gray-400">Recoveries welcome</div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-orange-50 p-6 rounded-2xl border border-orange-100"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Catch Me Up</h3>
              <p className="text-gray-600 text-sm">
                One tap to get back on track. No shame, just smart recovery.
              </p>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100"
            >
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Quests</h3>
              <p className="text-gray-600 text-sm">
                Complete focus challenges and earn bonus XP every day.
              </p>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-purple-50 p-6 rounded-2xl border border-purple-100"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Level Up</h3>
              <p className="text-gray-600 text-sm">
                Watch Peeko evolve as you become a better learner.
              </p>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="bg-red-50 p-6 rounded-2xl border border-red-100"
            >
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Recovery Streaks</h3>
              <p className="text-gray-600 text-sm">
                Build streaks by bouncing back. Every recovery counts.
              </p>
            </motion.div>
          </div>

          {/* How it works */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="bg-gray-50 rounded-3xl p-8 mb-16"
          >
            <h2 className="text-2xl font-bold text-center mb-8">How Peeko Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                  🎧
                </div>
                <h3 className="font-bold text-gray-900 mb-2">1. Listen Along</h3>
                <p className="text-gray-600 text-sm">
                  Peeko listens to your lecture and creates flashcards every 5 minutes.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                  🦊
                </div>
                <h3 className="font-bold text-gray-900 mb-2">2. Get Nudged</h3>
                <p className="text-gray-600 text-sm">
                  When you zone out, Peeko gently nudges you back with warm messages.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
                  <Sparkles className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">3. Earn XP</h3>
                <p className="text-gray-600 text-sm">
                  Every recovery earns XP. Complete sessions and quests to level up!
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center"
          >
            <p className="text-gray-500 mb-4 italic">
              "You recovered every single time. That's the whole game." — Peeko 🦊
            </p>
            <button
              onClick={() => onNavigate('login')}
              className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all"
            >
              Join the Recovery
            </button>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
          Built with 🧡 for students who zone out · Powered by AI
        </div>
      </footer>
    </div>
  );
}
