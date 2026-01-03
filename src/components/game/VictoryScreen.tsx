'use client';

import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import type { Player } from '@/types/player';

interface VictoryScreenProps {
  winner: Player;
  onPlayAgain: () => void;
}

export function VictoryScreen({ winner, onPlayAgain }: VictoryScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-amber-400 to-red-500"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-center"
      >
        {/* 왕관 이모지 */}
        <motion.div
          className="text-8xl mb-4"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          👑
        </motion.div>

        {/* 축하 메시지 */}
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
          천하통일!
        </h1>

        {/* 승자 이름 */}
        <motion.div
          className="text-3xl font-bold mb-6"
          style={{ color: winner.color }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🎉 {winner.name} 승리! 🎉
        </motion.div>

        {/* 별 효과 */}
        <div className="flex justify-center gap-4 mb-8">
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              className="text-4xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              ⭐
            </motion.span>
          ))}
        </div>

        {/* 다시하기 버튼 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            🎮 다시 하기
          </Button>
        </motion.div>
      </motion.div>

      {/* 배경 효과 - 파티클 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            initial={{
              x: Math.random() * window.innerWidth,
              y: -50,
              rotate: 0,
            }}
            animate={{
              y: window.innerHeight + 50,
              rotate: 360,
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            {['🎊', '🎉', '✨', '🏆', '⭐'][Math.floor(Math.random() * 5)]}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
