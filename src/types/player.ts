// 플레이어 타입 정의

import type { CardInHand } from './card';

export interface Player {
  id: string;
  name: string;
  color: string;
  hand: CardInHand[]; // 손패
  handSize?: number; // 마스킹된 손패 개수
  territories: string[]; // 소유 영토 ID
  actions: number; // 남은 행동력 (기본 3)
  isActive: boolean; // 현재 턴 여부
  isEliminated: boolean; // 탈락 여부
  alliances: string[]; // 동맹 플레이어 ID
  resources: number; // 병력 자원
  isAI?: boolean; // AI 플레이어 여부
}

export const PLAYER_COLORS = [
  '#EF4444', // 빨강
  '#3B82F6', // 파랑
  '#22C55E', // 초록
  '#F59E0B', // 노랑
] as const;

export const MAX_HAND_SIZE = 7;
export const ACTIONS_PER_TURN = 3;
export const INITIAL_HAND_SIZE = 5;
