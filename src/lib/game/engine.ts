// 게임 엔진 핵심 로직

import type { Card, CardInHand } from '@/types/card';
import type { GameState, CombatResult, GameLogEntry, TurnPhase } from '@/types/game';
import { CARDS_PER_DRAW } from '@/types/game';
import type { Player } from '@/types/player';
import { ACTIONS_PER_TURN, INITIAL_HAND_SIZE } from '@/types/player';
import type { Territory, GarrisonCard } from '@/types/territory';
import { createDeck, shuffleDeck, shuffleInPlace, drawCards } from '@/data/cards';
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
import { MAX_HAND_SIZE } from '@/types/player';

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];

// 페이즈 순서 상수 (성능 최적화: 함수 호출마다 배열 생성 방지)
const TURN_PHASES: readonly TurnPhase[] = ['draw', 'action', 'discard'] as const;
const PHASE_INDEX_MAP: Record<TurnPhase, number> = { draw: 0, action: 1, discard: 2 };

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
      const { drawn, remaining } = drawCards(deck, INITIAL_HAND_SIZE);
      deck.splice(0, deck.length, ...remaining);

      return {
        id: `player-${index}`,
        name,
        color: PLAYER_COLORS[index],
        hand: drawn,
        territories: [],
        actions: ACTIONS_PER_TURN,
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
    count: number = CARDS_PER_DRAW,
    options?: { ensureNonGeneral?: boolean }
  ): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const drawn: CardInHand[] = [];
    let remaining = count;

    // 덱에서 뽑을 수 있는 만큼 뽑기
    if (state.deck.length > 0) {
      const fromDeck = Math.min(remaining, state.deck.length);
      const { drawn: drawnFromDeck, remaining: deckRemaining } = drawCards(state.deck, fromDeck);
      drawn.push(...drawnFromDeck);
      state.deck = deckRemaining;
      remaining -= fromDeck;
    }

    // 덱이 부족하면 버린 카드 더미 셔플해서 이어서 뽑기
    if (remaining > 0 && state.discardPile.length > 0) {
      // 새 인스턴스 ID 부여 후 in-place 셔플 (이중 복사 방지)
      const reshuffled = state.discardPile.map((card) => ({
        ...card,
        instanceId: nanoid(),
      })) as CardInHand[];
      shuffleInPlace(reshuffled);
      state.discardPile = [];
      state.deck = reshuffled;
      GameEngine.addLog(state, 'system', '덱을 다시 섞었습니다.');

      const fromReshuffled = Math.min(remaining, state.deck.length);
      const { drawn: drawnFromReshuffled, remaining: deckRemaining } = drawCards(state.deck, fromReshuffled);
      drawn.push(...drawnFromReshuffled);
      state.deck = deckRemaining;
    }

    if (options?.ensureNonGeneral && drawn.length > 0) {
      const hasNonGeneral = drawn.some((card) => card.type !== 'general');
      if (!hasNonGeneral) {
        const replacementIndex = state.deck.findIndex((card) => card.type !== 'general');
        if (replacementIndex !== -1) {
          const [replacement] = state.deck.splice(replacementIndex, 1);
          const replaced = drawn.pop();
          if (replaced) {
            drawn.push(replacement);
            state.deck.push(replaced);
          } else {
            state.deck.unshift(replacement);
          }
        }
      }
    }

    player.hand.push(...drawn);

    GameEngine.addLog(state, playerId, `카드 ${drawn.length}장을 뽑았습니다.`);

    return state;
  }

  // 턴 페이즈 전환 (성능 최적화: 상수 배열과 Map 사용)
  static nextPhase(state: GameState): GameState {
    const currentIndex = PHASE_INDEX_MAP[state.turnPhase];

    if (currentIndex < TURN_PHASES.length - 1) {
      state.turnPhase = TURN_PHASES[currentIndex + 1];
    }

    return state;
  }

  // 턴 종료 (action 또는 discard 페이즈에서만 호출 가능)
  static endTurn(state: GameState): GameState {
    // draw 페이즈에서는 턴 종료 불가
    if (state.turnPhase === 'draw') {
      GameEngine.addLog(state, state.players[state.currentPlayerIndex].id, '카드를 먼저 뽑아야 합니다.');
      return state;
    }

    const currentPlayer = state.players[state.currentPlayerIndex];

    // 손패 초과 시 버리기 필요 (MAX_HAND_SIZE 상수 사용)
    if (currentPlayer.hand.length > MAX_HAND_SIZE) {
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

    // 기본 행동력 + 영토 보너스
    nextPlayer.actions = ACTIONS_PER_TURN + territoryBonus.bonusActions;

    // 한 바퀴 돌면 턴 수 증가 (첫 번째 생존 플레이어로 돌아올 때)
    // 플레이어 0이 탈락해도 정상 작동하도록 첫 번째 생존자 기준으로 판단
    const firstAliveIndex = state.players.findIndex((p) => !p.isEliminated);
    if (nextIndex === firstAliveIndex && nextIndex <= state.currentPlayerIndex) {
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

  // 공격 시작 (action 페이즈에서만 가능, 진행 중인 전투 없어야 함)
  static startAttack(
    state: GameState,
    attackerId: string,
    targetTerritoryId: string,
    cardInstanceIds: string[],
    tacticianTargetInstanceId: string | null = null
  ): GameState {
    // action 페이즈에서만 공격 가능
    if (state.turnPhase !== 'action') {
      GameEngine.addLog(state, attackerId, 'action 페이즈에서만 공격할 수 있습니다.');
      return state;
    }

    // 진행 중인 전투가 있으면 새 공격 불가
    if (state.combat !== null) {
      GameEngine.addLog(state, attackerId, '진행 중인 전투를 먼저 완료해주세요.');
      return state;
    }

    const attacker = state.players.find((p) => p.id === attackerId);
    const targetTerritory = state.territories.find((t) => t.id === targetTerritoryId);

    if (!attacker || !targetTerritory) return state;

    // 행동력 체크
    if (attacker.actions <= 0) {
      GameEngine.addLog(state, attackerId, '행동력이 부족합니다.');
      return state;
    }

    // 자기 영토 공격 방지
    if (targetTerritory.owner === attackerId) {
      GameEngine.addLog(state, attackerId, '자신의 영토는 공격할 수 없습니다.');
      return state;
    }

    // 인접 영토 확인 (성능 최적화: Map 캐시 사용)
    const territoryMap = new Map(state.territories.map((t) => [t.id, t]));
    const hasAdjacentTerritory = attacker.territories.some((tId) => {
      const t = territoryMap.get(tId);
      return t?.adjacentTo.includes(targetTerritoryId);
    });

    if (!hasAdjacentTerritory) {
      GameEngine.addLog(state, attackerId, '인접하지 않은 영토는 공격할 수 없습니다.');
      return state;
    }

    // 성능 최적화: Set으로 카드 ID 관리
    const cardIdSet = new Set(cardInstanceIds);
    const selectedCards = attacker.hand.filter((c) => cardIdSet.has(c.instanceId));

    // 공격에 사용 가능한 카드 타입: general, strategy (공격용)
    const validAttackTypes = new Set(['general', 'strategy']);
    const attackCards = selectedCards.filter((c) => c.type !== 'tactician' && validAttackTypes.has(c.type));
    const tacticianCards = selectedCards.filter((c) => c.type === 'tactician');
    const tacticianCard = tacticianCards[0] ?? null;

    // 유효하지 않은 카드 타입 검증 (resource, event는 공격에 사용 불가)
    const invalidCards = selectedCards.filter((c) => c.type !== 'tactician' && !validAttackTypes.has(c.type));
    if (invalidCards.length > 0) {
      GameEngine.addLog(state, attackerId, '자원/이벤트 카드는 공격에 사용할 수 없습니다.');
      return state;
    }

    if (attackCards.length === 0) {
      GameEngine.addLog(state, attackerId, '공격할 카드를 선택해주세요.');
      return state;
    }

    // 책사 카드 1장 제한
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

    // 손패에서 카드 제거 (성능 최적화: Set 사용)
    attacker.hand = attacker.hand.filter((c) => !cardIdSet.has(c.instanceId));

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

    // 주인 없는 영토는 방어자 없이 바로 전투 해결 (지형 방어 보너스만 적용)
    if (!targetTerritory.owner) {
      return GameEngine.resolveCombat(state);
    }

    return state;
  }

  // 방어 (general/strategy 카드만 사용 가능)
  static defend(state: GameState, cardInstanceIds: string[]): GameState {
    const combat = state.combat;
    if (!combat) return state;

    // defending 페이즈에서만 방어 가능
    if (combat.phase !== 'defending') {
      return state;
    }

    const defender = state.players.find((p) => p.id === combat.defenderId);
    if (!defender) return state;

    // 성능 최적화: Set으로 카드 ID 관리
    const cardIdSet = new Set(cardInstanceIds);
    const selectedCards = defender.hand.filter((c) => cardIdSet.has(c.instanceId));

    // 방어에 사용 가능한 카드 타입: general, strategy (방어용)
    const validDefenseTypes = new Set(['general', 'strategy']);
    const defenseCards = selectedCards.filter((c) => validDefenseTypes.has(c.type));

    // 유효하지 않은 카드 타입 검증 (resource, event, tactician은 방어에 사용 불가)
    const invalidCards = selectedCards.filter((c) => !validDefenseTypes.has(c.type));
    if (invalidCards.length > 0) {
      GameEngine.addLog(state, combat.defenderId, '자원/이벤트/책사 카드는 방어에 사용할 수 없습니다.');
      return state;
    }

    // 손패에서 카드 제거 (성능 최적화: Set 사용)
    defender.hand = defender.hand.filter((c) => !cardIdSet.has(c.instanceId));

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

  // 전투 해결 (resolving 페이즈에서만 실행, 중복 호출 방지)
  static resolveCombat(state: GameState): GameState {
    if (!state.combat) return state;

    // 이미 resolved 상태면 중복 실행 방지
    if (state.combat.phase === 'resolved') {
      return state;
    }

    // resolving 페이즈에서만 실행 가능
    if (state.combat.phase !== 'resolving') {
      return state;
    }

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

    // 성능 최적화: 단일 루프로 공격력/화공 효과 계산
    let attackPower = 0;
    let burnEffect = 0;
    for (const card of attackCards) {
      if (card.type === 'general') {
        attackPower += card.attack;
      } else if (card.type === 'strategy') {
        if (card.effect === 'SIEGE' || card.effect === 'AMBUSH') {
          attackPower += card.value;
        } else if (card.effect === 'BURN') {
          burnEffect += card.value;
        }
      }
    }

    // 책사 보너스 적용
    const tacticianBonus =
      tacticianCard?.type === 'tactician' &&
      tacticianTargetInstanceId &&
      attackCards.some((card) => card.instanceId === tacticianTargetInstanceId)
        ? tacticianCard.tactics
        : 0;
    attackPower += tacticianBonus;

    // 방어력 계산: 지형 보너스 + 배치된 무장 + 방어 카드 (단일 루프)
    let defensePower = territory.defenseBonus;

    // 배치된 무장 방어력
    for (const g of territory.garrison) {
      defensePower += g.defense;
    }

    // 방어 카드 방어력 (단일 루프로 최적화)
    for (const card of defenseCards) {
      if (card.type === 'general') {
        defensePower += card.defense;
      } else if (card.type === 'strategy' && card.effect === 'REINFORCE') {
        defensePower += card.value;
      }
    }

    // 화공 효과 적용 (방어력 감소, 최소 0)
    defensePower = Math.max(0, defensePower - burnEffect);

    // 승패 판정: 공격력이 방어력보다 높아야 승리 (동점은 수비 승리)
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

      // 배치된 무장(garrison)을 버린 카드 더미로 이동 (카드 소멸 방지)
      if (territory.garrison.length > 0) {
        state.discardPile.push(...territory.garrison);
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

    // 행동력 체크
    if (player.actions <= 0) {
      GameEngine.addLog(state, playerId, '행동력이 부족합니다.');
      return state;
    }

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
    territory.garrison.push(card as GarrisonCard);
    player.actions--;

    GameEngine.addLog(
      state,
      playerId,
      `${card.nameKo}을(를) ${territory.nameKo}에 배치했습니다.`
    );

    return state;
  }

  // 카드 버리기 (discard 페이즈에서 손패 초과분 버리기)
  static discardCard(state: GameState, playerId: string, cardInstanceId: string): GameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return state;

    const [card] = player.hand.splice(cardIndex, 1);
    state.discardPile.push(card);

    // discard 페이즈에서 손패가 제한 이하가 되면 자동으로 턴 종료
    if (state.turnPhase === 'discard' && player.hand.length <= MAX_HAND_SIZE) {
      return GameEngine.endTurn(state);
    }

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

  // 공격 가능한 영토 목록 (최적화: Map 캐시 사용)
  static getAttackableTerritoriesIds(state: GameState, playerId: string): string[] {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];

    // 영토 Map 캐시 (find 반복 방지)
    const territoryMap = new Map(state.territories.map((t) => [t.id, t]));
    const ownedSet = new Set(player.territories);
    const attackable = new Set<string>();

    for (const tId of player.territories) {
      const territory = territoryMap.get(tId);
      if (territory) {
        for (const adjId of territory.adjacentTo) {
          // 자기 영토가 아니면 공격 가능
          if (!ownedSet.has(adjId)) {
            attackable.add(adjId);
          }
        }
      }
    }

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

  // 연결된 영토 그룹 수 계산 (BFS - 최적화된 버전)
  static countConnectedTerritoryGroups(state: GameState, playerId: string): number {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.territories.length <= 1) return player?.territories.length || 0;

    const ownedSet = new Set(player.territories);
    const visited = new Set<string>();
    let groupCount = 0;

    // 영토 Map 캐시 (find 반복 방지)
    const territoryMap = new Map(state.territories.map((t) => [t.id, t]));

    // BFS로 연결된 영토 탐색 (인덱스 포인터 사용으로 shift() O(n) 비용 제거)
    const bfs = (startId: string) => {
      const queue = [startId];
      let head = 0;
      visited.add(startId);

      while (head < queue.length) {
        const currentId = queue[head++];
        const territory = territoryMap.get(currentId);

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
