// 영토 타입 정의

import type { GeneralCard, CardInHand } from './card';
import type { PlayerId } from './player';

export interface Position {
  x: number;
  y: number;
}

// 배치된 무장 카드 타입 (CardInHand 기반, GeneralCard만 허용)
// CardInHand와 동일한 구조로 discardPile 이동 시 타입 변환 불필요
export type GarrisonCard = GeneralCard & { instanceId: string };

// 영토 ID 타입 (향후 브랜드 타입 도입 가능)
export type TerritoryId = string;

export interface Territory {
  id: TerritoryId;
  name: string;
  nameKo: string;
  value: number; // 승점 가치 (1-3)
  position: Position;
  adjacentTo: TerritoryId[]; // 인접 영토 ID
  owner: PlayerId | null; // 소유 플레이어 ID (브랜드 타입)
  garrison: GarrisonCard[]; // 배치된 무장 (instanceId 포함)
  defenseBonus: number; // 지형 방어 보너스
}

// 영토 연결 관계
export interface TerritoryConnection {
  from: string;
  to: string;
}
