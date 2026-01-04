'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CardInHand, GeneralCard, StrategyCard, ResourceCard, EventCard, TacticianCard } from '@/types/card';
import { cn } from '@/lib/utils';

interface MobileCardDetailProps {
  cards: CardInHand[];
}

const factionColors = {
  wei: 'border-blue-500 bg-blue-900/95',
  shu: 'border-green-500 bg-green-900/95',
  wu: 'border-red-500 bg-red-900/95',
  neutral: 'border-amber-500 bg-amber-900/95',
};

const typeIcons: Record<string, string> = {
  general: '⚔️',
  strategy: '📜',
  resource: '💰',
  event: '🌟',
  tactician: '🧠',
};

const effectDescriptions: Record<string, string> = {
  BURN: '화공 - 적 방어 감소',
  AMBUSH: '매복 - 기습 공격',
  CHAIN: '연환계 - 적 행동력 감소',
  DIVIDE: '이간계 - 동맹 해제',
  SIEGE: '공성 - 공격 보너스',
  ALLIANCE: '동맹 - 휴전',
  REINFORCE: '증원 - 방어 증가',
  RETREAT: '퇴각 - 전투 회피',
  SPY: '첩보 - 적 손패 확인',
};

export function MobileCardDetail({ cards }: MobileCardDetailProps) {
  if (cards.length === 0) return null;

  // 여러 카드가 선택된 경우 간략하게 표시
  if (cards.length > 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-1 px-2"
      >
        <div className="bg-gray-900/95 text-white text-[10px] px-2 py-1 rounded-lg border border-gray-700 flex items-center gap-2 overflow-x-auto">
          {cards.map((card) => (
            <div key={card.instanceId} className="flex items-center gap-1 flex-shrink-0">
              <span>{typeIcons[card.type]}</span>
              <span className="font-medium">{card.nameKo}</span>
              {card.type === 'general' && (
                <span className="text-gray-400">
                  ⚔️{(card as GeneralCard).attack} 🛡️{(card as GeneralCard).defense}
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // 단일 카드 선택 시 상세 정보 표시
  const card = cards[0];

  const renderCardInfo = () => {
    switch (card.type) {
      case 'general': {
        const general = card as GeneralCard;
        return (
          <div className="flex items-center gap-3">
            <span className="text-red-400">⚔️{general.attack}</span>
            <span className="text-blue-400">🛡️{general.defense}</span>
            {general.ability && (
              <span className="text-yellow-400 text-[9px]">✨{general.ability.name}</span>
            )}
          </div>
        );
      }
      case 'strategy': {
        const strategy = card as StrategyCard;
        return (
          <div className="flex items-center gap-2">
            <span className="text-purple-400">
              {effectDescriptions[strategy.effect] || strategy.effect}
            </span>
            {strategy.value > 0 && <span className="text-white">+{strategy.value}</span>}
          </div>
        );
      }
      case 'resource': {
        const resource = card as ResourceCard;
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-400">병력 +{resource.value}</span>
            {resource.bonusEffect && (
              <span className="text-yellow-400 text-[9px]">+{resource.bonusEffect}</span>
            )}
          </div>
        );
      }
      case 'event': {
        const event = card as EventCard;
        return (
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{event.duration}턴 지속</span>
            <span className="text-gray-400">{event.globalEffect ? '전체' : '개인'}</span>
          </div>
        );
      }
      case 'tactician': {
        const tactician = card as TacticianCard;
        return (
          <div className="flex items-center gap-2">
            <span className="text-purple-400">책략 +{tactician.tactics}</span>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-1 px-2"
      >
        <div
          className={cn(
            'text-white text-[10px] px-2 py-1.5 rounded-lg border-2',
            factionColors[card.faction]
          )}
        >
          {/* 카드 이름 및 타입 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span>{typeIcons[card.type]}</span>
              <span className="font-bold">{card.nameKo}</span>
            </div>
            <span className="text-yellow-400">비용 {card.cost}</span>
          </div>

          {/* 타입별 정보 */}
          <div className="mt-0.5">
            {renderCardInfo()}
          </div>

          {/* 설명 (한 줄로 제한) */}
          <div className="mt-0.5 text-gray-300 truncate">
            {card.description}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
