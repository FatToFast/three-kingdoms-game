// 영토 타입 정의

import type { GeneralCard } from './card';

export interface Position {
  x: number;
  y: number;
}

export interface Territory {
  id: string;
  name: string;
  nameKo: string;
  value: number; // 승점 가치 (1-3)
  position: Position;
  adjacentTo: string[]; // 인접 영토 ID
  owner: string | null; // 소유 플레이어 ID
  garrison: GeneralCard[]; // 배치된 무장
  defenseBonus: number; // 지형 방어 보너스
}

// 영토 연결 관계
export interface TerritoryConnection {
  from: string;
  to: string;
}
