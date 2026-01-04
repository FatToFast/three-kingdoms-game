'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Card as CardType, CardInHand } from '@/types/card';
import { CardTooltip } from './CardTooltip';

interface CardProps {
  card: CardType | CardInHand;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showBack?: boolean;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

const factionColors = {
  wei: {
    bg: 'bg-blue-600',
    border: 'border-blue-800',
    gradient: 'from-blue-700 to-blue-500',
  },
  shu: {
    bg: 'bg-green-600',
    border: 'border-green-800',
    gradient: 'from-green-700 to-green-500',
  },
  wu: {
    bg: 'bg-red-600',
    border: 'border-red-800',
    gradient: 'from-red-700 to-red-500',
  },
  neutral: {
    bg: 'bg-amber-600',
    border: 'border-amber-800',
    gradient: 'from-amber-700 to-amber-500',
  },
};

const typeIcons: Record<CardType['type'], string> = {
  general: '⚔️',
  strategy: '📜',
  resource: '💰',
  event: '🌟',
  tactician: '🧠',
};

const rarityStyles = {
  common: '',
  rare: 'ring-2 ring-purple-400',
  legendary: 'ring-2 ring-yellow-400 shadow-yellow-400/50',
};

export function Card({
  card,
  isSelected = false,
  isPlayable = true,
  onClick,
  size = 'md',
  showBack = false,
  showTooltip = true,
  tooltipPosition = 'right',
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    xs: 'w-11 h-16 text-[6px]',
    sm: 'w-16 h-24 text-[8px]',
    md: 'w-24 h-36 text-xs',
    lg: 'w-32 h-48 text-sm',
  };

  const faction = factionColors[card.faction];

  if (showBack) {
    return (
      <div
        className={cn(
          'relative rounded-lg border-2 border-amber-800 overflow-hidden',
          'bg-gradient-to-br from-amber-900 to-amber-700',
          sizeClasses[size]
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-4xl opacity-50">🐉</div>
        </div>
        <div className="absolute inset-2 border border-amber-600/50 rounded" />
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        className={cn(
          'relative rounded-lg border-2 cursor-pointer overflow-hidden select-none',
          sizeClasses[size],
          faction.border,
          `bg-gradient-to-br ${faction.gradient}`,
          rarityStyles[card.rarity],
          isSelected && 'ring-4 ring-yellow-300 scale-105 z-10',
          !isPlayable && 'opacity-50 cursor-not-allowed grayscale'
        )}
        whileHover={isPlayable ? { y: -8, scale: 1.05 } : {}}
        whileTap={isPlayable ? { scale: 0.98 } : {}}
        onClick={isPlayable ? onClick : undefined}
        layout
      >
      {/* 카드 타입 아이콘 */}
      <div className="absolute top-1 left-1 text-base drop-shadow-md">
        {typeIcons[card.type]}
      </div>

      {/* 비용 */}
      <div
        className={cn(
          'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shadow-md',
          card.cost === 0 ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'
        )}
      >
        {card.cost}
      </div>

      {/* 카드 이미지 영역 */}
      <div className="h-[45%] mt-6 mx-1 bg-white/20 rounded flex items-center justify-center">
        {card.type === 'general' && <span className="text-3xl">👤</span>}
        {card.type === 'strategy' && <span className="text-3xl">📋</span>}
        {card.type === 'resource' && <span className="text-3xl">🏛️</span>}
        {card.type === 'event' && <span className="text-3xl">⚡</span>}
        {card.type === 'tactician' && <span className="text-3xl">🧠</span>}
      </div>

      {/* 카드 정보 */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/30 text-white">
        <div className="font-bold truncate text-center leading-tight">{card.nameKo}</div>

        {/* 무장 카드: 공격력/방어력 */}
        {card.type === 'general' && (
          <div className="flex justify-center gap-3 mt-0.5">
            <span className="flex items-center gap-0.5">
              <span>⚔️</span>
              <span className="font-bold">{card.attack}</span>
            </span>
            <span className="flex items-center gap-0.5">
              <span>🛡️</span>
              <span className="font-bold">{card.defense}</span>
            </span>
          </div>
        )}

        {/* 전략/자원 카드: 수치 */}
        {card.type === 'strategy' && (
          <div className="text-center mt-0.5 opacity-90">
            {card.effect === 'BURN' && `방어 -${card.value}`}
            {card.effect === 'SIEGE' && `공격 +${card.value}`}
            {card.effect === 'REINFORCE' && `방어 +${card.value}`}
            {card.effect === 'AMBUSH' && `기습 +${card.value}`}
            {card.effect === 'CHAIN' && '행동력 -1'}
            {card.effect === 'ALLIANCE' && '동맹'}
            {card.effect === 'DIVIDE' && '이간'}
            {card.effect === 'RETREAT' && '퇴각'}
            {card.effect === 'SPY' && '첩보'}
          </div>
        )}

        {card.type === 'resource' && (
          <div className="text-center mt-0.5 opacity-90">
            {card.value > 0 && `병력 +${card.value}`}
            {card.bonusEffect && ' +효과'}
          </div>
        )}

        {card.type === 'tactician' && (
          <div className="text-center mt-0.5 opacity-90">
            책략 +{card.tactics}
          </div>
        )}

        {/* 설명 (큰 사이즈에서만) */}
        {size === 'lg' && (
          <div className="text-[10px] mt-1 opacity-80 line-clamp-2 leading-tight">
            {card.description}
          </div>
        )}
      </div>

      {/* 레전더리 반짝임 효과 */}
      {card.rarity === 'legendary' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-pulse pointer-events-none" />
      )}

      </motion.div>

      {/* 호버 툴팁 */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <CardTooltip card={card} position={tooltipPosition} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
