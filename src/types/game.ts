// 게임 상태 타입 정의

import type { Card, CardInHand, EventCard } from './card';
import type { Player, PlayerId } from './player';
import type { Territory } from './territory';

export type GamePhase = 'waiting' | 'playing' | 'finished';
export type TurnPhase = 'draw' | 'action' | 'discard';

export interface CombatState {
  attackerId: PlayerId;
  defenderId: PlayerId;
  targetTerritoryId: string;
  attackCards: CardInHand[];
  defenseCards: CardInHand[];
  tacticianCard: CardInHand | null;
  tacticianTargetInstanceId: string | null;
  phase: 'selecting' | 'defending' | 'resolving' | 'resolved';
  result?: CombatResult;
}

export interface CombatResult {
  attackPower: number;
  defensePower: number;
  winner: 'attacker' | 'defender';
  difference: number;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  playerId: string;
  action: string;
  details: string;
  timestamp: Date;
}

// 턴 기반 효과 (턴 종료 시 자동 만료)
export interface TurnEffect {
  type: 'ATTACK_BOOST' | 'ATTACK_BOOST_SMALL' | 'TERRITORY_DEFENSE' | 'ATTACK_DEBUFF' | 'ATTACK_BUFF';
  playerId: PlayerId; // 효과 적용 대상
  value: number; // 효과 수치
  territoryId?: string; // 영토 방어 보너스용
}

// 승리 후보 추적 (1턴 유지 시 승리 확정)
export interface VictoryCandidate {
  playerId: PlayerId;
  turnAchieved: number; // 승리 조건 달성 턴
}

export interface GameState {
  id: string;
  phase: GamePhase;
  currentTurn: number;
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  players: Player[];
  territories: Territory[];
  deck: CardInHand[];
  discardPile: CardInHand[];
  activeEvents: EventCard[];
  turnEffects: TurnEffect[]; // 턴 기반 효과 (턴 종료 시 만료)
  combat: CombatState | null;
  winner: string | null;
  victoryCandidate: VictoryCandidate | null; // 승리 후보 (1턴 유지 필요)
  log: GameLogEntry[];
  // 글로벌 효과 플래그 (이벤트 카드용)
  blockNeutralCapture: boolean; // 황건적: 주인 없는 영토 점령 불가
  blockAllAttacks: boolean; // 휴전: 모든 공격 불가
}

// 게임 액션 타입
export type GameAction =
  | { type: 'DRAW_CARDS' }
  | { type: 'PLAY_CARD'; cardId: string; targetId?: string }
  | { type: 'ATTACK'; targetTerritoryId: string; cardIds: string[] }
  | { type: 'DEFEND'; cardIds: string[] }
  | { type: 'DEPLOY'; cardId: string; territoryId: string }
  | { type: 'DISCARD'; cardId: string }
  | { type: 'END_TURN' }
  | { type: 'SKIP_DEFENSE' };

// 게임 설정
export interface GameConfig {
  playerCount: number;
  playerNames: string[];
  enableAI: boolean;
  aiDifficulty?: 'easy' | 'normal' | 'hard';
  nonGeneralMultiplier?: number; // 비무장 카드 복제 배수 (기본값: 2)
}

// 게임 설정 기본값
export const DEFAULT_GAME_CONFIG = {
  nonGeneralMultiplier: 2,
} as const;

// 게임 초기화 옵션
export interface GameOptions {
  nonGeneralMultiplier?: number;
}

// 게임 상수
export const VICTORY_TERRITORIES = 46; // 전체 지도 장악
export const VICTORY_VALUE = 999; // 비활성화 (전체 점령만 유효)
export const CARDS_PER_DRAW = 2;
