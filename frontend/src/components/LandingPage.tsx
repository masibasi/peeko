import { motion } from 'motion/react';
import { ArrowRight, Zap } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'dashboard') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-base overflow-hidden">

      {/* Nav */}
      <header className="px-6 py-5 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">🦊</span>
          <span className="text-xl font-black text-ink-900 tracking-tight">peeko</span>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="px-5 py-2.5 bg-brand text-white rounded-full font-bold text-sm hover:scale-[1.03] active:scale-[0.97] transition-transform btn-depth-brand"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-8 pb-24">

        {/* Hero grid: text left, Peeko right */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-20">

          {/* Text column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-brand-subtle text-brand-dark px-4 py-1.5 rounded-full text-sm font-bold mb-6">
              <Zap className="w-3.5 h-3.5" />
              Real-time lecture recovery
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-ink-900 leading-[1.05] tracking-tight mb-6">
              Zone out?{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-brand">Bounce</span>
                <span
                  className="absolute inset-x-0 bottom-1 h-3 -z-0 rounded-sm opacity-30"
                  style={{ backgroundColor: 'var(--brand)' }}
                />
              </span>
              {' '}back.
            </h1>

            <p className="text-lg text-ink-500 mb-8 max-w-md leading-relaxed font-medium">
              Peeko listens to your lecture and builds a live timeline of summary cards. Miss something?
              One tap brings you back — no shame, no scroll.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-2.5 bg-brand text-white px-8 py-4 rounded-2xl font-black text-lg transition-all btn-depth-brand hover:scale-[1.02] active:scale-[0.98] group"
              >
                Start for free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-sm text-ink-400 font-semibold">No install needed</span>
            </div>
          </motion.div>

          {/* Peeko column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            {/* Glow circle + Peeko */}
            <div className="relative w-72 h-72 lg:w-80 lg:h-80 flex items-center justify-center">
              {/* Outer ambient glow */}
              <div
                className="absolute inset-0 rounded-full opacity-60"
                style={{
                  background: 'radial-gradient(circle, oklch(90% 0.08 70) 0%, oklch(95% 0.04 73) 55%, transparent 80%)',
                }}
              />
              {/* Inner warm circle */}
              <div
                className="absolute inset-8 rounded-full"
                style={{ backgroundColor: 'oklch(95% 0.045 70)' }}
              />
              {/* Peeko */}
              <motion.div
                className="relative z-10 text-9xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              >
                🦊
              </motion.div>

              {/* Floating badge: "Live" */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute top-6 right-6 bg-white border border-ink-100 shadow-warm px-3 py-1.5 rounded-full text-xs font-black text-ink-700 flex items-center gap-1.5"
              >
                <span
                  className="w-2 h-2 rounded-full bg-brand animate-pulse"
                />
                Live
              </motion.div>

              {/* Floating badge: keyword bubble */}
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-10 -left-4 bg-white border border-ink-100 shadow-warm px-3 py-1.5 rounded-full text-xs font-bold text-ink-700"
              >
                gradient descent
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="absolute bottom-4 left-10 bg-white border border-ink-100 shadow-warm px-3 py-1.5 rounded-full text-xs font-bold text-ink-700"
              >
                learning rate
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl mb-20 overflow-hidden"
          style={{ backgroundColor: 'oklch(16% 0.015 58)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {[
              { stat: '5 min', label: 'Summary cards' },
              { stat: '1 tap', label: 'To catch up' },
              { stat: '∞', label: 'Recoveries welcome' },
              { stat: '0 guilt', label: 'Zoning out is human' },
            ].map(({ stat, label }) => (
              <div key={label} className="py-8 px-6 text-center">
                <div
                  className="text-3xl font-black mb-1 tabular"
                  style={{ color: 'oklch(78% 0.13 58)' }}
                >
                  {stat}
                </div>
                <div className="text-sm font-semibold" style={{ color: 'oklch(70% 0.03 68)' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* How it works — editorial layout, not identical cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-black text-ink-900 mb-10 tracking-tight">How it works</h2>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Step 1 — large */}
            <div
              className="md:col-span-1 rounded-2xl p-7"
              style={{ backgroundColor: 'var(--brand-subtle)' }}
            >
              <div className="text-4xl mb-5">🎧</div>
              <div className="text-xs font-black text-brand uppercase tracking-widest mb-2">Step 1</div>
              <h3 className="text-xl font-black text-ink-900 mb-2 leading-tight">Peeko listens</h3>
              <p className="text-ink-500 text-sm font-semibold leading-relaxed">
                Press record and Peeko transcribes your lecture in real-time, building summary cards every few minutes.
              </p>
            </div>

            {/* Steps 2 & 3 — stacked */}
            <div className="md:col-span-2 grid grid-rows-2 gap-5">
              <div
                className="rounded-2xl p-7 flex items-start gap-5"
                style={{ backgroundColor: 'oklch(95% 0.040 180)' }}
              >
                <div className="text-4xl shrink-0">🦊</div>
                <div>
                  <div
                    className="text-xs font-black uppercase tracking-widest mb-2"
                    style={{ color: 'var(--catchup)' }}
                  >
                    Step 2
                  </div>
                  <h3 className="text-xl font-black text-ink-900 mb-1 leading-tight">Zone out? That's fine.</h3>
                  <p className="text-ink-500 text-sm font-semibold leading-relaxed">
                    Peeko keeps building the timeline while you're gone. When you're back, hit "Catch Me Up."
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl p-7 flex items-start gap-5"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                <div className="text-4xl shrink-0">⚡</div>
                <div>
                  <div className="text-xs font-black text-ink-400 uppercase tracking-widest mb-2">Step 3</div>
                  <h3 className="text-xl font-black text-ink-900 mb-1 leading-tight">Back in seconds</h3>
                  <p className="text-ink-500 text-sm font-semibold leading-relaxed">
                    A personalized recovery card tells you exactly what you missed and how to re-engage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className="text-ink-400 font-semibold mb-6 italic text-sm">
            "You recovered every single time. That's the whole game." — Peeko 🦊
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="px-10 py-4 font-black text-lg text-white rounded-2xl transition-all btn-depth-dark hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'oklch(16% 0.015 58)' }}
          >
            Join the recovery
          </button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-ink-400 font-semibold">
          <span>🦊 Peeko · Build4SC 2025</span>
          <span>Design — Human-Centric AI</span>
        </div>
      </footer>
    </div>
  );
}
