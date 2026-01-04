// 플레이어 타입 정의

import type { CardInHand } from './card';

// 플레이어 ID 타입 (명확한 의도 표현, string과 호환)
// 참고: 브랜드 타입(`string & { __brand }`) 도입 시 모든 함수 시그니처 수정 필요
export type PlayerId = string;

// 플레이어 ID 생성 헬퍼
export const createPlayerId = (index: number): PlayerId => `player-${index}`;

export interface Player {
  id: PlayerId;
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
  nextTurnActionPenalty?: number; // 다음 턴 행동력 페널티 (손패 초과 등)
}

export const PLAYER_COLORS = [
  '#EF4444', // 빨강
  '#3B82F6', // 파랑
  '#22C55E', // 초록
  '#F59E0B', // 노랑
] as const;

// 기본 손패 제한 + 소프트 캡 규칙
export const SOFT_HAND_SIZE = 8; // 기본 제한
export const MAX_HAND_SIZE = 9; // 소프트 캡 포함 최대 허용치
export const ACTIONS_PER_TURN = 3;
export const INITIAL_HAND_SIZE = 5;
