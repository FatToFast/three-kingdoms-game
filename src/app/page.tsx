'use client';

import { GameLobby } from '@/components/game/GameLobby';
import { GameBoard } from '@/components/game/GameBoard';
import { useGameStore } from '@/stores/gameStore';

export default function Home() {
  const { gameState } = useGameStore();

  // 게임이 시작되지 않았으면 로비 표시
  if (!gameState) {
    return <GameLobby />;
  }

  // 게임 진행 중이면 게임 보드 표시
  return <GameBoard />;
}
