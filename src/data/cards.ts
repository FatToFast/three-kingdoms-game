// 카드 덱 생성 유틸리티

import type { Card, CardInHand } from '@/types/card';
import { generals } from './generals';
import { strategies } from './strategies';
import { resources } from './resources';
import { events } from './events';
import { tacticians } from './tacticians';
import { nanoid } from 'nanoid';

// 카드 quantity 기반 확장 함수
function expandByQuantity<T extends Card>(cards: readonly T[]): T[] {
  return cards.flatMap((card) => {
    const count = card.quantity ?? 1;
    return Array.from({ length: count }, () => card);
  });
}

// 모든 카드 생성 함수 (quantity 기반)
function createAllCards(): Card[] {
  // 무장 카드는 quantity 기반 확장
  const expandedGenerals = expandByQuantity(generals as Card[]);
  // 비무장 카드도 quantity 기반 확장
  const expandedStrategies = expandByQuantity(strategies as Card[]);
  const expandedResources = expandByQuantity(resources as Card[]);
  const expandedEvents = expandByQuantity(events as Card[]);
  const expandedTacticians = expandByQuantity(tacticians as Card[]);

  return [
    ...expandedGenerals,
    ...expandedStrategies,
    ...expandedResources,
    ...expandedEvents,
    ...expandedTacticians,
  ];
}

// 기본 설정으로 생성된 카드 목록 (호환성 유지)
export const allCards: Card[] = createAllCards();

// 덱 생성 (인스턴스 ID 부여)
export function createDeck(): CardInHand[] {
  const cards = createAllCards();
  return cards.map((card) => ({
    ...card,
    instanceId: nanoid(),
  })) as CardInHand[];
}

// 덱 셔플 (Fisher-Yates 알고리즘)
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  shuffleInPlace(shuffled);
  return shuffled;
}

// In-place 셔플 (배열 복사 없이 직접 셔플)
export function shuffleInPlace<T>(deck: T[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// 카드 뽑기
export function drawCards(
  deck: CardInHand[],
  count: number
): { drawn: CardInHand[]; remaining: CardInHand[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

// 카드 타입별 필터
export function filterByType<T extends Card>(cards: T[], type: Card['type']): T[] {
  return cards.filter((card) => card.type === type);
}

// 진영별 필터
export function filterByFaction<T extends Card>(cards: T[], faction: Card['faction']): T[] {
  return cards.filter((card) => card.faction === faction);
}

// 카드 통계
export function getCardStats() {
  return {
    total: allCards.length,
    generals: filterByType(allCards, 'general').length,
    strategies: filterByType(allCards, 'strategy').length,
    resources: filterByType(allCards, 'resource').length,
    events: filterByType(allCards, 'event').length,
    tacticians: filterByType(allCards, 'tactician').length,
    byFaction: {
      wei: filterByFaction(allCards, 'wei').length,
      shu: filterByFaction(allCards, 'shu').length,
      wu: filterByFaction(allCards, 'wu').length,
      neutral: filterByFaction(allCards, 'neutral').length,
    },
  };
}
