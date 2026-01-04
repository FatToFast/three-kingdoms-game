// AI 플레이어 로직

import type { GameState } from '@/types/game';
import type { CardInHand, GeneralCard, StrategyCard } from '@/types/card';
import type { Player } from '@/types/player';
import { GameEngine } from './engine';

export type AIDifficulty = 'easy' | 'normal' | 'hard';

interface AIDecision {
  action: 'attack' | 'deploy' | 'playCard' | 'endTurn';
  cardIds?: string[];
  targetTerritoryId?: string;
  tacticianTargetId?: string | null;
}

// AI 이름 목록 (삼국지 장수 이름)
const AI_NAMES = [
  '조조 (AI)',
  '유비 (AI)',
  '손권 (AI)',
  '여포 (AI)',
  '관우 (AI)',
  '장비 (AI)',
  '제갈량 (AI)',
  '사마의 (AI)',
];

export function getAIName(index: number): string {
  return AI_NAMES[index % AI_NAMES.length];
}

// AI 결정 로직
export class AIPlayer {
  private difficulty: AIDifficulty;

  constructor(difficulty: AIDifficulty = 'normal') {
    this.difficulty = difficulty;
  }

  // AI 턴 실행 (전체 턴을 처리하고 최종 상태 반환)
  executeFullTurn(state: GameState): GameState {
    const player = state.players[state.currentPlayerIndex];
    if (!player || !player.isAI) return state;

    let currentState = { ...state };

    // 1. 드로우 페이즈
    if (currentState.turnPhase === 'draw') {
      const territoryBonus = GameEngine.calculateTerritoryBonus(currentState, player.id);
      const drawCount = Math.max(1, 2 + territoryBonus.bonusDraw);
      currentState = GameEngine.drawCards(currentState, player.id, drawCount, {
        ensureNonGeneral: true,
      });
      currentState = GameEngine.nextPhase(currentState);
    }

    // 2. 액션 페이즈 - 행동력이 있는 동안 행동
    while (currentState.turnPhase === 'action' && (this.getPlayer(currentState)?.actions ?? 0) > 0) {
      const decision = this.decideAction(currentState);

      if (decision.action === 'endTurn') {
        break;
      }

      currentState = this.executeAction(currentState, decision);

      // 전투 중이면 즉시 해결
      if (currentState.combat) {
        currentState = this.handleCombat(currentState);
      }
    }

    // 3. 턴 종료
    if (currentState.turnPhase === 'action') {
      currentState = GameEngine.endTurn(currentState);
    }

    // 4. 버리기 페이즈 (손패 초과 시)
    while (currentState.turnPhase === 'discard') {
      const currentPlayer = this.getPlayer(currentState);
      if (currentPlayer && currentPlayer.hand.length > 7) {
        const cardToDiscard = this.selectCardToDiscard(currentPlayer);
        if (cardToDiscard) {
          currentState = GameEngine.discardCard(currentState, currentPlayer.id, cardToDiscard.instanceId);
        }
      } else {
        break;
      }
    }

    return currentState;
  }

  private getPlayer(state: GameState): Player | undefined {
    return state.players[state.currentPlayerIndex];
  }

  // AI 행동 결정
  private decideAction(state: GameState): AIDecision {
    const player = this.getPlayer(state);
    if (!player) return { action: 'endTurn' };

    const attackableIds = GameEngine.getAttackableTerritoriesIds(state, player.id);
    const generals = player.hand.filter((c) => c.type === 'general') as (CardInHand & GeneralCard)[];
    const strategies = player.hand.filter((c) => c.type === 'strategy') as (CardInHand & StrategyCard)[];

    // 난이도별 공격 확률
    const attackChance = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'normal' ? 0.5 : 0.7;

    // 1. 공격 가능하고 무장 카드가 있으면 공격 시도
    if (attackableIds.length > 0 && generals.length > 0 && Math.random() < attackChance) {
      const target = this.selectAttackTarget(state, attackableIds);
      const attackCards = this.selectAttackCards(state, generals, strategies);

      if (target && attackCards.length > 0) {
        // 책사 카드 확인
        const tacticians = player.hand.filter((c) => c.type === 'tactician');
        const tactician = tacticians.length > 0 ? tacticians[0] : null;

        return {
          action: 'attack',
          targetTerritoryId: target,
          cardIds: tactician
            ? [...attackCards.map(c => c.instanceId), tactician.instanceId]
            : attackCards.map(c => c.instanceId),
          tacticianTargetId: tactician ? attackCards[0].instanceId : null,
        };
      }
    }

    // 2. 자기 영토에 무장 배치
    if (generals.length > 0 && player.territories.length > 0) {
      const deployChance = this.difficulty === 'easy' ? 0.2 : this.difficulty === 'normal' ? 0.4 : 0.6;

      if (Math.random() < deployChance) {
        // 가장 약한 영토에 배치 (적과 인접한 곳 우선)
        const targetTerritory = this.selectDeployTarget(state);
        if (targetTerritory) {
          return {
            action: 'deploy',
            cardIds: [generals[0].instanceId],
            targetTerritoryId: targetTerritory,
          };
        }
      }
    }

    // 3. 턴 종료
    return { action: 'endTurn' };
  }

  // 공격 대상 선택
  private selectAttackTarget(state: GameState, attackableIds: string[]): string | null {
    if (attackableIds.length === 0) return null;

    const player = this.getPlayer(state);
    if (!player) return null;

    // 난이도에 따른 선택 전략
    if (this.difficulty === 'easy') {
      // 쉬움: 랜덤 선택
      return attackableIds[Math.floor(Math.random() * attackableIds.length)];
    }

    // 보통/어려움: 전략적 선택
    const territories = state.territories.filter((t) => attackableIds.includes(t.id));

    // 점수 계산: 가치 높고, 방어력 낮고, 수비병 적은 곳
    const scored = territories.map((t) => {
      let score = t.value * 2; // 가치
      score -= t.defenseBonus; // 방어 보너스 페널티
      score -= t.garrison.length * 3; // 수비병 페널티

      // 주인 없는 영토 보너스
      if (!t.owner) score += 5;

      // 어려움 모드: 전략적 위치 보너스
      if (this.difficulty === 'hard') {
        // 인접 영토가 많은 곳 보너스
        score += t.adjacentTo.length;
      }

      return { id: t.id, score };
    });

    // 최고 점수 영토 선택
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.id || null;
  }

  // 공격 카드 선택
  private selectAttackCards(
    state: GameState,
    generals: (CardInHand & GeneralCard)[],
    strategies: (CardInHand & StrategyCard)[]
  ): CardInHand[] {
    const selected: CardInHand[] = [];

    // 공격력 순으로 정렬
    const sortedGenerals = [...generals].sort((a, b) => b.attack - a.attack);

    // 난이도에 따른 카드 수
    const maxCards = this.difficulty === 'easy' ? 1 : this.difficulty === 'normal' ? 2 : 3;

    // 무장 카드 선택
    for (let i = 0; i < Math.min(maxCards, sortedGenerals.length); i++) {
      selected.push(sortedGenerals[i]);
    }

    // 어려움 모드: 전략 카드도 추가
    if (this.difficulty === 'hard' && strategies.length > 0) {
      // 공격용 전략 카드 (SIEGE, AMBUSH)
      const attackStrategies = strategies.filter(
        (s) => s.effect === 'SIEGE' || s.effect === 'AMBUSH'
      );
      if (attackStrategies.length > 0) {
        selected.push(attackStrategies[0]);
      }
    }

    return selected;
  }

  // 배치 대상 영토 선택
  private selectDeployTarget(state: GameState): string | null {
    const player = this.getPlayer(state);
    if (!player) return null;

    const territories = state.territories.filter((t) => t.owner === player.id);
    if (territories.length === 0) return null;

    // 적과 인접한 영토 중 수비병이 가장 적은 곳
    const frontline = territories.filter((t) =>
      t.adjacentTo.some((adjId) => {
        const adj = state.territories.find((at) => at.id === adjId);
        return adj && adj.owner !== player.id;
      })
    );

    const target = frontline.length > 0 ? frontline : territories;
    target.sort((a, b) => a.garrison.length - b.garrison.length);

    return target[0]?.id || null;
  }

  // 버릴 카드 선택
  private selectCardToDiscard(player: Player): CardInHand | null {
    if (player.hand.length === 0) return null;

    // 가치가 낮은 카드 우선 버리기
    const sorted = [...player.hand].sort((a, b) => {
      // 이벤트 < 자원 < 전략 < 책사 < 무장 순으로 가치
      const typeValue: Record<string, number> = {
        event: 1,
        resource: 2,
        strategy: 3,
        tactician: 4,
        general: 5,
      };
      return (typeValue[a.type] || 0) - (typeValue[b.type] || 0);
    });

    return sorted[0];
  }

  // 행동 실행
  private executeAction(state: GameState, decision: AIDecision): GameState {
    const player = this.getPlayer(state);
    if (!player) return state;

    switch (decision.action) {
      case 'attack':
        if (decision.targetTerritoryId && decision.cardIds) {
          return GameEngine.startAttack(
            state,
            player.id,
            decision.targetTerritoryId,
            decision.cardIds,
            decision.tacticianTargetId || null
          );
        }
        break;

      case 'deploy':
        if (decision.cardIds?.[0] && decision.targetTerritoryId) {
          return GameEngine.deployGeneral(
            state,
            player.id,
            decision.cardIds[0],
            decision.targetTerritoryId
          );
        }
        break;
    }

    return state;
  }

  // 전투 처리 (AI가 방어자일 때)
  private handleCombat(state: GameState): GameState {
    const combat = state.combat;
    if (!combat) return state;

    // 방어 단계에서 AI가 방어자인 경우
    if (combat.phase === 'defending') {
      const defender = state.players.find((p) => p.id === combat.defenderId);
      if (defender?.isAI) {
        const defenseCards = this.selectDefenseCards(state, defender);
        if (defenseCards.length > 0) {
          return GameEngine.defend(
            state,
            defenseCards.map((c) => c.instanceId)
          );
        } else {
          return GameEngine.skipDefense(state);
        }
      }
    }

    return state;
  }

  // 방어 카드 선택
  private selectDefenseCards(state: GameState, defender: Player): CardInHand[] {
    const combat = state.combat;
    if (!combat) return [];

    const generals = defender.hand.filter((c) => c.type === 'general') as (CardInHand & GeneralCard)[];
    const strategies = defender.hand.filter((c) => c.type === 'strategy') as (CardInHand & StrategyCard)[];

    // 공격력 계산
    let attackPower = 0;
    for (const card of combat.attackCards) {
      if (card.type === 'general') {
        attackPower += (card as GeneralCard).attack;
      }
    }

    // 난이도에 따른 방어 전략
    const defenseChance = this.difficulty === 'easy' ? 0.3 : this.difficulty === 'normal' ? 0.5 : 0.8;

    if (Math.random() > defenseChance) {
      return []; // 방어 안 함
    }

    const selected: CardInHand[] = [];
    let defensePower = 0;

    // 방어력 순으로 정렬
    const sortedGenerals = [...generals].sort((a, b) => b.defense - a.defense);

    for (const general of sortedGenerals) {
      if (defensePower >= attackPower) break; // 충분한 방어력 확보
      selected.push(general);
      defensePower += general.defense;
    }

    // 방어용 전략 카드 추가 (REINFORCE)
    if (this.difficulty !== 'easy') {
      const reinforceCards = strategies.filter((s) => s.effect === 'REINFORCE');
      if (reinforceCards.length > 0 && defensePower < attackPower) {
        selected.push(reinforceCards[0]);
      }
    }

    return selected;
  }
}

// 싱글톤 AI 인스턴스
const aiInstances: Map<AIDifficulty, AIPlayer> = new Map();

export function getAI(difficulty: AIDifficulty = 'normal'): AIPlayer {
  if (!aiInstances.has(difficulty)) {
    aiInstances.set(difficulty, new AIPlayer(difficulty));
  }
  return aiInstances.get(difficulty)!;
}
