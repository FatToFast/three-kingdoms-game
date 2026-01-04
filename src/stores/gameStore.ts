'use client';

import { create } from 'zustand';
import type { GameState } from '@/types/game';
import { CARDS_PER_DRAW } from '@/types/game';
import type { CardInHand } from '@/types/card';
import { GameEngine } from '@/lib/game/engine';
import { io, type Socket } from 'socket.io-client';

type MultiplayerMode = 'local' | 'online';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type RoomInfo = {
  code: string;
  maxPlayers: number;
  isStarted: boolean;
  hostSeatIndex: number | null;
  seats: Array<{
    index: number;
    name: string | null;
    color: string;
    occupied: boolean;
    reserved: boolean;
  }>;
};

type OnlineGameAction =
  | 'drawCards'
  | 'endTurn'
  | 'attack'
  | 'defend'
  | 'skipDefense'
  | 'clearCombat'
  | 'deployGeneral'
  | 'playCard'
  | 'discardCard';

interface GameStore {
  // 상태
  gameState: GameState | null;
  selectedCardIds: string[];
  selectedTerritoryId: string | null;
  selectedTacticianTargetId: string | null;
  isLoading: boolean;
  mode: MultiplayerMode;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  playerId: string | null;
  seatIndex: number | null;

  // 게임 초기화
  initGame: (playerNames: string[]) => void;
  resetGame: () => void;

  // 멀티플레이어
  setMode: (mode: MultiplayerMode) => void;
  createRoom: (maxPlayers: number) => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  selectSeat: (seatIndex: number, name: string) => void;
  leaveRoom: () => void;
  startOnlineGame: () => void;

  // 카드 선택
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  clearSelectedCards: () => void;

  // 영토 선택
  selectTerritory: (territoryId: string | null) => void;

  // 턴 액션
  drawCards: () => void;
  endTurn: () => void;

  // 공격/방어
  attack: () => void;
  defend: () => void;
  skipDefense: () => void;
  clearCombat: () => void;

  // 카드 사용
  deployGeneral: (territoryId: string) => void;
  playCard: (targetId?: string) => void;
  discardCard: (cardId: string) => void;

  // 유틸리티
  getCurrentPlayer: () => ReturnType<typeof getCurrentPlayerFromState>;
  getAttackableTerritories: () => string[];
}

const SOCKET_PATH = '/api/socket';
let socket: Socket | null = null;

type SeatTokenRecord = {
  seatIndex: number;
  seatToken: string;
};

const SEAT_TOKEN_PREFIX = 'tk-seat:';

const getSeatTokenKey = (roomCode: string) => `${SEAT_TOKEN_PREFIX}${roomCode}`;

const readSeatToken = (roomCode: string): SeatTokenRecord | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(getSeatTokenKey(roomCode));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SeatTokenRecord;
    if (typeof parsed?.seatIndex !== 'number' || typeof parsed?.seatToken !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeSeatToken = (roomCode: string, record: SeatTokenRecord) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSeatTokenKey(roomCode), JSON.stringify(record));
};

const clearSeatToken = (roomCode: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getSeatTokenKey(roomCode));
};

const ensureSocket = async (
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
): Promise<Socket> => {
  if (socket) {
    if (!socket.connected) {
      set({ connectionStatus: 'connecting', connectionError: null });
      socket.connect();
    }
    return socket;
  }

  set({ connectionStatus: 'connecting', connectionError: null });
  await fetch('/api/socket');
  socket = io({
    path: SOCKET_PATH,
  });

  socket.on('connect', () => {
    set({ connectionStatus: 'connected' });

    const { mode, roomCode } = get();
    if (mode === 'online' && roomCode && socket) {
      socket.emit('room:join', { roomCode });
      const storedSeat = readSeatToken(roomCode);
      if (storedSeat) {
        socket.emit('seat:reclaim', {
          roomCode,
          seatIndex: storedSeat.seatIndex,
          seatToken: storedSeat.seatToken,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    set({ connectionStatus: 'disconnected' });
  });

  socket.on('room:update', (roomInfo: RoomInfo) => {
    set({
      roomInfo,
      roomCode: roomInfo.code,
      connectionError: null,
    });
  });

  socket.on('room:error', (payload: { message: string }) => {
    set({ connectionError: payload.message });
  });

  socket.on(
    'seat:confirmed',
    (payload: { roomCode: string; seatIndex: number; playerId: string; seatToken?: string }) => {
      if (payload.seatToken) {
        writeSeatToken(payload.roomCode, {
          seatIndex: payload.seatIndex,
          seatToken: payload.seatToken,
        });
      }

      set({
        roomCode: payload.roomCode,
        seatIndex: payload.seatIndex,
        playerId: payload.playerId,
        connectionError: null,
      });
    }
  );

  socket.on('room:closed', (payload: { message: string }) => {
    const { roomCode } = get();
    if (roomCode) {
      clearSeatToken(roomCode);
    }

    set({
      roomCode: null,
      roomInfo: null,
      playerId: null,
      seatIndex: null,
      gameState: null,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
      connectionError: payload.message,
    });
  });

  socket.on('game:update', (gameState: GameState) => {
    set({ gameState });
  });

  return socket;
};

const emitGameAction = (
  get: () => GameStore,
  action: OnlineGameAction,
  data?: Record<string, unknown>
): boolean => {
  const { mode, roomCode, playerId } = get();
  if (mode !== 'online' || !socket || !roomCode || !playerId) return false;

  socket.emit('game:action', {
    roomCode,
    action,
    playerId,
    data,
  });

  return true;
};

function getCurrentPlayerFromState(state: GameState | null) {
  if (!state) return null;
  return state.players[state.currentPlayerIndex];
}

function findCardInAnyHand(state: GameState | null, cardId: string): CardInHand | null {
  if (!state) return null;
  for (const player of state.players) {
    const card = player.hand.find((cardInHand) => cardInHand.instanceId === cardId);
    if (card) return card;
  }
  return null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  selectedCardIds: [],
  selectedTerritoryId: null,
  selectedTacticianTargetId: null,
  isLoading: false,
  mode: 'local',
  roomCode: null,
  roomInfo: null,
  connectionStatus: 'disconnected',
  connectionError: null,
  playerId: null,
  seatIndex: null,

  initGame: (playerNames) => {
    if (get().mode === 'online') return;
    const gameState = GameEngine.initializeGame(playerNames);
    set({
      gameState,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
    });
  },

  resetGame: () => {
    if (get().mode === 'online') {
      get().leaveRoom();
      return;
    }
    set({
      gameState: null,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
    });
  },

  setMode: (mode) => {
    if (mode === 'local' && get().mode === 'online') {
      get().leaveRoom();
    }
    set({ mode });
  },

  createRoom: async (maxPlayers) => {
    set({ mode: 'online' });
    const socketClient = await ensureSocket(set, get);
    socketClient.emit('room:create', { maxPlayers });
  },

  joinRoom: async (roomCode) => {
    const normalizedCode = roomCode.trim().toUpperCase();
    set({ mode: 'online', roomCode: normalizedCode });
    const socketClient = await ensureSocket(set, get);
    socketClient.emit('room:join', { roomCode: normalizedCode });
    const storedSeat = readSeatToken(normalizedCode);
    if (storedSeat) {
      socketClient.emit('seat:reclaim', {
        roomCode: normalizedCode,
        seatIndex: storedSeat.seatIndex,
        seatToken: storedSeat.seatToken,
      });
    }
  },

  selectSeat: (seatIndex, name) => {
    const { roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit('seat:select', { roomCode, seatIndex, name });
  },

  leaveRoom: () => {
    const { roomCode } = get();
    if (socket && roomCode) {
      socket.emit('room:leave', { roomCode });
    }
    if (roomCode) {
      clearSeatToken(roomCode);
    }
    set({
      roomCode: null,
      roomInfo: null,
      playerId: null,
      seatIndex: null,
      gameState: null,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
      connectionError: null,
    });
  },

  startOnlineGame: () => {
    const { roomCode } = get();
    if (!socket || !roomCode) return;
    socket.emit('room:start', { roomCode });
  },

  selectCard: (cardId) => {
    set((state) => {
      if (state.selectedCardIds.includes(cardId)) {
        return state;
      }

      const card = findCardInAnyHand(state.gameState, cardId);
      if (!card) return state;

      let selectedCardIds = [...state.selectedCardIds, cardId];
      let selectedTacticianTargetId = state.selectedTacticianTargetId;

      if (card.type === 'tactician') {
        const existingTacticianId = state.selectedCardIds.find((id) => {
          const existingCard = findCardInAnyHand(state.gameState, id);
          return existingCard?.type === 'tactician';
        });

        if (existingTacticianId) {
          selectedCardIds = selectedCardIds.filter((id) => id !== existingTacticianId);
        }

        const lastAttackCardId = [...selectedCardIds]
          .reverse()
          .find((id) => findCardInAnyHand(state.gameState, id)?.type !== 'tactician');

        selectedTacticianTargetId = lastAttackCardId ?? null;
      } else {
        const hasTacticianSelected = selectedCardIds.some((id) => {
          const selectedCard = findCardInAnyHand(state.gameState, id);
          return selectedCard?.type === 'tactician';
        });

        if (hasTacticianSelected) {
          selectedTacticianTargetId = cardId;
        }
      }

      return { selectedCardIds, selectedTacticianTargetId };
    });
  },

  deselectCard: (cardId) => {
    set((state) => {
      const card = findCardInAnyHand(state.gameState, cardId);
      if (!card) return state;

      const selectedCardIds = state.selectedCardIds.filter((id) => id !== cardId);
      let selectedTacticianTargetId = state.selectedTacticianTargetId;

      if (card.type === 'tactician') {
        selectedTacticianTargetId = null;
      } else if (selectedTacticianTargetId === cardId) {
        const fallbackTargetId = selectedCardIds.find((id) => {
          const selectedCard = findCardInAnyHand(state.gameState, id);
          return selectedCard?.type !== 'tactician';
        });
        selectedTacticianTargetId = fallbackTargetId ?? null;
      }

      return { selectedCardIds, selectedTacticianTargetId };
    });
  },

  clearSelectedCards: () => {
    set({ selectedCardIds: [], selectedTacticianTargetId: null });
  },

  selectTerritory: (territoryId) => {
    set({ selectedTerritoryId: territoryId });
  },

  drawCards: () => {
    if (emitGameAction(get, 'drawCards')) return;
    const { gameState } = get();
    if (!gameState) return;

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return;

    // 영토 보너스 계산 (기본 CARDS_PER_DRAW장 + 보너스)
    const territoryBonus = GameEngine.calculateTerritoryBonus(gameState, currentPlayer.id);
    const totalDraw = CARDS_PER_DRAW + territoryBonus.bonusDraw;

    let newState = GameEngine.drawCards({ ...gameState }, currentPlayer.id, totalDraw, {
      ensureNonGeneral: true,
    });
    newState = GameEngine.nextPhase(newState);

    set({ gameState: newState });
  },

  endTurn: () => {
    if (emitGameAction(get, 'endTurn')) return;
    const { gameState } = get();
    if (!gameState) return;

    const newState = GameEngine.endTurn({ ...gameState });
    set({
      gameState: newState,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
    });
  },

  attack: () => {
    const { gameState, selectedCardIds, selectedTerritoryId, selectedTacticianTargetId } = get();
    if (!gameState || !selectedTerritoryId || selectedCardIds.length === 0) return;

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return;

    if (
      emitGameAction(get, 'attack', {
        targetTerritoryId: selectedTerritoryId,
        cardInstanceIds: selectedCardIds,
        tacticianTargetInstanceId: selectedTacticianTargetId,
      })
    ) {
      set({
        selectedCardIds: [],
        selectedTerritoryId: null,
        selectedTacticianTargetId: null,
      });
      return;
    }

    const newState = GameEngine.startAttack(
      { ...gameState },
      currentPlayer.id,
      selectedTerritoryId,
      selectedCardIds,
      selectedTacticianTargetId
    );

    set({
      gameState: newState,
      selectedCardIds: [],
      selectedTerritoryId: null,
      selectedTacticianTargetId: null,
    });
  },

  defend: () => {
    const { gameState, selectedCardIds } = get();
    if (!gameState) return;

    if (emitGameAction(get, 'defend', { cardInstanceIds: selectedCardIds })) {
      set({ selectedCardIds: [], selectedTacticianTargetId: null });
      return;
    }

    const newState = GameEngine.defend({ ...gameState }, selectedCardIds);
    set({ gameState: newState, selectedCardIds: [], selectedTacticianTargetId: null });
  },

  skipDefense: () => {
    if (emitGameAction(get, 'skipDefense')) return;
    const { gameState } = get();
    if (!gameState) return;

    const newState = GameEngine.skipDefense({ ...gameState });
    set({ gameState: newState });
  },

  clearCombat: () => {
    if (emitGameAction(get, 'clearCombat')) return;
    const { gameState } = get();
    if (!gameState) return;

    const newState = GameEngine.clearCombat({ ...gameState });
    set({ gameState: newState });
  },

  deployGeneral: (territoryId) => {
    const { gameState, selectedCardIds } = get();
    if (!gameState || selectedCardIds.length !== 1) return;

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return;

    if (
      emitGameAction(get, 'deployGeneral', {
        cardInstanceId: selectedCardIds[0],
        territoryId,
      })
    ) {
      set({ selectedCardIds: [], selectedTacticianTargetId: null });
      return;
    }

    const newState = GameEngine.deployGeneral(
      { ...gameState },
      currentPlayer.id,
      selectedCardIds[0],
      territoryId
    );

    set({ gameState: newState, selectedCardIds: [], selectedTacticianTargetId: null });
  },

  playCard: (targetId) => {
    const { gameState, selectedCardIds } = get();
    if (!gameState || selectedCardIds.length !== 1) return;

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return;

    if (
      emitGameAction(get, 'playCard', {
        cardInstanceId: selectedCardIds[0],
        targetId,
      })
    ) {
      set({ selectedCardIds: [], selectedTacticianTargetId: null });
      return;
    }

    const newState = GameEngine.playCard(
      { ...gameState },
      currentPlayer.id,
      selectedCardIds[0],
      targetId
    );

    set({ gameState: newState, selectedCardIds: [], selectedTacticianTargetId: null });
  },

  discardCard: (cardId) => {
    if (emitGameAction(get, 'discardCard', { cardInstanceId: cardId })) return;
    const { gameState } = get();
    if (!gameState) return;

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return;

    const newState = GameEngine.discardCard({ ...gameState }, currentPlayer.id, cardId);
    set({ gameState: newState });
  },

  getCurrentPlayer: () => {
    const { gameState } = get();
    return getCurrentPlayerFromState(gameState);
  },

  getAttackableTerritories: () => {
    const { gameState } = get();
    if (!gameState) return [];

    const currentPlayer = getCurrentPlayerFromState(gameState);
    if (!currentPlayer) return [];

    return GameEngine.getAttackableTerritoriesIds(gameState, currentPlayer.id);
  },
}));
