import { motion } from 'motion/react';
import { useStore } from '../store/useStore';

export function PeekoCharacter() {
  const { peekoState, level } = useStore();

  const getFoxEmoji = () => {
    switch (level) {
      case 1: return '🦊'; // Baby
      case 2: return '🦊'; // Curious
      case 3: return '🦊'; // Focused
      case 4: return '🦊🎓'; // Scholar
      case 5: return '🦊✨'; // Legendary
      default: return '🦊';
    }
  };

  const getAnimation = () => {
    switch (peekoState) {
      case 'calm':
        return {
          y: [0, -5, 0],
          transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
        };
      case 'fidgety':
        return {
          x: [0, -5, 5, -5, 0],
          rotate: [0, -5, 5, -5, 0],
          transition: { repeat: Infinity, duration: 2 }
        };
      case 'puffed':
        return {
          scale: [1, 1.1, 1],
          filter: ['drop-shadow(0 0 0px rgba(239,68,68,0))', 'drop-shadow(0 0 20px rgba(239,68,68,0.5))', 'drop-shadow(0 0 0px rgba(239,68,68,0))'],
          transition: { repeat: Infinity, duration: 1.5 }
        };
      case 'happy':
        return {
          y: [0, -20, 0],
          rotate: [0, 10, -10, 0],
          transition: { duration: 0.5 }
        };
      case 'sleepy':
        return {
          y: [0, 5, 0],
          opacity: [1, 0.8, 1],
          transition: { repeat: Infinity, duration: 4 }
        };
      default:
        return {};
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        animate={getAnimation()}
        className="text-8xl relative"
      >
        {getFoxEmoji()}
        {peekoState === 'sleepy' && (
          <motion.div 
            animate={{ opacity: [0, 1, 0], y: [0, -20] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-4 -right-4 text-2xl"
          >
            zZ
          </motion.div>
        )}
      </motion.div>
      <div className="mt-4 text-center">
        <h2 className="text-xl font-bold text-gray-800">Peeko (Lvl {level})</h2>
        <p className="text-sm text-gray-500 capitalize">{peekoState}</p>
      </div>
    </div>
  );
}
