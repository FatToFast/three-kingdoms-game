// 게임 엔진 핵심 로직

import type { Card, CardInHand, GeneralCard } from '@/types/card';
import type { GameState, CombatResult, GameLogEntry, TurnPhase } from '@/types/game';
import type { Player, ACTIONS_PER_TURN, INITIAL_HAND_SIZE, MAX_HAND_SIZE } from '@/types/player';
import type { Territory } from '@/types/territory';
import { createDeck, shuffleDeck, drawCards } from '@/data/cards';
import {
  initialTerritories,
  VICTORY_TERRITORIES_46,
  VICTORY_VALUE_46,
  STARTING_POSITIONS,
  TERRITORY_DRAW_BONUS_THRESHOLD,
  TERRITORY_ACTION_BONUS_THRESHOLD,
  REGION_TERRITORIES,
  REGION_DOMINATION_BONUS,
  FRAGMENTATION_PENALTY,
  type Region,
} from '@/data/territories';
import { nanoid } from 'nanoid';

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];

export class GameEngine {
  // 게임 초기화
  static initializeGame(playerNames: string[]): GameState {
    if (playerNames.length < 2 || playerNames.length > 4) {
      throw new Error('플레이어는 2-4명이어야 합니다.');
    }

    // 덱 생성 및 셔플
    const deck = shuffleDeck(createDeck());

    // 영토 초기화
    const territories: Territory[] = initialTerritories.map((t) => ({
      ...t,
      owner: null,
      garrison: [],
    }));

    // 플레이어 생성 및 초기 카드 배분
    const players: Player[] = playerNames.map((name, index) => {
      const { drawn, remaining } = drawCards(deck, 5);
      deck.splice(0, deck.length, ...remaining);

      return {
        id: `player-${index}`,
        name,
        color: PLAYER_COLORS[index],
        hand: drawn,
        territories: [],
        actions: 3,
        isActive: index === 0,
        isEliminated: false,
        alliances: [],
        resources: 0,
      };
    });

    // 초기 영토 배분 (전략적 시작 위치 - 플레이어 간 최대 거리)
    const startingPositions = STARTING_POSITIONS[playerNames.length];

    // 시작 위치 순서 랜덤화 (공정성)
    const shuffledPositions = [...startingPositions].sort(() => Math.random() - 0.5);

    players.forEach((player, index) => {
      const territoryId = shuffledPositions[index];
      const territory = territories.find((t) => t.id === territoryId);
      if (territory) {
        territory.owner = player.id;
        player.territories.push(territoryId);
      }
    });

    const gameState: GameState = {
      id: nanoid(),
      phase: 'playing',
      currentTurn: 1,
      currentPlayerIndex: 0,
      turnPhase: 'draw',
      players,
      territories,
      deck,
      discardPile: [],
      activeEvents: [],
      combat: null,
      winner: null,
      log: [],
    };

    // 게임 시작 로그
    GameEngine.addLog(gameState, 'system', '게임이 시작되었습니다!');

    return gameState;
  }

  // 카드 뽑기
  static drawCards(
    state: GameState,
    playerId: string,
    count: number = 2,
    options?: { ensureNonGeneral?: boolean }
  ): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const actualCount = Math.min(count, state.deck.length);
    const { drawn, remaining } = drawCards(state.deck, actualCount);

    let nextDeck = remaining;

    // 덱이 비면 버린 카드 더미 셔플해서 재사용
    if (nextDeck.length === 0 && state.discardPile.length > 0) {
      nextDeck = shuffleDeck(
        state.discardPile.map((card) => ({ ...card, instanceId: nanoid() }))
      ) as CardInHand[];
      state.discardPile = [];
      GameEngine.addLog(state, 'system', '덱을 다시 섞었습니다.');
    }

    if (options?.ensureNonGeneral && drawn.length > 0) {
      const hasNonGeneral = drawn.some((card) => card.type !== 'general');
      if (!hasNonGeneral) {
        const replacementIndex = nextDeck.findIndex((card) => card.type !== 'general');
        if (replacementIndex !== -1) {
          const [replacement] = nextDeck.splice(replacementIndex, 1);
          const replaced = drawn.pop();
          if (replaced) {
            drawn.push(replacement);
            nextDeck.push(replaced);
          } else {
            nextDeck.unshift(replacement);
          }
        }
      }
    }

    player.hand.push(...drawn);
    state.deck = nextDeck;

    GameEngine.addLog(state, playerId, `카드 ${actualCount}장을 뽑았습니다.`);

    return state;
  }

  // 턴 페이즈 전환
  static nextPhase(state: GameState): GameState {
    const phases: TurnPhase[] = ['draw', 'action', 'discard'];
    const currentIndex = phases.indexOf(state.turnPhase);

    if (currentIndex < phases.length - 1) {
      state.turnPhase = phases[currentIndex + 1];
    }

    return state;
  }

  // 턴 종료
  static endTurn(state: GameState): GameState {
    const currentPlayer = state.players[state.currentPlayerIndex];

    // 손패 초과 시 버리기 필요
    if (currentPlayer.hand.length > 7) {
      state.turnPhase = 'discard';
      return state;
    }

    // 다음 플레이어로
    let nextIndex = state.currentPlayerIndex;
    do {
      nextIndex = (nextIndex + 1) % state.players.length;
    } while (state.players[nextIndex].isEliminated && nextIndex !== state.currentPlayerIndex);

    // 모든 플레이어가 탈락하면 게임 종료
    if (nextIndex === state.currentPlayerIndex && currentPlayer.isEliminated) {
      state.phase = 'finished';
      return state;
    }

    // 턴 넘기기
    state.players[state.currentPlayerIndex].isActive = false;
    state.currentPlayerIndex = nextIndex;
    state.players[nextIndex].isActive = true;

    // 영토 보너스 계산
    const nextPlayer = state.players[nextIndex];
    const territoryBonus = GameEngine.calculateTerritoryBonus(state, nextPlayer.id);

    // 기본 행동력 3 + 영토 보너스
    nextPlayer.actions = 3 + territoryBonus.bonusActions;

    // 한 바퀴 돌면 턴 수 증가
    if (nextIndex === 0) {
      state.currentTurn++;
    }

    state.turnPhase = 'draw';

    // 보너스/페널티 로그 출력
    if (territoryBonus.bonusActions !== 0 || territoryBonus.bonusDraw !== 0) {
      const bonusMessages: string[] = [];
      if (territoryBonus.bonusDraw > 0) bonusMessages.push(`카드 +${territoryBonus.bonusDraw}`);
      if (territoryBonus.bonusDraw < 0) bonusMessages.push(`카드 ${territoryBonus.bonusDraw}`);
      if (territoryBonus.bonusActions > 0) bonusMessages.push(`행동력 +${territoryBonus.bonusActions}`);
      if (territoryBonus.bonusActions < 0) bonusMessages.push(`행동력 ${territoryBonus.bonusActions}`);

      if (territoryBonus.fragmentationGroups >= 2) {
        GameEngine.addLog(state, nextPlayer.id, `⚠️ 영토 분산 (${territoryBonus.fragmentationGroups}개 그룹): ${bonusMessages.join(', ')}`);
      } else {
        GameEngine.addLog(state, nextPlayer.id, `🏰 영토 보너스: ${bonusMessages.join(', ')}`);
      }
    }

    GameEngine.addLog(state, nextPlayer.id, '턴이 시작되었습니다.');

    // 승리 조건 체크
    const winner = GameEngine.checkVictory(state);
    if (winner) {
      state.winner = winner;
      state.phase = 'finished';
      GameEngine.addLog(state, winner, '🎉 승리!');
    }

    return state;
  }

  // 공격 시작
  static startAttack(
    state: GameState,
    attackerId: string,
    targetTerritoryId: string,
    cardInstanceIds: string[],
    tacticianTargetInstanceId: string | null = null
  ): GameState {
    const attacker = state.players.find((p) => p.id === attackerId);
    const targetTerritory = state.territories.find((t) => t.id === targetTerritoryId);

    if (!attacker || !targetTerritory) return state;

    // 인접 영토 확인
    const hasAdjacentTerritory = attacker.territories.some((tId) => {
      const t = state.territories.find((ter) => ter.id === tId);
      return t?.adjacentTo.includes(targetTerritoryId);
    });

    if (!hasAdjacentTerritory) {
      GameEngine.addLog(state, attackerId, '인접하지 않은 영토는 공격할 수 없습니다.');
      return state;
    }

    const selectedCards = attacker.hand.filter((c) => cardInstanceIds.includes(c.instanceId));
    const attackCards = selectedCards.filter((c) => c.type !== 'tactician');
    const tacticianCards = selectedCards.filter((c) => c.type === 'tactician');
    const tacticianCard = tacticianCards[0] ?? null;

    if (attackCards.length === 0) {
      GameEngine.addLog(state, attackerId, '공격할 카드를 선택해주세요.');
      return state;
    }

    if (tacticianCards.length > 1) {
      GameEngine.addLog(state, attackerId, '책사 카드는 1장만 사용할 수 있습니다.');
      return state;
    }

    if (
      tacticianCard &&
      (!tacticianTargetInstanceId ||
        !attackCards.some((card) => card.instanceId === tacticianTargetInstanceId))
    ) {
      GameEngine.addLog(state, attackerId, '책사로 강화할 공격 카드를 선택해주세요.');
      return state;
    }

    // 손패에서 카드 제거
    attacker.hand = attacker.hand.filter((c) => !cardInstanceIds.includes(c.instanceId));

    state.combat = {
      attackerId,
      defenderId: targetTerritory.owner || '',
      targetTerritoryId,
      attackCards,
      defenseCards: [],
      tacticianCard,
      tacticianTargetInstanceId: tacticianCard ? tacticianTargetInstanceId : null,
      phase: targetTerritory.owner ? 'defending' : 'resolving',
    };

    attacker.actions--;

    GameEngine.addLog(
      state,
      attackerId,
      `${targetTerritory.nameKo}을(를) 공격합니다!`
    );

    if (tacticianCard) {
      GameEngine.addLog(
        state,
        attackerId,
        `책사 ${tacticianCard.nameKo}로 공격을 강화합니다.`
      );
    }

    // 주인 없는 영토는 바로 점령
    if (!targetTerritory.owner) {
      return GameEngine.resolveCombat(state);
    }

    return state;
  }

  // 방어
  static defend(state: GameState, cardInstanceIds: string[]): GameState {
    const combat = state.combat;
    if (!combat) return state;

    const defender = state.players.find((p) => p.id === combat.defenderId);
    if (!defender) return state;

    const defenseCards = defender.hand.filter((c) => cardInstanceIds.includes(c.instanceId));
    defender.hand = defender.hand.filter((c) => !cardInstanceIds.includes(c.instanceId));

    combat.defenseCards = defenseCards;
    combat.phase = 'resolving';

    return GameEngine.resolveCombat(state);
  }

  // 방어 스킵
  static skipDefense(state: GameState): GameState {
    if (!state.combat) return state;

    state.combat.defenseCards = [];
    state.combat.phase = 'resolving';

    return GameEngine.resolveCombat(state);
  }

  // 전투 해결
  static resolveCombat(state: GameState): GameState {
    if (!state.combat) return state;

    const {
      attackerId,
      targetTerritoryId,
      attackCards,
      defenseCards,
      tacticianCard,
      tacticianTargetInstanceId,
    } = state.combat;
    const territory = state.territories.find((t) => t.id === targetTerritoryId);

    if (!territory) return state;

    // 공격력 계산
    let attackPower = attackCards.reduce((sum, card) => {
      if (card.type === 'general') return sum + card.attack;
      if (card.type === 'strategy' && card.effect === 'SIEGE') return sum + card.value;
      if (card.type === 'strategy' && card.effect === 'AMBUSH') return sum + card.value;
      return sum;
    }, 0);

    const tacticianBonus =
      tacticianCard?.type === 'tactician' &&
      tacticianTargetInstanceId &&
      attackCards.some((card) => card.instanceId === tacticianTargetInstanceId)
        ? tacticianCard.tactics
        : 0;

    attackPower += tacticianBonus;

    // 방어력 계산 (지형 보너스 포함)
    let defensePower = territory.defenseBonus;

    // 배치된 무장 방어력
    defensePower += territory.garrison.reduce((sum, g) => sum + g.defense, 0);

    // 방어 카드 방어력
    defensePower += defenseCards.reduce((sum, card) => {
      if (card.type === 'general') return sum + card.defense;
      if (card.type === 'strategy' && card.effect === 'REINFORCE') return sum + card.value;
      return sum;
    }, 0);

    // 화공 효과 적용
    const burnEffect = attackCards
      .filter((c) => c.type === 'strategy' && c.effect === 'BURN')
      .reduce((sum, c) => sum + (c as any).value, 0);
    defensePower = Math.max(0, defensePower - burnEffect);

    const attackerWins = attackPower > defensePower;

    state.combat.result = {
      attackPower,
      defensePower,
      winner: attackerWins ? 'attacker' : 'defender',
      difference: Math.abs(attackPower - defensePower),
    };

    state.combat.phase = 'resolved';

    // 결과 처리
    if (attackerWins) {
      // 영토 점령
      const previousOwner = territory.owner;
      const attacker = state.players.find((p) => p.id === attackerId);

      if (previousOwner) {
        const defender = state.players.find((p) => p.id === previousOwner);
        if (defender) {
          defender.territories = defender.territories.filter((id) => id !== targetTerritoryId);

          // 탈락 체크
          if (defender.territories.length === 0) {
            defender.isEliminated = true;
            GameEngine.addLog(state, previousOwner, '모든 영토를 잃고 탈락했습니다.');
          }
        }
      }

      territory.owner = attackerId;
      territory.garrison = [];
      attacker?.territories.push(targetTerritoryId);

      GameEngine.addLog(
        state,
        attackerId,
        `⚔️ ${territory.nameKo} 점령 성공! (${attackPower} vs ${defensePower})`
      );
    } else {
      GameEngine.addLog(
        state,
        attackerId,
        `🛡️ 공격 실패... (${attackPower} vs ${defensePower})`
      );
    }

    // 사용한 카드 버린 카드 더미로
    state.discardPile.push(...attackCards, ...defenseCards);
    if (tacticianCard) {
      state.discardPile.push(tacticianCard);
    }

    return state;
  }

  // 전투 종료
  static clearCombat(state: GameState): GameState {
    state.combat = null;
    return state;
  }

  // 무장 배치
  static deployGeneral(
    state: GameState,
    playerId: string,
    cardInstanceId: string,
    territoryId: string
  ): GameState {
    const player = state.players.find((p) => p.id === playerId);
    const territory = state.territories.find((t) => t.id === territoryId);
    const cardIndex = player?.hand.findIndex((c) => c.instanceId === cardInstanceId);

    if (!player || !territory || cardIndex === undefined || cardIndex === -1) return state;
    if (territory.owner !== playerId) {
      GameEngine.addLog(state, playerId, '자신의 영토에만 무장을 배치할 수 있습니다.');
      return state;
    }

    const card = player.hand[cardIndex];
    if (card.type !== 'general') {
      GameEngine.addLog(state, playerId, '무장 카드만 배치할 수 있습니다.');
      return state;
    }

    player.hand.splice(cardIndex, 1);
    territory.garrison.push(card as GeneralCard);
    player.actions--;

    GameEngine.addLog(
      state,
      playerId,
      `${card.nameKo}을(를) ${territory.nameKo}에 배치했습니다.`
    );

    return state;
  }

  // 카드 버리기
  static discardCard(state: GameState, playerId: string, cardInstanceId: string): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return state;

    const [card] = player.hand.splice(cardIndex, 1);
    state.discardPile.push(card);

    return state;
  }

  // 전략/자원 카드 사용
  static playCard(state: GameState, playerId: string, cardInstanceId: string, targetId?: string): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return state;

    const card = player.hand[cardIndex];

    // 자원 카드 처리
    if (card.type === 'resource') {
      player.resources += card.value;

      // 보너스 효과 처리
      if (card.bonusEffect === 'DRAW_1') {
        GameEngine.drawCards(state, playerId, 1);
      }

      player.hand.splice(cardIndex, 1);
      state.discardPile.push(card);
      if (card.cost > 0) player.actions--;

      GameEngine.addLog(state, playerId, `${card.nameKo} 사용! 병력 +${card.value}`);
    }

    // 이벤트 카드 처리
    if (card.type === 'event') {
      if (card.globalEffect) {
        state.activeEvents.push(card);
      }

      // 카드 드로우 이벤트
      if (card.eventType === 'fortune' && card.nameKo === '천운') {
        GameEngine.drawCards(state, playerId, 3);
      }

      player.hand.splice(cardIndex, 1);
      state.discardPile.push(card);

      GameEngine.addLog(state, playerId, `${card.nameKo} 발동!`);
    }

    return state;
  }

  // 공격 가능한 영토 목록
  static getAttackableTerritoriesIds(state: GameState, playerId: string): string[] {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];

    const attackable = new Set<string>();

    player.territories.forEach((tId) => {
      const territory = state.territories.find((t) => t.id === tId);
      territory?.adjacentTo.forEach((adjId) => {
        const adjTerritory = state.territories.find((t) => t.id === adjId);
        if (adjTerritory && adjTerritory.owner !== playerId) {
          attackable.add(adjId);
        }
      });
    });

    return Array.from(attackable);
  }

  // 승리 조건 체크 (46개 도시 기준)
  // 승리 조건: 18개 이상 영토 또는 총 가치 30 이상 또는 혼자 남은 경우
  static checkVictory(state: GameState): string | null {
    const VICTORY_TERRITORIES = VICTORY_TERRITORIES_46;
    const VICTORY_VALUE = VICTORY_VALUE_46;

    for (const player of state.players) {
      if (player.isEliminated) continue;

      const ownedTerritories = state.territories.filter((t) => t.owner === player.id);
      const totalValue = ownedTerritories.reduce((sum, t) => sum + t.value, 0);

      // 18개 이상 영토 또는 총 가치 30 이상
      if (ownedTerritories.length >= VICTORY_TERRITORIES || totalValue >= VICTORY_VALUE) {
        return player.id;
      }
    }

    // 혼자 남은 경우
    const activePlayers = state.players.filter((p) => !p.isEliminated);
    if (activePlayers.length === 1) {
      return activePlayers[0].id;
    }

    return null;
  }

  // 로그 추가
  static addLog(state: GameState, playerId: string, action: string): void {
    state.log.push({
      id: nanoid(),
      turn: state.currentTurn,
      playerId,
      action,
      details: '',
      timestamp: new Date(),
    });
  }

  // 영토 보너스 계산
  static calculateTerritoryBonus(
    state: GameState,
    playerId: string
  ): { bonusDraw: number; bonusActions: number; dominatedRegions: Region[]; fragmentationGroups: number } {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { bonusDraw: 0, bonusActions: 0, dominatedRegions: [], fragmentationGroups: 0 };

    const territoryCount = player.territories.length;
    let bonusDraw = 0;
    let bonusActions = 0;
    const dominatedRegions: Region[] = [];

    // 영토 수 기반 보너스 (5개마다 카드 +1, 10개마다 행동력 +1)
    bonusDraw += Math.floor(territoryCount / TERRITORY_DRAW_BONUS_THRESHOLD);
    bonusActions += Math.floor(territoryCount / TERRITORY_ACTION_BONUS_THRESHOLD);

    // 지역 지배 보너스 체크
    const regions = Object.keys(REGION_TERRITORIES) as Region[];
    for (const region of regions) {
      const regionTerritories = REGION_TERRITORIES[region];
      const ownsAll = regionTerritories.every((tId) => player.territories.includes(tId));

      if (ownsAll) {
        dominatedRegions.push(region);
        const bonus = REGION_DOMINATION_BONUS[region];
        bonusDraw += bonus.draw;
        bonusActions += bonus.action;
      }
    }

    // 영토 분산 페널티 계산
    const fragmentationGroups = GameEngine.countConnectedTerritoryGroups(state, playerId);
    if (fragmentationGroups >= 3) {
      const penalty = FRAGMENTATION_PENALTY[3];
      bonusDraw += penalty.draw;
      bonusActions += penalty.action;
    } else if (fragmentationGroups === 2) {
      const penalty = FRAGMENTATION_PENALTY[2];
      bonusDraw += penalty.draw;
      bonusActions += penalty.action;
    }

    // 최소값 0 보장 (음수 방지)
    bonusDraw = Math.max(bonusDraw, -1); // 최대 1장 페널티
    bonusActions = Math.max(bonusActions, -1); // 최대 1 행동력 페널티

    return { bonusDraw, bonusActions, dominatedRegions, fragmentationGroups };
  }

  // 연결된 영토 그룹 수 계산 (BFS/DFS)
  static countConnectedTerritoryGroups(state: GameState, playerId: string): number {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.territories.length <= 1) return player?.territories.length || 0;

    const ownedSet = new Set(player.territories);
    const visited = new Set<string>();
    let groupCount = 0;

    // BFS로 연결된 영토 탐색
    const bfs = (startId: string) => {
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const territory = state.territories.find((t) => t.id === currentId);

        if (territory) {
          for (const adjId of territory.adjacentTo) {
            // 인접 영토가 내 소유이고 아직 방문하지 않았으면 탐색
            if (ownedSet.has(adjId) && !visited.has(adjId)) {
              visited.add(adjId);
              queue.push(adjId);
            }
          }
        }
      }
    };

    // 모든 소유 영토에 대해 그룹 탐색
    for (const territoryId of player.territories) {
      if (!visited.has(territoryId)) {
        bfs(territoryId);
        groupCount++;
      }
    }

    return groupCount;
  }

  // 플레이어의 지배 지역 목록 가져오기
  static getDominatedRegions(state: GameState, playerId: string): Region[] {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];

    const dominatedRegions: Region[] = [];
    const regions = Object.keys(REGION_TERRITORIES) as Region[];

    for (const region of regions) {
      const regionTerritories = REGION_TERRITORIES[region];
      const ownsAll = regionTerritories.every((tId) => player.territories.includes(tId));
      if (ownsAll) {
        dominatedRegions.push(region);
      }
    }

    return dominatedRegions;
  }
}
