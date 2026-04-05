import { motion } from 'motion/react';
import { useStore } from '../store/useStore';

interface PeekoCharacterProps {
  size?: 'default' | 'compact';
}

export function PeekoCharacter({ size = 'default' }: PeekoCharacterProps) {
  const { peekoState, level, isRecording } = useStore();

  const getFox = () => {
    if (level >= 5) return '🦊✨';
    if (level >= 4) return '🦊🎓';
    return '🦊';
  };

  const isAlert = peekoState === 'alert' || peekoState === 'puffed';

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-3 select-none">
        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: isAlert
                ? 'radial-gradient(circle, oklch(88% 0.10 68), transparent 80%)'
                : 'radial-gradient(circle, oklch(93% 0.06 72), transparent 80%)',
            }}
          />
          <motion.span
            className="text-2xl relative z-10 leading-none"
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          >
            🦊
          </motion.span>
        </div>
        <div>
          <p className="text-xs font-black text-ink-900 leading-tight">Peeko</p>
          <p className="text-[11px] font-semibold text-ink-400">
            {isRecording ? 'Listening' : isAlert ? 'Alert' : 'Ready'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-4 select-none">
      {/* Glow circle */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-3">
        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700"
          style={{
            background: isAlert
              ? 'radial-gradient(ellipse at 50% 60%, oklch(86% 0.10 68) 0%, oklch(93% 0.05 72) 55%, transparent 80%)'
              : 'radial-gradient(ellipse at 50% 60%, oklch(93% 0.06 72) 0%, oklch(96% 0.03 74) 55%, transparent 80%)',
          }}
        />

        {/* Solid inner circle */}
        <div
          className="absolute inset-5 rounded-full transition-colors duration-700"
          style={{
            backgroundColor: isAlert
              ? 'oklch(92% 0.065 68)'
              : 'oklch(95% 0.040 72)',
          }}
        />

        {/* Recording pulse rings */}
        {isRecording && (
          <>
            <div
              className="absolute inset-3 rounded-full animate-recording-ring"
              style={{ border: '2px solid var(--brand)', opacity: 0.5 }}
            />
            <div
              className="absolute inset-1 rounded-full animate-recording-ring"
              style={{
                border: '2px solid var(--brand)',
                opacity: 0.25,
                animationDelay: '0.6s',
              }}
            />
          </>
        )}

        {/* Peeko emoji */}
        <motion.div
          className="relative z-10 text-7xl leading-none"
          animate={
            isAlert
              ? { y: [0, -8, 0], rotate: [0, -3, 3, 0] }
              : peekoState === 'sleepy'
              ? { y: [0, 4, 0], opacity: [1, 0.8, 1] }
              : { y: [0, -6, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: isAlert ? 1.8 : peekoState === 'sleepy' ? 4 : 3.5,
            ease: 'easeInOut',
          }}
        >
          {getFox()}
          {peekoState === 'sleepy' && (
            <motion.span
              className="absolute -top-3 -right-3 text-xl"
              animate={{ opacity: [0, 1, 0], y: [0, -12] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
            >
              z
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Status label */}
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-widest text-ink-400">
          {isRecording
            ? 'Listening'
            : peekoState === 'alert'
            ? 'On alert'
            : peekoState === 'sleepy'
            ? 'Resting'
            : 'Ready'}
        </p>
        {level > 1 && (
          <p className="text-xs font-semibold text-ink-300 mt-0.5">Level {level}</p>
        )}
      </div>
    </div>
  );
}
