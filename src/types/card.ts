// 카드 타입 정의

export type CardType = 'general' | 'strategy' | 'resource' | 'event' | 'tactician';
export type Faction = 'wei' | 'shu' | 'wu' | 'neutral';
export type Rarity = 'common' | 'rare' | 'legendary';

export type StrategyEffect =
  | 'BURN'      // 화공 - 적 방어력 감소
  | 'AMBUSH'    // 매복 - 선제 공격
  | 'CHAIN'     // 연환계 - 적 행동력 감소
  | 'DIVIDE'    // 이간계 - 동맹 해제
  | 'SIEGE'     // 공성 - 영토 공격 보너스
  | 'ALLIANCE'  // 동맹 - 상호 공격 불가
  | 'REINFORCE' // 증원 - 방어력 보너스
  | 'RETREAT'   // 퇴각 - 전투 회피
  | 'SPY';      // 첩보 - 적 손패 확인

export type EventType = 'weather' | 'rebellion' | 'diplomacy' | 'fortune';

export interface BaseCard {
  id: string;
  name: string;
  nameKo: string;
  type: CardType;
  faction: Faction;
  rarity: Rarity;
  description: string;
  cost: number; // 행동력 비용
}

export interface GeneralCard extends BaseCard {
  type: 'general';
  attack: number;
  defense: number;
  ability?: {
    name: string;
    description: string;
  };
}

export interface StrategyCard extends BaseCard {
  type: 'strategy';
  effect: StrategyEffect;
  value: number;
  targetType: 'self' | 'enemy' | 'territory' | 'all';
}

export interface ResourceCard extends BaseCard {
  type: 'resource';
  value: number;
  bonusEffect?: string;
}

export interface EventCard extends BaseCard {
  type: 'event';
  eventType: EventType;
  duration: number;
  globalEffect: boolean;
}

export type TacticianTiming = 'attack_declare';
export type TacticianSlot = 'item';
export type TacticianApplyTo = 'single_attack_card';

export interface TacticianCard extends BaseCard {
  type: 'tactician';
  tactics: number;
  timing: TacticianTiming;
  slot: TacticianSlot;
  applyTo: TacticianApplyTo;
}

export type Card = GeneralCard | StrategyCard | ResourceCard | EventCard | TacticianCard;

// 카드 유틸리티 타입 - Card에 instanceId 추가
export type CardInHand = Card & {
  instanceId: string; // 같은 카드 여러 장 구분용
};
