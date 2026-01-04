'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import type { CardInHand } from '@/types/card';
import { MAX_HAND_SIZE, SOFT_HAND_SIZE } from '@/types/player';
import { cn } from '@/lib/utils';

// 한 번에 선택 가능한 최대 카드 수 (공격 시 무장 + 전략 + 책사)
const MAX_CARD_SELECTABLE = 5;

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
  maxSelectable = MAX_CARD_SELECTABLE,
  className,
}: CardHandProps) {
  const isOverSoftLimit = cards.length > SOFT_HAND_SIZE;
  // 모바일 감지 (SSR 안전)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 선택된 카드 ID Set (조회 최적화: O(n) → O(1))
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);

  // 카드 스타일 계산 캐시
  const cardStyles = useMemo(() => {
    const total = cards.length;
    const maxSpread = isMobile ? 20 : 40; // 모바일에서 각도 더 축소
    const spread = Math.min(maxSpread, total * (isMobile ? 3 : 5));
    const startAngle = -spread / 2;
    const angleStep = total > 1 ? spread / (total - 1) : 0;
    const cardGap = isMobile ? 28 : 70; // 모바일에서 간격 더 축소 (xs 카드 너비에 맞춤)

    return cards.map((_, index) => {
      const angle = startAngle + index * angleStep;
      const translateY = Math.abs(angle) * (isMobile ? 0.15 : 0.3);

      return {
        rotate: angle,
        y: translateY,
        x: (index - (total - 1) / 2) * cardGap,
      };
    });
  }, [cards.length, isMobile]);

  return (
    <div className={cn('relative h-full flex items-center justify-center', className)}>
      {/* 손패 카드 표시 */}
      <div className="relative flex items-end justify-center" style={{ perspective: '1000px' }}>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const style = cardStyles[index];
            const isSelected = selectedCardIdSet.has(card.instanceId);
            const canSelect = isMyTurn && (isSelected || selectedCardIds.length < maxSelectable);

            // 내 턴이 아닐 때는 클릭 이벤트 차단
            const handleClick = isMyTurn ? () => onCardClick(card.instanceId) : undefined;

            return (
              <motion.div
                key={card.instanceId}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? (isMobile ? -10 : -20) : style.y,
                  scale: 1,
                  rotate: style.rotate,
                  x: style.x,
                }}
                exit={{ opacity: 0, y: 30, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ zIndex: isSelected ? 100 : index }}
                className="absolute origin-bottom"
              >
                <Card
                  card={card}
                  isSelected={isSelected}
                  isPlayable={canSelect}
                  onClick={handleClick}
                  size={isMobile ? 'xs' : 'md'}
                  tooltipPosition="top"
                  showTooltip={!isMobile}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 손패 정보 */}
      <div className="absolute bottom-0.5 md:bottom-2 right-1 md:right-4 text-[10px] md:text-sm text-gray-600 bg-white/80 px-1.5 md:px-3 py-0.5 md:py-1 rounded-full">
        🃏{cards.length}/{MAX_HAND_SIZE}
        {isOverSoftLimit && (
          <span className="ml-1 text-amber-600 font-bold">-1⚡</span>
        )}
        {selectedCardIds.length > 0 && (
          <span className="ml-1 text-blue-600 font-bold">
            +{selectedCardIds.length}
          </span>
        )}
      </div>

      {/* 내 턴이 아닐 때 오버레이 */}
      {!isMyTurn && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <span className="text-white text-xs md:text-lg font-bold bg-black/50 px-2 md:px-4 py-1 md:py-2 rounded-lg">
            상대 턴
          </span>
        </div>
      )}
    </div>
  );
}
