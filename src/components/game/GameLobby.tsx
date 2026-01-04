'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { useGameStore } from '@/stores/gameStore';
import { cn } from '@/lib/utils';
import type { AIDifficulty } from '@/lib/game/ai';
import { DEFAULT_GAME_CONFIG } from '@/types/game';

const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B'];
const DEFAULT_NAMES = ['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4'];
const AI_DIFFICULTIES: { value: AIDifficulty; label: string; desc: string }[] = [
  { value: 'easy', label: '쉬움', desc: '초보자용' },
  { value: 'normal', label: '보통', desc: '균형잡힌 난이도' },
  { value: 'hard', label: '어려움', desc: '전략적 AI' },
];

const CARD_MULTIPLIERS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: '적음', desc: '빠른 게임' },
  { value: 2, label: '보통', desc: '기본 설정' },
  { value: 3, label: '많음', desc: '긴 게임' },
];

export function GameLobby() {
  const {
    initGame,
    mode,
    setMode,
    createRoom,
    joinRoom,
    selectSeat,
    leaveRoom,
    startOnlineGame,
    roomInfo,
    connectionStatus,
    connectionError,
    seatIndex,
  } = useGameStore();

  const [playerCount, setPlayerCount] = useState(2);
  const [humanPlayerCount, setHumanPlayerCount] = useState(1);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('normal');
  const [cardMultiplier, setCardMultiplier] = useState<number>(DEFAULT_GAME_CONFIG.nonGeneralMultiplier);
  const [playerNames, setPlayerNames] = useState<string[]>(DEFAULT_NAMES);
  const [onlineName, setOnlineName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(2);

  const aiPlayerCount = playerCount - humanPlayerCount;

  const isOnline = mode === 'online';
  const isHost = roomInfo?.hostSeatIndex !== null && roomInfo?.hostSeatIndex === seatIndex;
  const canStart =
    !!roomInfo &&
    !roomInfo.isStarted &&
    !!roomInfo.seats.length &&
    roomInfo.seats.every((seat) => seat.occupied) &&
    isHost;

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStart = () => {
    const names = playerNames.slice(0, humanPlayerCount).map((name, i) => name || DEFAULT_NAMES[i]);
    initGame(names, aiPlayerCount, aiDifficulty, { nonGeneralMultiplier: cardMultiplier });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* 제목 */}
        <div className="text-center mb-6">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🐉
          </motion.div>
          <h1 className="text-3xl font-bold text-amber-800">삼국지 천하대전</h1>
          <p className="text-gray-600 mt-2">영토를 정복하고 천하를 통일하세요!</p>
        </div>

        {/* 모드 선택 */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setMode('local')}
            className={cn(
              'flex-1 py-2 rounded-lg font-semibold transition-all',
              !isOnline ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            로컬 플레이
          </button>
          <button
            onClick={() => setMode('online')}
            className={cn(
              'flex-1 py-2 rounded-lg font-semibold transition-all',
              isOnline ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            온라인 플레이
          </button>
        </div>

        {!isOnline && (
          <>
            {/* 총 플레이어 수 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 총 플레이어 수
              </label>
              <div className="flex gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setPlayerCount(count);
                      // 인간 플레이어 수가 총 플레이어 수를 초과하지 않도록
                      if (humanPlayerCount > count) {
                        setHumanPlayerCount(count);
                      }
                    }}
                    className={cn(
                      'flex-1 py-3 rounded-lg font-bold text-lg transition-all',
                      playerCount === count
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {count}명
                  </button>
                ))}
              </div>
            </div>

            {/* 인간 플레이어 수 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🧑 인간 플레이어 수 (나머지는 AI)
              </label>
              <div className="flex gap-2">
                {Array.from({ length: playerCount }, (_, i) => i + 1).map((count) => (
                  <button
                    key={count}
                    onClick={() => setHumanPlayerCount(count)}
                    className={cn(
                      'flex-1 py-2 rounded-lg font-semibold transition-all',
                      humanPlayerCount === count
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {count}명
                  </button>
                ))}
              </div>
              {aiPlayerCount > 0 && (
                <p className="mt-2 text-sm text-amber-600">
                  🤖 AI 플레이어 {aiPlayerCount}명이 참가합니다
                </p>
              )}
            </div>

            {/* AI 난이도 선택 */}
            {aiPlayerCount > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 AI 난이도
                </label>
                <div className="flex gap-2">
                  {AI_DIFFICULTIES.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setAiDifficulty(diff.value)}
                      className={cn(
                        'flex-1 py-2 rounded-lg font-semibold transition-all',
                        aiDifficulty === diff.value
                          ? 'bg-purple-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <div>{diff.label}</div>
                      <div className="text-xs opacity-75">{diff.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 카드 배수 설정 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🃏 비무장 카드 수량
              </label>
              <div className="flex gap-2">
                {CARD_MULTIPLIERS.map((mult) => (
                  <button
                    key={mult.value}
                    onClick={() => setCardMultiplier(mult.value)}
                    className={cn(
                      'flex-1 py-2 rounded-lg font-semibold transition-all',
                      cardMultiplier === mult.value
                        ? 'bg-teal-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <div>{mult.label}</div>
                    <div className="text-xs opacity-75">{mult.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 플레이어 이름 입력 */}
            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 플레이어 이름
              </label>
              {Array.from({ length: humanPlayerCount }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-md"
                    style={{ backgroundColor: PLAYER_COLORS[index] }}
                  />
                  <input
                    type="text"
                    placeholder={DEFAULT_NAMES[index]}
                    value={playerNames[index]}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-amber-400 focus:outline-none transition-colors"
                  />
                </motion.div>
              ))}
            </div>

            {/* 게임 규칙 요약 */}
            <div className="mb-6 p-4 bg-amber-50 rounded-lg">
              <h3 className="font-bold text-amber-800 mb-2">📜 게임 규칙</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 영토 18개 또는 가치 합 30 달성 시 승리</li>
                <li>• 매 턴 카드 2장 (무장만 나오면 비무장 1장으로 교체)</li>
                <li>• 무장 카드로 인접 영토를 공격</li>
                <li>• 전략 카드로 전투를 유리하게!</li>
              </ul>
            </div>

            {/* 시작 버튼 */}
            <Button onClick={handleStart} size="lg" className="w-full">
              🎮 게임 시작!
            </Button>
          </>
        )}

        {isOnline && (
          <>
            {!roomInfo && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🪪 내 이름
                  </label>
                  <input
                    type="text"
                    value={onlineName}
                    onChange={(e) => setOnlineName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🧩 방 만들기 (인원수)
                  </label>
                  <div className="flex gap-2 mb-3">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => setOnlinePlayerCount(count)}
                        className={cn(
                          'flex-1 py-2 rounded-lg font-semibold transition-all',
                          onlinePlayerCount === count
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {count}명
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => createRoom(onlinePlayerCount)}
                    className="w-full"
                    disabled={connectionStatus === 'connecting'}
                  >
                    방 만들기
                  </Button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔑 방 참가
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="코드 입력"
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-amber-400 focus:outline-none"
                    />
                    <Button onClick={() => joinRoom(joinCode)} disabled={!joinCode.trim()}>
                      참가
                    </Button>
                  </div>
                </div>

                {connectionError && (
                  <div className="text-sm text-red-600">{connectionError}</div>
                )}
              </>
            )}

            {roomInfo && (
              <>
                <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>방 코드</span>
                    <span className="font-bold text-amber-700">{roomInfo.code}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {connectionStatus === 'connected' ? '연결됨' : '연결 중...'}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🧑‍🤝‍🧑 좌석 선택
                  </label>
                  <div className="space-y-2">
                    {roomInfo.seats.map((seat) => (
                      <div
                        key={seat.index}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg border',
                          seat.index === seatIndex && 'border-amber-400 bg-amber-50',
                          seat.reserved && !seat.occupied && 'opacity-70 border-dashed'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded-full shadow"
                            style={{ backgroundColor: seat.color }}
                          />
                          <div className="text-sm">
                            좌석 {seat.index + 1}
                            <span className="ml-2 text-gray-500">
                              {seat.name ? seat.name : seat.reserved ? '복구 대기' : '빈 자리'}
                            </span>
                            {seat.reserved && !seat.occupied && (
                              <span className="ml-2 text-xs text-amber-600">복구 대기</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={seat.index === seatIndex ? 'secondary' : 'ghost'}
                          onClick={() => selectSeat(seat.index, onlineName)}
                          disabled={
                            seat.index !== seatIndex && (seat.occupied || seat.reserved)
                          }
                        >
                          {seat.index === seatIndex
                            ? '선택됨'
                            : seat.occupied
                              ? '사용 중'
                              : seat.reserved
                                ? '복구 대기'
                                : '선택'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {connectionError && (
                  <div className="text-sm text-red-600 mb-3">{connectionError}</div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={startOnlineGame}
                    className="flex-1"
                    disabled={!canStart}
                  >
                    🎮 게임 시작
                  </Button>
                  <Button variant="ghost" onClick={leaveRoom}>
                    나가기
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
