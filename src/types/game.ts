// 게임 상태 타입 정의

import type { Card, CardInHand, EventCard } from './card';
import type { Player } from './player';
import type { Territory } from './territory';

export type GamePhase = 'waiting' | 'playing' | 'finished';
export type TurnPhase = 'draw' | 'action' | 'discard';

export interface CombatState {
  attackerId: string;
  defenderId: string;
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
  combat: CombatState | null;
  winner: string | null;
  log: GameLogEntry[];
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
}

// 게임 상수
export const VICTORY_TERRITORIES = 18;
export const VICTORY_VALUE = 30;
export const CARDS_PER_DRAW = 2;
