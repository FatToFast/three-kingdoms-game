import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HttpServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { GameEngine } from '@/lib/game/engine';
import { PLAYER_COLORS } from '@/types/player';
import type { GameState } from '@/types/game';

type SocketServer = HttpServer & {
  io?: Server;
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: SocketServer;
  };
};

type Seat = {
  index: number;
  name: string | null;
  color: string;
  socketId: string | null;
  seatToken: string | null;
  reservedUntil: number | null;
  lastSeenAt: number | null;
};

type Room = {
  code: string;
  maxPlayers: number;
  seats: Seat[];
  hostSocketId: string | null;
  gameState: GameState | null;
  createdAt: number;
  lastActivityAt: number;
};

type RoomInfo = {
  code: string;
  maxPlayers: number;
  seats: Array<{
    index: number;
    name: string | null;
    color: string;
    occupied: boolean;
    reserved: boolean;
  }>;
  hostSeatIndex: number | null;
  isStarted: boolean;
};

type GameActionPayload = {
  roomCode: string;
  action:
    | 'drawCards'
    | 'endTurn'
    | 'attack'
    | 'defend'
    | 'skipDefense'
    | 'clearCombat'
    | 'deployGeneral'
    | 'playCard'
    | 'discardCard';
  playerId: string;
  data?: Record<string, unknown>;
};

const globalForSocket = globalThis as typeof globalThis & {
  rooms?: Map<string, Room>;
  cleanupInterval?: NodeJS.Timeout;
};

const SEAT_RESERVE_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
const LOBBY_ROOM_TTL_MS = 30 * 60 * 1000;
const ACTIVE_ROOM_TTL_MS = 60 * 60 * 1000;

const getRoomsStore = () => {
  if (!globalForSocket.rooms) {
    globalForSocket.rooms = new Map();
  }
  return globalForSocket.rooms;
};

const createRoomCode = (rooms: Map<string, Room>) => {
  let code = '';
  do {
    code = nanoid(6).toUpperCase();
  } while (rooms.has(code));
  return code;
};

const touchRoom = (room: Room) => {
  room.lastActivityAt = Date.now();
};

const releaseSeat = (seat: Seat, preserveToken: boolean) => {
  seat.socketId = null;
  seat.lastSeenAt = Date.now();

  if (preserveToken) {
    seat.reservedUntil = Date.now() + SEAT_RESERVE_MS;
    return;
  }

  seat.name = null;
  seat.seatToken = null;
  seat.reservedUntil = null;
  seat.lastSeenAt = null;
};

const releaseSeatBySocket = (room: Room, socketId: string, preserveToken: boolean) => {
  room.seats.forEach((seat) => {
    if (seat.socketId === socketId) {
      releaseSeat(seat, preserveToken);
    }
  });
};

const getPlayerIdForSocket = (room: Room, socketId: string): string | null => {
  const seat = room.seats.find((seatItem) => seatItem.socketId === socketId);
  if (!seat) return null;
  return `player-${seat.index}`;
};

const maskGameState = (room: Room, playerId: string | null): GameState | null => {
  if (!room.gameState) return null;

  const maskedPlayers = room.gameState.players.map((player) => {
    const isSelf = playerId === player.id;
    return {
      ...player,
      hand: isSelf ? player.hand : [],
      handSize: player.hand.length,
    };
  });

  return {
    ...room.gameState,
    players: maskedPlayers,
  };
};

const emitMaskedGameStateToSocket = (io: Server, room: Room, socketId: string) => {
  if (!room.gameState) return;
  const playerId = getPlayerIdForSocket(room, socketId);
  const masked = maskGameState(room, playerId);
  if (!masked) return;
  io.to(socketId).emit('game:update', masked);
};

const emitMaskedGameState = async (io: Server, room: Room) => {
  if (!room.gameState) return;
  const socketIds = await io.in(room.code).allSockets();
  socketIds.forEach((socketId) => {
    emitMaskedGameStateToSocket(io, room, socketId);
  });
};

const buildRoomInfo = (room: Room): RoomInfo => {
  const now = Date.now();
  const hostSeatIndex =
    room.hostSocketId === null
      ? null
      : room.seats.find((seat) => seat.socketId === room.hostSocketId)?.index ?? null;

  return {
    code: room.code,
    maxPlayers: room.maxPlayers,
    isStarted: !!room.gameState,
    hostSeatIndex,
    seats: room.seats.map((seat) => {
      if (!seat.socketId && seat.reservedUntil && seat.reservedUntil <= now) {
        releaseSeat(seat, false);
      }

      return {
        index: seat.index,
        name: seat.name,
        color: seat.color,
        occupied: !!seat.socketId,
        reserved: !seat.socketId && !!seat.reservedUntil && seat.reservedUntil > now,
      };
    }),
  };
};

const refreshHost = (room: Room) => {
  if (room.hostSocketId && room.seats.some((seat) => seat.socketId === room.hostSocketId)) {
    return;
  }

  const nextHost = room.seats.find((seat) => seat.socketId);
  room.hostSocketId = nextHost?.socketId ?? null;
};

const isPlayerActionAllowed = (room: Room, playerId: string, action: GameActionPayload['action']) => {
  const gameState = room.gameState;
  if (!gameState) return false;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isCurrentPlayer = currentPlayer?.id === playerId;

  if (isCurrentPlayer) return true;

  const isDefenseAction = action === 'defend' || action === 'skipDefense';
  if (!isDefenseAction || !gameState.combat) return false;

  return gameState.combat.defenderId === playerId;
};

const startCleanup = (io: Server, rooms: Map<string, Room>) => {
  if (globalForSocket.cleanupInterval) return;

  globalForSocket.cleanupInterval = setInterval(() => {
    const now = Date.now();

    rooms.forEach((room, code) => {
      const hasActiveSeat = room.seats.some(
        (seat) =>
          !!seat.socketId || (seat.reservedUntil !== null && seat.reservedUntil > now)
      );

      const idleMs = now - room.lastActivityAt;
      const ttl = !hasActiveSeat
        ? EMPTY_ROOM_TTL_MS
        : room.gameState
          ? ACTIVE_ROOM_TTL_MS
          : LOBBY_ROOM_TTL_MS;

      if (idleMs < ttl) return;

      io.to(code).emit('room:closed', { message: '비활성 방이 정리되었습니다.' });
      io.in(code).socketsLeave(code);
      rooms.delete(code);
    });
  }, CLEANUP_INTERVAL_MS);
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
    });

    const rooms = getRoomsStore();
    startCleanup(io, rooms);

    io.on('connection', (socket) => {
      socket.on('room:create', ({ maxPlayers }: { maxPlayers: number }) => {
        const clampedPlayers = Math.max(2, Math.min(4, maxPlayers));
        const code = createRoomCode(rooms);
        const seats = Array.from({ length: clampedPlayers }).map((_, index) => ({
          index,
          name: null,
          color: PLAYER_COLORS[index],
          socketId: null,
          seatToken: null,
          reservedUntil: null,
          lastSeenAt: null,
        }));

        const room: Room = {
          code,
          maxPlayers: clampedPlayers,
          seats,
          hostSocketId: socket.id,
          gameState: null,
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        };

        rooms.set(code, room);
        socket.join(code);
        touchRoom(room);
        socket.emit('room:update', buildRoomInfo(room));
      });

      socket.on('room:join', ({ roomCode }: { roomCode: string }) => {
        const room = rooms.get(roomCode);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found.' });
          return;
        }

        socket.join(roomCode);
        touchRoom(room);
        socket.emit('room:update', buildRoomInfo(room));
        if (room.gameState) {
          emitMaskedGameStateToSocket(io, room, socket.id);
        }
      });

      socket.on(
        'seat:select',
        ({
          roomCode,
          seatIndex,
          name,
        }: {
          roomCode: string;
          seatIndex: number;
          name: string;
        }) => {
          const room = rooms.get(roomCode);
          if (!room) return;

          if (seatIndex < 0 || seatIndex >= room.maxPlayers) return;

          const seat = room.seats[seatIndex];
          if (!seat) return;

          const now = Date.now();
          if (seat.reservedUntil && seat.reservedUntil <= now && !seat.socketId) {
            seat.reservedUntil = null;
            seat.seatToken = null;
            seat.name = null;
          }

          if (seat.socketId && seat.socketId !== socket.id) return;
          if (!seat.socketId && seat.reservedUntil && seat.reservedUntil > now) return;

          releaseSeatBySocket(room, socket.id, false);

          seat.socketId = socket.id;
          seat.name = name?.trim() || `Player ${seatIndex + 1}`;
          seat.seatToken = nanoid(12);
          seat.reservedUntil = null;
          seat.lastSeenAt = now;

          if (!room.hostSocketId) {
            room.hostSocketId = socket.id;
          }

          touchRoom(room);
          io.to(roomCode).emit('room:update', buildRoomInfo(room));
          socket.emit('seat:confirmed', {
            roomCode,
            seatIndex,
            playerId: `player-${seatIndex}`,
            seatToken: seat.seatToken,
          });
          if (room.gameState) {
            emitMaskedGameStateToSocket(io, room, socket.id);
          }
        }
      );

      socket.on(
        'seat:reclaim',
        ({
          roomCode,
          seatIndex,
          seatToken,
          name,
        }: {
          roomCode: string;
          seatIndex: number;
          seatToken: string;
          name?: string;
        }) => {
          const room = rooms.get(roomCode);
          if (!room) return;

          if (seatIndex < 0 || seatIndex >= room.maxPlayers) return;

          const seat = room.seats[seatIndex];
          if (!seat || !seat.seatToken) return;

          const now = Date.now();
          if (seat.reservedUntil && seat.reservedUntil <= now && !seat.socketId) {
            seat.reservedUntil = null;
            seat.seatToken = null;
            seat.name = null;
            return;
          }

          if (seat.seatToken !== seatToken) return;
          if (seat.socketId && seat.socketId !== socket.id) return;
          if (seat.reservedUntil && seat.reservedUntil > now && !seat.socketId) {
            seat.socketId = socket.id;
          }

          seat.reservedUntil = null;
          seat.socketId = socket.id;
          seat.lastSeenAt = now;
          seat.name = name?.trim() || seat.name || `Player ${seatIndex + 1}`;

          if (!room.hostSocketId) {
            room.hostSocketId = socket.id;
          }

          socket.join(roomCode);
          touchRoom(room);
          io.to(roomCode).emit('room:update', buildRoomInfo(room));
          socket.emit('seat:confirmed', {
            roomCode,
            seatIndex,
            playerId: `player-${seatIndex}`,
            seatToken: seat.seatToken,
          });
          emitMaskedGameStateToSocket(io, room, socket.id);
        }
      );

      socket.on('room:leave', ({ roomCode }: { roomCode: string }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        releaseSeatBySocket(room, socket.id, false);
        refreshHost(room);
        touchRoom(room);

        socket.leave(roomCode);
        io.to(roomCode).emit('room:update', buildRoomInfo(room));
      });

      socket.on('room:start', ({ roomCode }: { roomCode: string }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        if (room.hostSocketId !== socket.id) return;

        const filledSeats = room.seats.filter((seat) => seat.socketId);
        if (filledSeats.length < 2 || filledSeats.length !== room.maxPlayers) {
          socket.emit('room:error', { message: 'Need all seats filled to start.' });
          return;
        }

        const playerNames = room.seats.map((seat) => seat.name || `Player ${seat.index + 1}`);
        room.gameState = GameEngine.initializeGame(playerNames);

        touchRoom(room);
        io.to(roomCode).emit('room:update', buildRoomInfo(room));
        void emitMaskedGameState(io, room);
      });

      socket.on('game:action', (payload: GameActionPayload) => {
        const room = rooms.get(payload.roomCode);
        if (!room?.gameState) return;

        const seatIndex = room.seats.find((seat) => seat.socketId === socket.id)?.index;
        if (seatIndex === undefined) return;

        const expectedPlayerId = `player-${seatIndex}`;
        if (expectedPlayerId !== payload.playerId) return;

        if (!isPlayerActionAllowed(room, payload.playerId, payload.action)) return;

        const state = { ...room.gameState };

        switch (payload.action) {
          case 'drawCards': {
            const currentPlayer = state.players[state.currentPlayerIndex];
            room.gameState = GameEngine.drawCards(state, currentPlayer.id, 2, {
              ensureNonGeneral: true,
            });
            room.gameState = GameEngine.nextPhase(room.gameState);
            break;
          }
          case 'endTurn': {
            room.gameState = GameEngine.endTurn(state);
            break;
          }
          case 'attack': {
            const { targetTerritoryId, cardInstanceIds, tacticianTargetInstanceId } =
              (payload.data || {}) as {
                targetTerritoryId: string;
                cardInstanceIds: string[];
                tacticianTargetInstanceId?: string | null;
              };
            room.gameState = GameEngine.startAttack(
              state,
              payload.playerId,
              targetTerritoryId,
              cardInstanceIds,
              tacticianTargetInstanceId ?? null
            );
            break;
          }
          case 'defend': {
            const { cardInstanceIds } = (payload.data || {}) as { cardInstanceIds: string[] };
            room.gameState = GameEngine.defend(state, cardInstanceIds);
            break;
          }
          case 'skipDefense': {
            room.gameState = GameEngine.skipDefense(state);
            break;
          }
          case 'clearCombat': {
            room.gameState = GameEngine.clearCombat(state);
            break;
          }
          case 'deployGeneral': {
            const { cardInstanceId, territoryId } = (payload.data || {}) as {
              cardInstanceId: string;
              territoryId: string;
            };
            room.gameState = GameEngine.deployGeneral(
              state,
              payload.playerId,
              cardInstanceId,
              territoryId
            );
            break;
          }
          case 'playCard': {
            const { cardInstanceId, targetId } = (payload.data || {}) as {
              cardInstanceId: string;
              targetId?: string;
            };
            room.gameState = GameEngine.playCard(state, payload.playerId, cardInstanceId, targetId);
            break;
          }
          case 'discardCard': {
            const { cardInstanceId } = (payload.data || {}) as { cardInstanceId: string };
            room.gameState = GameEngine.discardCard(state, payload.playerId, cardInstanceId);
            break;
          }
          default:
            return;
        }

        touchRoom(room);
        void emitMaskedGameState(io, room);
      });

      socket.on('disconnect', () => {
        rooms.forEach((room, code) => {
          if (!room.seats.some((seat) => seat.socketId === socket.id)) return;

          releaseSeatBySocket(room, socket.id, true);
          refreshHost(room);
          touchRoom(room);
          io.to(code).emit('room:update', buildRoomInfo(room));
        });
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
