'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Player } from '@/types/player';
import type { TurnPhase } from '@/types/game';

interface TurnIndicatorProps {
  turn: number;
  phase: TurnPhase;
  currentPlayer: Player | null;
}

const phaseLabels: Record<TurnPhase, string> = {
  draw: '카드 뽑기',
  action: '행동',
  discard: '카드 버리기',
};

const phaseEmojis: Record<TurnPhase, string> = {
  draw: '🎴',
  action: '⚔️',
  discard: '🗑️',
};

export function TurnIndicator({ turn, phase, currentPlayer }: TurnIndicatorProps) {
  if (!currentPlayer) return null;

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* 턴 번호 */}
      <div className="bg-amber-100 px-2 md:px-4 py-1 md:py-2 rounded-lg">
        <span className="text-xs md:text-sm text-amber-600">T</span>
        <span className="ml-1 text-lg md:text-2xl font-bold text-amber-800">{turn}</span>
      </div>

      {/* 현재 플레이어 */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <motion.div
          className="w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white text-sm md:text-base font-bold shadow-lg"
          style={{ backgroundColor: currentPlayer.color }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {currentPlayer.name.charAt(0)}
        </motion.div>
        <div className="hidden md:block">
          <div className="font-bold">{currentPlayer.name}</div>
          <div className="text-xs text-gray-500">의 차례</div>
        </div>
      </div>

      {/* 현재 페이즈 */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'px-2 md:px-4 py-1 md:py-2 rounded-lg flex items-center gap-1 md:gap-2',
          phase === 'draw' && 'bg-blue-100 text-blue-800',
          phase === 'action' && 'bg-green-100 text-green-800',
          phase === 'discard' && 'bg-red-100 text-red-800'
        )}
      >
        <span className="text-base md:text-xl">{phaseEmojis[phase]}</span>
        <span className="hidden md:inline font-medium">{phaseLabels[phase]}</span>
      </motion.div>
    </div>
  );
}
