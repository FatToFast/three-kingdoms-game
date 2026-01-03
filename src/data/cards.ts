// 카드 덱 생성 유틸리티

import type { Card, CardInHand } from '@/types/card';
import { generals } from './generals';
import { strategies } from './strategies';
import { resources } from './resources';
import { events } from './events';
import { tacticians } from './tacticians';
import { nanoid } from 'nanoid';

// 비무장 카드 비율 보정용 복제 배수
const NON_GENERAL_MULTIPLIER = 2;
const nonGeneralCards: Card[] = [...strategies, ...resources, ...events, ...tacticians] as Card[];
const nonGeneralCopies: Card[] = Array.from({ length: NON_GENERAL_MULTIPLIER })
  .flatMap(() => nonGeneralCards);

// 모든 카드 합치기
export const allCards: Card[] = [...generals, ...nonGeneralCopies] as Card[];

// 덱 생성 (인스턴스 ID 부여)
export function createDeck(): CardInHand[] {
  return allCards.map((card) => ({
    ...card,
    instanceId: nanoid(),
  })) as CardInHand[];
}

// 덱 셔플 (Fisher-Yates 알고리즘)
export function shuffleDeck<T>(deck: T[]): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
