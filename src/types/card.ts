// 카드 타입 정의

export type CardType = 'general' | 'strategy' | 'resource' | 'event' | 'tactician';
export type Faction = 'wei' | 'shu' | 'wu' | 'neutral';
export type Rarity = 'common' | 'rare' | 'legendary';

// 구현된 전략 효과 (엔진에서 실제 처리)
export type ImplementedStrategyEffect =
  | 'BURN'      // 화공 - 적 방어력 감소
  | 'AMBUSH'    // 매복 - 선제 공격 (공격력 추가)
  | 'SIEGE'     // 공성 - 영토 공격 보너스
  | 'REINFORCE'; // 증원 - 방어력 보너스

// 미구현 전략 효과 (향후 구현 예정)
export type UnimplementedStrategyEffect =
  | 'CHAIN'     // 연환계 - 적 행동력 감소 (TODO)
  | 'DIVIDE'    // 이간계 - 동맹 해제 (TODO)
  | 'ALLIANCE'  // 동맹 - 상호 공격 불가 (TODO)
  | 'RETREAT'   // 퇴각 - 전투 회피 (TODO)
  | 'SPY';      // 첩보 - 적 손패 확인 (TODO)

// 전체 전략 효과 (구현 + 미구현)
export type StrategyEffect = ImplementedStrategyEffect | UnimplementedStrategyEffect;

export type EventType = 'weather' | 'rebellion' | 'diplomacy' | 'fortune';

// 구현된 이벤트 효과 (엔진에서 실제 처리)
export type ImplementedEventEffect =
  | 'DRAW_3'            // 카드 3장 추가 뽑기 (천운)
  | 'ATTACK_DEBUFF'     // 모든 공격력 -2 (폭풍우)
  | 'DISCARD_ALL_1'     // 모든 플레이어 손패 1장 버림 (역병)
  | 'BLOCK_NEUTRAL'     // 주인 없는 영토 점령 불가 (황건적)
  | 'BLOCK_ATTACK'      // 모든 공격 불가 (휴전)
  | 'ATTACK_BUFF';      // 내 공격력 +1 (청명)

// 미구현 이벤트 효과 (향후 구현 예정)
// 현재 모든 이벤트 효과가 구현되어 있음

// 전체 이벤트 효과
export type EventEffect = ImplementedEventEffect;

export interface BaseCard {
  id: string;
  name: string;
  nameKo: string;
  type: CardType;
  faction: Faction;
  rarity: Rarity;
  description: string;
  cost: number; // 행동력 비용
  quantity?: number; // 덱에 포함될 수량 (기본값: 1)
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

// 구현된 자원 보너스 효과 (엔진에서 실제 처리)
export type ImplementedResourceBonusEffect =
  | 'DRAW_1'             // 카드 1장 추가 뽑기
  | 'ATTACK_BOOST'       // 이번 턴 무장 공격력 +2
  | 'ATTACK_BOOST_SMALL' // 이번 턴 무장 공격력 +1
  | 'TERRITORY_DEFENSE'; // 영토 방어 보너스 +2

// 미구현 자원 보너스 효과 (향후 구현 예정)
// 현재 모든 자원 보너스 효과가 구현되어 있음

// 전체 자원 보너스 효과
export type ResourceBonusEffect = ImplementedResourceBonusEffect;

export interface ResourceCard extends BaseCard {
  type: 'resource';
  value: number;
  bonusEffect?: ResourceBonusEffect;
}

export interface EventCard extends BaseCard {
  type: 'event';
  eventType: EventType;
  duration: number;
  globalEffect: boolean;
  effect?: EventEffect;  // 이벤트 효과 (타입 기반 처리)
}

// 책사 카드 타입 (현재 단일 값만 사용, 확장 시 추가)
// timing: 책사 효과 발동 시점 (현재: 공격 선언 시)
// slot: 책사 장착 슬롯 (현재: 아이템)
// applyTo: 효과 적용 대상 (현재: 단일 공격 카드)
export type TacticianTiming = 'attack_declare';
export type TacticianSlot = 'item';
export type TacticianApplyTo = 'single_attack_card';

export interface TacticianCard extends BaseCard {
  type: 'tactician';
  tactics: number;   // 공격력 보너스
  timing: TacticianTiming;
  slot: TacticianSlot;
  applyTo: TacticianApplyTo;
}

export type Card = GeneralCard | StrategyCard | ResourceCard | EventCard | TacticianCard;

// 카드 유틸리티 타입 - Card에 instanceId 추가
export type CardInHand = Card & {
  instanceId: string; // 같은 카드 여러 장 구분용
};
