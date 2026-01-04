// 게임 엔진 핵심 로직

import type { Card, CardInHand } from '@/types/card';
import type { GameState, CombatResult, GameLogEntry, TurnPhase, GameOptions } from '@/types/game';
import { CARDS_PER_DRAW } from '@/types/game';
import type { Player } from '@/types/player';
import { ACTIONS_PER_TURN, INITIAL_HAND_SIZE, MAX_HAND_SIZE, SOFT_HAND_SIZE, createPlayerId } from '@/types/player';
import type { Territory, GarrisonCard } from '@/types/territory';
import { createDeck, shuffleDeck, shuffleInPlace, drawCards } from '@/data/cards';
import {
  initialTerritories,
  VICTORY_TERRITORIES_46,
  VICTORY_VALUE_46,
  VICTORY_CONFIRMATION_TURNS,
  STARTING_POSITIONS,
  TERRITORY_DRAW_BONUS_THRESHOLD,
  TERRITORY_ACTION_BONUS_THRESHOLD,
  BONUS_CAPS,
  REGION_BONUS_DIMINISHING_RATE,
  OVEREXPANSION,
  REGION_TERRITORIES,
  REGION_DOMINATION_BONUS,
  FRAGMENTATION_PENALTY,
  FRAGMENTATION_THRESHOLD,
  bidirectionalAdjacencyMap,
  type Region,
} from '@/data/territories';
import { nanoid } from 'nanoid';

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];

// 페이즈 순서 상수 (성능 최적화: 함수 호출마다 배열 생성 방지)
const TURN_PHASES: readonly TurnPhase[] = ['draw', 'action', 'discard'] as const;
const PHASE_INDEX_MAP: Record<TurnPhase, number> = { draw: 0, action: 1, discard: 2 };

export class GameEngine {
  // 게임 초기화
  static initializeGame(playerNames: string[], options?: GameOptions): GameState {
    if (playerNames.length < 2 || playerNames.length > 4) {
      throw new Error('플레이어는 2-4명이어야 합니다.');
    }

    // 덱 생성 및 셔플 (quantity 기반 카드 수 결정)
    // 참고: options.nonGeneralMultiplier는 현재 카드 데이터의 quantity 필드로 관리됨
    void options; // 향후 확장을 위해 매개변수 유지
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

      const player: Player = {
        id: createPlayerId(index),
        name,
        color: PLAYER_COLORS[index],
        hand: drawn,
        territories: [],
        actions: ACTIONS_PER_TURN,
        isActive: index === 0,
        isEliminated: false,
        alliances: [],
        resources: 0,
        nextTurnActionPenalty: 0,
      };
      return player;
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
      turnEffects: [],
      combat: null,
      winner: null,
      victoryCandidate: null,
      log: [],
      blockNeutralCapture: false,
      blockAllAttacks: false,
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
    if (state.turnPhase === TURN_PHASES[PHASE_INDEX_MAP.draw]) {
      GameEngine.addLog(state, state.players[state.currentPlayerIndex].id, '카드를 먼저 뽑아야 합니다.');
      return state;
    }

    const currentPlayer = state.players[state.currentPlayerIndex];

    // 손패 초과 시 버리기 필요 (MAX_HAND_SIZE 상수 사용)
    if (currentPlayer.hand.length > MAX_HAND_SIZE) {
      currentPlayer.nextTurnActionPenalty = Math.max(
        currentPlayer.nextTurnActionPenalty ?? 0,
        1
      );
      state.turnPhase = TURN_PHASES[PHASE_INDEX_MAP.discard];
      return state;
    }

    // 소프트 캡 초과 시 다음 턴 행동력 페널티 부여
    const softPenalty = currentPlayer.hand.length > SOFT_HAND_SIZE ? 1 : 0;
    currentPlayer.nextTurnActionPenalty = Math.max(
      currentPlayer.nextTurnActionPenalty ?? 0,
      softPenalty
    );

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

    // 이전 턴 손패 초과 페널티 적용
    const handPenalty = nextPlayer.nextTurnActionPenalty ?? 0;
    if (handPenalty > 0) {
      nextPlayer.actions = Math.max(0, nextPlayer.actions - handPenalty);
      nextPlayer.nextTurnActionPenalty = 0;
    }

    // 한 바퀴 돌면 턴 수 증가 (첫 번째 생존 플레이어로 돌아올 때)
    // 플레이어 0이 탈락해도 정상 작동하도록 첫 번째 생존자 기준으로 판단
    const firstAliveIndex = state.players.findIndex((p) => !p.isEliminated);
    if (nextIndex === firstAliveIndex && nextIndex <= state.currentPlayerIndex) {
      state.currentTurn++;
    }

    state.turnPhase = 'draw';

    // 턴 효과 초기화 (새 플레이어의 턴이 시작되므로 이전 효과 제거)
    state.turnEffects = state.turnEffects.filter((e) => e.playerId === nextPlayer.id);

    // activeEvents의 duration 감소 및 만료 처리
    GameEngine.processActiveEvents(state);

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

    if (handPenalty > 0) {
      GameEngine.addLog(state, nextPlayer.id, '손패 초과로 행동력 -1');
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
    if (state.turnPhase !== TURN_PHASES[PHASE_INDEX_MAP.action]) {
      GameEngine.addLog(state, attackerId, 'action 페이즈에서만 공격할 수 있습니다.');
      return state;
    }

    // 진행 중인 전투가 있으면 새 공격 불가
    if (state.combat !== null) {
      GameEngine.addLog(state, attackerId, '진행 중인 전투를 먼저 완료해주세요.');
      return state;
    }

    // 휴전 효과 체크 (BLOCK_ATTACK)
    if (state.blockAllAttacks) {
      GameEngine.addLog(state, attackerId, '휴전 중에는 공격할 수 없습니다.');
      return state;
    }

    const attacker = state.players.find((p) => p.id === attackerId);
    const targetTerritory = state.territories.find((t) => t.id === targetTerritoryId);

    if (!attacker || !targetTerritory) return state;

    // 황건적 효과 체크 (BLOCK_NEUTRAL) - 주인 없는 영토 공격 불가
    if (state.blockNeutralCapture && targetTerritory.owner === null) {
      GameEngine.addLog(state, attackerId, '황건적이 점령하여 주인 없는 영토를 공격할 수 없습니다.');
      return state;
    }

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

    // 턴 효과 보너스 적용 (자원 카드, 이벤트 카드 효과)
    const attackBonus = GameEngine.getAttackBonus(state, attackerId);
    attackPower += attackBonus;

    // 방어력 계산: 지형 보너스 + 배치된 무장 + 방어 카드 (단일 루프)
    let defensePower = territory.defenseBonus;

    // 턴 효과 방어 보너스 적용
    defensePower += GameEngine.getTerritoryDefenseBonus(state, targetTerritoryId);

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

    // 전투 후 즉시 승리 판정 (영토 점령/탈락 발생 시)
    return GameEngine.checkAndApplyVictory(state);
  }

  // 전투 종료
  static clearCombat(state: GameState): GameState {
    state.combat = null;
    return state;
  }

  // 무장 배치 (action 페이즈에서만 가능, 전투 중 불가)
  static deployGeneral(
    state: GameState,
    playerId: string,
    cardInstanceId: string,
    territoryId: string
  ): GameState {
    // 현재 턴 플레이어 검증 (엔진 레벨 보안)
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      GameEngine.addLog(state, playerId, '자신의 턴에만 무장을 배치할 수 있습니다.');
      return state;
    }

    // action 페이즈에서만 배치 가능
    if (state.turnPhase !== TURN_PHASES[PHASE_INDEX_MAP.action]) {
      GameEngine.addLog(state, playerId, 'action 페이즈에서만 무장을 배치할 수 있습니다.');
      return state;
    }

    // 진행 중인 전투가 있으면 배치 불가
    if (state.combat !== null) {
      GameEngine.addLog(state, playerId, '진행 중인 전투를 먼저 완료해주세요.');
      return state;
    }

    const player = state.players.find((p) => p.id === playerId);
    const territory = state.territories.find((t) => t.id === territoryId);
    const cardIndex = player?.hand.findIndex((c) => c.instanceId === cardInstanceId);

    if (!player || !territory || cardIndex === undefined || cardIndex === -1) return state;

    // 소유권 먼저 검증 (UX: 더 명확한 에러 메시지)
    if (territory.owner !== playerId) {
      GameEngine.addLog(state, playerId, '자신의 영토에만 무장을 배치할 수 있습니다.');
      return state;
    }

    const card = player.hand[cardIndex];
    if (card.type !== 'general') {
      GameEngine.addLog(state, playerId, '무장 카드만 배치할 수 있습니다.');
      return state;
    }

    // 카드 비용 기반 행동력 체크 (cost가 0이면 무료 배치, undefined/null이면 기본 1)
    const actionCost = card.cost ?? 1;
    if (player.actions < actionCost) {
      GameEngine.addLog(state, playerId, `행동력이 부족합니다. (필요: ${actionCost}, 보유: ${player.actions})`);
      return state;
    }

    player.hand.splice(cardIndex, 1);
    territory.garrison.push(card as GarrisonCard);
    player.actions -= actionCost;

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
    if (state.turnPhase === TURN_PHASES[PHASE_INDEX_MAP.discard] && player.hand.length <= MAX_HAND_SIZE) {
      return GameEngine.endTurn(state);
    }

    return state;
  }

  // 전략/자원/이벤트 카드 사용 (action 페이즈에서만 가능, 전투 중 불가)
  static playCard(state: GameState, playerId: string, cardInstanceId: string, targetId?: string): GameState {
    // 현재 턴 플레이어 검증
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      GameEngine.addLog(state, playerId, '자신의 턴에만 카드를 사용할 수 있습니다.');
      return state;
    }

    // action 페이즈에서만 카드 사용 가능
    if (state.turnPhase !== TURN_PHASES[PHASE_INDEX_MAP.action]) {
      GameEngine.addLog(state, playerId, 'action 페이즈에서만 카드를 사용할 수 있습니다.');
      return state;
    }

    // 진행 중인 전투가 있으면 카드 사용 불가
    if (state.combat !== null) {
      GameEngine.addLog(state, playerId, '진행 중인 전투를 먼저 완료해주세요.');
      return state;
    }

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return state;

    const card = player.hand[cardIndex];

    // 카드 비용 기반 행동력 체크 (cost가 0이면 무료 사용)
    const actionCost = card.cost;
    if (actionCost > 0 && player.actions < actionCost) {
      GameEngine.addLog(state, playerId, `행동력이 부족합니다. (필요: ${actionCost}, 보유: ${player.actions})`);
      return state;
    }

    // 자원 카드 처리
    if (card.type === 'resource') {
      player.resources += card.value;

      // 보너스 효과 처리 (타입 기반)
      if (card.bonusEffect === 'DRAW_1') {
        GameEngine.drawCards(state, playerId, 1);
      } else if (card.bonusEffect === 'ATTACK_BOOST') {
        // 이번 턴 공격력 +2
        state.turnEffects.push({
          type: 'ATTACK_BOOST',
          playerId,
          value: 2,
        });
        GameEngine.addLog(state, playerId, `${card.nameKo} 효과: 이번 턴 공격력 +2!`);
      } else if (card.bonusEffect === 'ATTACK_BOOST_SMALL') {
        // 이번 턴 공격력 +1
        state.turnEffects.push({
          type: 'ATTACK_BOOST_SMALL',
          playerId,
          value: 1,
        });
        GameEngine.addLog(state, playerId, `${card.nameKo} 효과: 이번 턴 공격력 +1!`);
      } else if (card.bonusEffect === 'TERRITORY_DEFENSE') {
        // 영토 방어 보너스 +2 (targetId가 있으면 해당 영토에, 없으면 첫 번째 소유 영토에)
        const targetTerritoryId = targetId || player.territories[0];
        if (targetTerritoryId) {
          state.turnEffects.push({
            type: 'TERRITORY_DEFENSE',
            playerId,
            value: 2,
            territoryId: targetTerritoryId,
          });
          const targetTerritory = state.territories.find((t) => t.id === targetTerritoryId);
          GameEngine.addLog(state, playerId, `${card.nameKo} 효과: ${targetTerritory?.nameKo || '영토'} 방어력 +2!`);
        }
      }

      player.hand.splice(cardIndex, 1);
      state.discardPile.push(card);
      if (actionCost > 0) player.actions -= actionCost;

      GameEngine.addLog(state, playerId, `${card.nameKo} 사용! 병력 +${card.value}`);
      return state;
    }

    // 이벤트 카드 처리
    if (card.type === 'event') {
      player.hand.splice(cardIndex, 1);

      // 글로벌 효과가 있는 이벤트는 activeEvents에 추가 (discardPile에는 추가하지 않음)
      if (card.globalEffect) {
        state.activeEvents.push(card);
      } else {
        // 글로벌 효과가 없는 이벤트는 바로 discardPile로
        state.discardPile.push(card);
      }

      // 이벤트 효과 처리 (타입 기반)
      if (card.effect === 'DRAW_3') {
        // 천운: 카드 3장 추가 뽑기
        GameEngine.drawCards(state, playerId, 3);
      } else if (card.effect === 'ATTACK_DEBUFF') {
        // 폭풍우: 모든 공격력 -2 (이벤트 duration 동안)
        // globalEffect=true인 경우 activeEvents에 추가되어 duration 동안 지속
        // 모든 플레이어에게 적용되는 글로벌 효과
        for (const p of state.players) {
          if (!p.isEliminated) {
            state.turnEffects.push({
              type: 'ATTACK_DEBUFF',
              playerId: p.id,
              value: 2,
            });
          }
        }
        GameEngine.addLog(state, playerId, '폭풍우로 인해 모든 공격력이 -2!');
      } else if (card.effect === 'DISCARD_ALL_1') {
        // 역병: 모든 플레이어 손패 1장 랜덤 버림
        for (const p of state.players) {
          if (!p.isEliminated && p.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * p.hand.length);
            const discardedCard = p.hand.splice(randomIndex, 1)[0];
            state.discardPile.push(discardedCard);
            GameEngine.addLog(state, p.id, `역병으로 ${discardedCard.nameKo}을(를) 잃었습니다.`);
          }
        }
      } else if (card.effect === 'BLOCK_NEUTRAL') {
        // 황건적: 주인 없는 영토 점령 불가 (이벤트 duration 동안)
        state.blockNeutralCapture = true;
        GameEngine.addLog(state, playerId, '황건적이 일어나 주인 없는 영토 점령이 불가능합니다!');
      } else if (card.effect === 'BLOCK_ATTACK') {
        // 휴전: 모든 공격 불가 (이벤트 duration 동안)
        state.blockAllAttacks = true;
        GameEngine.addLog(state, playerId, '휴전이 선포되어 모든 공격이 불가능합니다!');
      } else if (card.effect === 'ATTACK_BUFF') {
        // 청명: 내 공격력 +1 (이번 턴)
        state.turnEffects.push({
          type: 'ATTACK_BUFF',
          playerId,
          value: 1,
        });
        GameEngine.addLog(state, playerId, '청명한 날씨로 공격력 +1!');
      }

      if (actionCost > 0) player.actions -= actionCost;

      GameEngine.addLog(state, playerId, `${card.nameKo} 발동!`);
      return state;
    }

    // 지원하지 않는 카드 타입 (general, strategy, tactician은 playCard로 처리하지 않음)
    GameEngine.addLog(state, playerId, `${card.type} 타입 카드는 playCard로 사용할 수 없습니다.`);
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

  // 승리 조건 체크 (46개 도시 기준, 성능 최적화: 단일 순회)
  // 승리 조건: 18개 이상 영토 또는 총 가치 30 이상 또는 혼자 남은 경우
  // 동점 처리: 현재 턴 플레이어 우선, 그 다음 플레이어 순서대로
  static checkVictory(state: GameState): string | null {
    const VICTORY_TERRITORIES = VICTORY_TERRITORIES_46;
    const VICTORY_VALUE = VICTORY_VALUE_46;

    // 단일 순회로 플레이어별 영토 수/가치 합산 (성능 최적화: O(T) → O(P*T) 제거)
    const playerStats = new Map<string, { count: number; value: number }>();
    for (const player of state.players) {
      if (!player.isEliminated) {
        playerStats.set(player.id, { count: 0, value: 0 });
      }
    }

    for (const territory of state.territories) {
      if (territory.owner && playerStats.has(territory.owner)) {
        const stats = playerStats.get(territory.owner)!;
        stats.count++;
        stats.value += territory.value;
      }
    }

    // 승리 조건 충족 플레이어 수집
    const winners: string[] = [];
    for (const [playerId, stats] of playerStats) {
      if (stats.count >= VICTORY_TERRITORIES || stats.value >= VICTORY_VALUE) {
        winners.push(playerId);
      }
    }

    // 동점 처리: 현재 턴 플레이어 우선
    if (winners.length > 0) {
      const currentPlayerId = state.players[state.currentPlayerIndex]?.id;
      if (winners.includes(currentPlayerId)) {
        return currentPlayerId;
      }
      // 플레이어 순서대로 첫 번째 승리자 반환
      for (const player of state.players) {
        if (winners.includes(player.id)) {
          return player.id;
        }
      }
    }

    // 참고: 혼자 남은 경우는 checkAndApplyVictory에서 처리 (즉시 승리)
    return null;
  }

  // 승리 판정 및 게임 종료 처리 (1턴 유지 필요)
  // 전투/카드 사용 후 호출
  static checkAndApplyVictory(state: GameState): GameState {
    if (state.phase === 'finished') return state;

    // 혼자 남은 경우: 즉시 승리 (유지 필요 없음)
    const activePlayers = state.players.filter((p) => !p.isEliminated);
    if (activePlayers.length === 1) {
      state.winner = activePlayers[0].id;
      state.phase = 'finished';
      GameEngine.addLog(state, activePlayers[0].id, '🎉 최후의 생존자로 승리!');
      return state;
    }

    const winner = GameEngine.checkVictory(state);

    if (winner) {
      // 기존 승리 후보가 있는지 확인
      if (state.victoryCandidate) {
        // 동일 플레이어가 조건을 유지하고 있는지 확인
        if (state.victoryCandidate.playerId === winner) {
          // 필요한 턴 수만큼 유지했는지 확인
          const turnsHeld = state.currentTurn - state.victoryCandidate.turnAchieved;
          if (turnsHeld >= VICTORY_CONFIRMATION_TURNS) {
            // 승리 확정!
            state.winner = winner;
            state.phase = 'finished';
            GameEngine.addLog(state, winner, '🎉 승리 조건을 유지하여 승리 확정!');
            return state;
          }
          // 아직 유지 중 - 로그만 추가 (매 턴 반복 방지를 위해 턴이 바뀔 때만)
        } else {
          // 다른 플레이어가 조건 달성 - 후보 교체
          state.victoryCandidate = {
            playerId: winner,
            turnAchieved: state.currentTurn,
          };
          const player = state.players.find((p) => p.id === winner);
          GameEngine.addLog(
            state,
            winner,
            `⚠️ ${player?.name || winner}이(가) 승리 조건 달성! ${VICTORY_CONFIRMATION_TURNS}턴 유지 시 승리`
          );
        }
      } else {
        // 새로운 승리 후보 등록
        state.victoryCandidate = {
          playerId: winner,
          turnAchieved: state.currentTurn,
        };
        const player = state.players.find((p) => p.id === winner);
        GameEngine.addLog(
          state,
          winner,
          `⚠️ ${player?.name || winner}이(가) 승리 조건 달성! ${VICTORY_CONFIRMATION_TURNS}턴 유지 시 승리`
        );
      }
    } else {
      // 아무도 승리 조건 충족 안 함 - 후보 초기화
      if (state.victoryCandidate) {
        const prevPlayer = state.players.find((p) => p.id === state.victoryCandidate?.playerId);
        GameEngine.addLog(
          state,
          state.victoryCandidate.playerId,
          `📉 ${prevPlayer?.name || state.victoryCandidate.playerId}이(가) 승리 조건 상실`
        );
        state.victoryCandidate = null;
      }
    }

    return state;
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

    // player.territories와 territories.owner 일관성 검증 (개발 모드)
    if (process.env.NODE_ENV === 'development') {
      const playerTerritorySet = new Set(player.territories);
      const ownerTerritories = state.territories
        .filter((t) => t.owner === playerId)
        .map((t) => t.id);
      const ownerTerritorySet = new Set(ownerTerritories);

      const missingInPlayer = ownerTerritories.filter((id) => !playerTerritorySet.has(id));
      const missingInOwner = player.territories.filter((id) => !ownerTerritorySet.has(id));

      if (missingInPlayer.length > 0 || missingInOwner.length > 0) {
        console.warn('[영토 보너스] player.territories와 territories.owner 불일치 감지:', {
          playerId,
          missingInPlayer,
          missingInOwner,
        });
      }
    }

    const territoryCount = player.territories.length;
    let bonusDraw = 0;
    let bonusActions = 0;
    const dominatedRegions: Region[] = [];

    // 영토 수 기반 보너스 (5개마다 카드 +1, 10개마다 행동력 +1) - 상한 적용
    const rawDrawBonus = Math.floor(territoryCount / TERRITORY_DRAW_BONUS_THRESHOLD);
    const rawActionBonus = Math.floor(territoryCount / TERRITORY_ACTION_BONUS_THRESHOLD);
    bonusDraw += Math.min(rawDrawBonus, BONUS_CAPS.DRAW);
    bonusActions += Math.min(rawActionBonus, BONUS_CAPS.ACTION);

    // 지역 지배 보너스 체크 (첫 번째 100%, 이후 50% 체감)
    const regions = Object.keys(REGION_TERRITORIES) as Region[];
    for (const region of regions) {
      const regionTerritories = REGION_TERRITORIES[region];
      const ownsAll = regionTerritories.every((tId) => player.territories.includes(tId));

      if (ownsAll) {
        dominatedRegions.push(region);
        const bonus = REGION_DOMINATION_BONUS[region];
        // 첫 번째 지역: 100%, 이후 지역: 50% (체감)
        const multiplier = dominatedRegions.length === 1 ? 1 : REGION_BONUS_DIMINISHING_RATE;
        bonusDraw += Math.floor(bonus.draw * multiplier);
        bonusActions += Math.floor(bonus.action * multiplier);
      }
    }

    // 과확장 페널티 (영토 16개 이상)
    if (territoryCount >= OVEREXPANSION.THRESHOLD) {
      bonusDraw += OVEREXPANSION.PENALTY.draw;
      bonusActions += OVEREXPANSION.PENALTY.action;
    }

    // 영토 분산 페널티 계산
    const fragmentationGroups = GameEngine.countConnectedTerritoryGroups(state, playerId);
    if (fragmentationGroups >= FRAGMENTATION_THRESHOLD.SEVERE) {
      const penalty = FRAGMENTATION_PENALTY[FRAGMENTATION_THRESHOLD.SEVERE];
      bonusDraw += penalty.draw;
      bonusActions += penalty.action;
    } else if (fragmentationGroups === FRAGMENTATION_THRESHOLD.MINOR) {
      const penalty = FRAGMENTATION_PENALTY[FRAGMENTATION_THRESHOLD.MINOR];
      bonusDraw += penalty.draw;
      bonusActions += penalty.action;
    }

    // 페널티 한계: 최대 1장/1행동력까지만 감소 허용
    bonusDraw = Math.max(bonusDraw, -1);
    bonusActions = Math.max(bonusActions, -1);

    return { bonusDraw, bonusActions, dominatedRegions, fragmentationGroups };
  }

  // 연결된 영토 그룹 수 계산 (BFS - 양방향 인접 맵 사용)
  static countConnectedTerritoryGroups(state: GameState, playerId: string): number {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.territories.length <= 1) return player?.territories.length || 0;

    const ownedSet = new Set(player.territories);
    const visited = new Set<string>();
    let groupCount = 0;

    // BFS로 연결된 영토 탐색 (양방향 인접 맵 사용으로 방향성 문제 해결)
    const bfs = (startId: string) => {
      const queue = [startId];
      let head = 0;
      visited.add(startId);

      while (head < queue.length) {
        const currentId = queue[head++];
        const neighbors = bidirectionalAdjacencyMap.get(currentId);

        if (neighbors) {
          for (const adjId of neighbors) {
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

  // activeEvents 처리 (duration 감소, 만료 시 효과 해제)
  static processActiveEvents(state: GameState): void {
    const expiredEvents: typeof state.activeEvents = [];
    const remainingEvents: typeof state.activeEvents = [];

    for (const event of state.activeEvents) {
      if (event.duration <= 1) {
        expiredEvents.push(event);
      } else {
        event.duration--;
        remainingEvents.push(event);
      }
    }

    // 만료된 이벤트 효과 해제
    for (const event of expiredEvents) {
      if (event.effect === 'BLOCK_NEUTRAL') {
        state.blockNeutralCapture = false;
        GameEngine.addLog(state, 'system', '황건적 효과가 종료되었습니다.');
      } else if (event.effect === 'BLOCK_ATTACK') {
        state.blockAllAttacks = false;
        GameEngine.addLog(state, 'system', '휴전 효과가 종료되었습니다.');
      }
      // 만료된 이벤트는 discardPile로 이동
      state.discardPile.push(event as unknown as CardInHand);
    }

    state.activeEvents = remainingEvents;
  }

  // 턴 효과에서 공격력 보너스 계산
  static getAttackBonus(state: GameState, playerId: string): number {
    let bonus = 0;
    for (const effect of state.turnEffects) {
      if (effect.playerId === playerId) {
        if (effect.type === 'ATTACK_BOOST' || effect.type === 'ATTACK_BOOST_SMALL' || effect.type === 'ATTACK_BUFF') {
          bonus += effect.value;
        }
      }
    }
    // 글로벌 ATTACK_DEBUFF 효과 (폭풍우)
    for (const effect of state.turnEffects) {
      if (effect.type === 'ATTACK_DEBUFF') {
        bonus -= effect.value;
      }
    }
    return bonus;
  }

  // 영토 방어 보너스 (TERRITORY_DEFENSE 효과)
  static getTerritoryDefenseBonus(state: GameState, territoryId: string): number {
    let bonus = 0;
    for (const effect of state.turnEffects) {
      if (effect.type === 'TERRITORY_DEFENSE' && effect.territoryId === territoryId) {
        bonus += effect.value;
      }
    }
    return bonus;
  }
}
