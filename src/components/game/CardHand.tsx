'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import type { CardInHand } from '@/types/card';
import { cn } from '@/lib/utils';

interface CardHandProps {
  cards: CardInHand[];
  selectedCardIds: string[];
  onCardClick: (cardId: string) => void;
  isMyTurn: boolean;
  maxSelectable?: number;
  className?: string;
}

export function CardHand({
  cards,
  selectedCardIds,
  onCardClick,
  isMyTurn,
  maxSelectable = 5,
  className,
}: CardHandProps) {
  // 카드 펼침 각도 계산
  const getCardStyle = (index: number, total: number) => {
    const maxSpread = 40; // 최대 펼침 각도
    const spread = Math.min(maxSpread, total * 5);
    const startAngle = -spread / 2;
    const angleStep = total > 1 ? spread / (total - 1) : 0;
    const angle = startAngle + index * angleStep;

    // 부채꼴 배치
    const translateY = Math.abs(angle) * 0.5;

    return {
      rotate: angle,
      y: translateY,
      x: (index - (total - 1) / 2) * 70, // 카드 간격
    };
  };

  return (
    <div className={cn('relative h-full flex items-center justify-center', className)}>
      {/* 손패 카드 표시 */}
      <div className="relative flex items-end justify-center" style={{ perspective: '1000px' }}>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const style = getCardStyle(index, cards.length);
            const isSelected = selectedCardIds.includes(card.instanceId);
            const canSelect = isMyTurn && (isSelected || selectedCardIds.length < maxSelectable);

            return (
              <motion.div
                key={card.instanceId}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -20 : style.y,
                  scale: 1,
                  rotate: style.rotate,
                  x: style.x,
                }}
                exit={{ opacity: 0, y: 50, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ zIndex: isSelected ? 100 : index }}
                className="absolute origin-bottom"
              >
                <Card
                  card={card}
                  isSelected={isSelected}
                  isPlayable={canSelect}
                  onClick={() => onCardClick(card.instanceId)}
                  size="md"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 손패 정보 */}
      <div className="absolute bottom-2 right-4 text-sm text-gray-600 bg-white/80 px-3 py-1 rounded-full">
        손패: {cards.length}/7
        {selectedCardIds.length > 0 && (
          <span className="ml-2 text-amber-600 font-bold">
            ({selectedCardIds.length}장 선택)
          </span>
        )}
      </div>

      {/* 내 턴이 아닐 때 오버레이 */}
      {!isMyTurn && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <span className="text-white text-lg font-bold bg-black/50 px-4 py-2 rounded-lg">
            상대방 턴입니다
          </span>
        </div>
      )}
    </div>
  );
}
