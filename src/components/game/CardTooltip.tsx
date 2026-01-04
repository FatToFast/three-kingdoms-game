'use client';

import { cn } from '@/lib/utils';
import type { Card as CardType, CardInHand, GeneralCard, StrategyCard, ResourceCard, EventCard, TacticianCard } from '@/types/card';

interface CardTooltipProps {
  card: CardType | CardInHand;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const factionNames = {
  wei: '위(魏)',
  shu: '촉(蜀)',
  wu: '오(吳)',
  neutral: '중립',
};

const factionColors = {
  wei: 'border-blue-500 bg-blue-950/95',
  shu: 'border-green-500 bg-green-950/95',
  wu: 'border-red-500 bg-red-950/95',
  neutral: 'border-amber-500 bg-amber-950/95',
};

const rarityNames = {
  common: '일반',
  rare: '희귀',
  legendary: '전설',
};

const rarityColors = {
  common: 'text-gray-300',
  rare: 'text-purple-400',
  legendary: 'text-yellow-400',
};

const typeNames = {
  general: '무장',
  strategy: '전략',
  resource: '자원',
  event: '사건',
  tactician: '책사',
};

const effectDescriptions: Record<string, string> = {
  BURN: '화공 - 적의 방어력을 감소시킵니다.',
  AMBUSH: '매복 - 기습 공격으로 적의 방어를 제한합니다.',
  CHAIN: '연환계 - 적의 행동력을 감소시킵니다.',
  DIVIDE: '이간계 - 적의 동맹을 해제시킵니다.',
  SIEGE: '공성 - 영토 공격 시 보너스를 얻습니다.',
  ALLIANCE: '동맹 - 다른 플레이어와 휴전합니다.',
  REINFORCE: '증원 - 방어력을 증가시킵니다.',
  RETREAT: '퇴각 - 전투를 회피하고 카드를 회수합니다.',
  SPY: '첩보 - 적의 손패를 확인합니다.',
};

export function CardTooltip({ card, position = 'right' }: CardTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const renderGeneralInfo = (general: GeneralCard) => (
    <>
      <div className="flex items-center gap-4 my-2">
        <div className="flex items-center gap-1">
          <span className="text-red-400">⚔️</span>
          <span className="font-bold text-red-300">{general.attack}</span>
          <span className="text-gray-400 text-xs">공격력</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-blue-400">🛡️</span>
          <span className="font-bold text-blue-300">{general.defense}</span>
          <span className="text-gray-400 text-xs">방어력</span>
        </div>
      </div>
      {general.ability && (
        <div className="mt-2 p-2 bg-black/30 rounded border border-yellow-500/30">
          <div className="text-yellow-400 font-semibold text-sm flex items-center gap-1">
            <span>✨</span>
            {general.ability.name}
          </div>
          <div className="text-gray-300 text-xs mt-1">{general.ability.description}</div>
        </div>
      )}
    </>
  );

  const renderStrategyInfo = (strategy: StrategyCard) => (
    <>
      <div className="my-2 p-2 bg-black/30 rounded">
        <div className="text-purple-400 font-semibold text-sm">
          {effectDescriptions[strategy.effect] || strategy.effect}
        </div>
        {strategy.value > 0 && (
          <div className="text-gray-300 text-xs mt-1">
            효과 수치: <span className="text-white font-bold">{strategy.value}</span>
          </div>
        )}
        <div className="text-gray-400 text-xs mt-1">
          대상: {strategy.targetType === 'self' ? '아군' : strategy.targetType === 'enemy' ? '적군' : strategy.targetType === 'territory' ? '영토' : '전체'}
        </div>
      </div>
    </>
  );

  const renderResourceInfo = (resource: ResourceCard) => (
    <>
      <div className="my-2 p-2 bg-black/30 rounded">
        <div className="flex items-center gap-2">
          <span className="text-green-400">💰</span>
          <span className="text-green-300 font-bold">+{resource.value}</span>
          <span className="text-gray-400 text-xs">병력</span>
        </div>
        {resource.bonusEffect && (
          <div className="text-yellow-400 text-xs mt-1">
            추가 효과: {resource.bonusEffect}
          </div>
        )}
      </div>
    </>
  );

  const renderEventInfo = (event: EventCard) => (
    <>
      <div className="my-2 p-2 bg-black/30 rounded">
        <div className="text-cyan-400 text-sm">
          유형: {event.eventType === 'weather' ? '날씨' : event.eventType === 'rebellion' ? '반란' : event.eventType === 'diplomacy' ? '외교' : '행운'}
        </div>
        <div className="text-gray-300 text-xs mt-1">
          지속: {event.duration}턴
        </div>
        <div className="text-gray-400 text-xs mt-1">
          {event.globalEffect ? '전체 플레이어에게 적용' : '해당 플레이어만 적용'}
        </div>
      </div>
    </>
  );

  const renderTacticianInfo = (tactician: TacticianCard) => (
    <>
      <div className="my-2 p-2 bg-black/30 rounded">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">🧠</span>
          <span className="text-purple-300 font-bold">+{tactician.tactics}</span>
          <span className="text-gray-400 text-xs">책략 보너스</span>
        </div>
        <div className="text-gray-400 text-xs mt-2">
          사용 시점: 공격 선언 시
        </div>
        <div className="text-gray-400 text-xs">
          대상: 공격 카드 1장
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'absolute z-50 w-64 p-3 rounded-lg border-2 shadow-xl backdrop-blur-sm',
        'text-white pointer-events-none',
        factionColors[card.faction],
        positionClasses[position]
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-lg">{card.nameKo}</div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs', rarityColors[card.rarity])}>
            [{rarityNames[card.rarity]}]
          </span>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
        <span>{factionNames[card.faction]}</span>
        <span>•</span>
        <span>{typeNames[card.type]}</span>
        <span>•</span>
        <span className="text-yellow-400">비용 {card.cost}</span>
      </div>

      {/* 타입별 상세 정보 */}
      {card.type === 'general' && renderGeneralInfo(card as GeneralCard)}
      {card.type === 'strategy' && renderStrategyInfo(card as StrategyCard)}
      {card.type === 'resource' && renderResourceInfo(card as ResourceCard)}
      {card.type === 'event' && renderEventInfo(card as EventCard)}
      {card.type === 'tactician' && renderTacticianInfo(card as TacticianCard)}

      {/* 설명 */}
      <div className="mt-2 pt-2 border-t border-white/20">
        <p className="text-sm text-gray-200 leading-relaxed">{card.description}</p>
      </div>
    </div>
  );
}
