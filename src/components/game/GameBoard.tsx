'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { TerritoryMap } from './TerritoryMap';
import { CardHand } from './CardHand';
import { PlayerPanel } from './PlayerPanel';
import { ActionPanel } from './ActionPanel';
import { TurnIndicator } from './TurnIndicator';
import { GameLog } from './GameLog';
import { BattleDialog } from './BattleDialog';
import { VictoryScreen } from './VictoryScreen';

export function GameBoard() {
  const {
    gameState,
    selectedCardIds,
    selectedTerritoryId,
    selectCard,
    deselectCard,
    selectTerritory,
    getAttackableTerritories,
    clearCombat,
    resetGame,
    mode,
    playerId,
  } = useGameStore();

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;
  const localPlayer =
    gameState && mode === 'online' && playerId
      ? gameState.players.find((player) => player.id === playerId) || null
      : currentPlayer;
  const isMyTurn = currentPlayer
    ? mode === 'online'
      ? currentPlayer.id === playerId
      : currentPlayer.isActive
    : false;

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!currentPlayer) return;
      if (mode === 'online' && !isMyTurn) return;
      if (selectedCardIds.includes(cardId)) {
        deselectCard(cardId);
      } else {
        selectCard(cardId);
      }
    },
    [selectedCardIds, selectCard, deselectCard, mode, isMyTurn, currentPlayer]
  );

  const handleTerritoryClick = useCallback(
    (territoryId: string) => {
      if (!currentPlayer) return;
      if (mode === 'online' && !isMyTurn) return;
      if (selectedTerritoryId === territoryId) {
        selectTerritory(null);
      } else {
        selectTerritory(territoryId);
      }
    },
    [selectedTerritoryId, selectTerritory, mode, isMyTurn, currentPlayer]
  );

  if (!gameState || !currentPlayer) {
    return null;
  }

  const attackableTerritories = getAttackableTerritories();
  const winner = gameState.winner
    ? gameState.players.find((p) => p.id === gameState.winner)
    : null;

  // 승리 화면
  if (winner) {
    return <VictoryScreen winner={winner} onPlayAgain={resetGame} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden">
      {/* 상단: 턴 표시 및 다른 플레이어 정보 */}
      <header className="h-14 md:h-20 border-b bg-white/80 backdrop-blur flex items-center justify-between px-2 md:px-6 shadow-sm flex-shrink-0">
        <TurnIndicator
          turn={gameState.currentTurn}
          phase={gameState.turnPhase}
          currentPlayer={currentPlayer}
        />
        <div className="flex gap-1 md:gap-2">
          {gameState.players
            .filter((p) => p.id !== currentPlayer?.id)
            .map((player) => (
              <PlayerPanel
                key={player.id}
                player={player}
                compact
                isCurrentPlayer={false}
              />
            ))}
        </div>
      </header>

      {/* 중앙: 게임 보드 */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* 영토 지도 - 모바일에서 전체 너비 */}
        <section className="flex-1 p-0.5 md:p-4 min-h-0 overflow-hidden">
          <TerritoryMap
            territories={gameState.territories}
            players={gameState.players}
            selectedTerritoryId={selectedTerritoryId}
            attackableTerritoryIds={attackableTerritories}
            defendingTerritoryId={gameState.combat?.targetTerritoryId || null}
            onTerritoryClick={handleTerritoryClick}
          />
        </section>

        {/* 우측: 사이드바 - 모바일에서 숨김 */}
        <aside className="hidden lg:flex w-80 border-l bg-white/80 backdrop-blur flex-col shadow-lg">
          {/* 현재 플레이어 정보 */}
          <div className="p-4 border-b flex-shrink-0">
            <PlayerPanel player={localPlayer || currentPlayer} isCurrentPlayer={isMyTurn} />
          </div>

          {/* 게임 로그 - 남은 공간 차지하되 overflow 처리 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <GameLog
              logs={gameState.log}
              players={gameState.players}
              className="h-full m-4 mt-2"
            />
          </div>

          {/* 액션 패널 - 항상 하단 고정 */}
          <ActionPanel
            player={localPlayer}
            phase={gameState.turnPhase}
            isMyTurn={isMyTurn}
          />
        </aside>
      </main>

      {/* 하단: 손패 + 모바일 액션 패널 */}
      <footer className="flex-shrink-0 border-t bg-gradient-to-t from-amber-200 to-amber-100 shadow-inner">
        {/* 손패 - 모바일에서 더 축소 */}
        <div className="h-20 md:h-52">
          <CardHand
            cards={localPlayer?.hand || []}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
            isMyTurn={isMyTurn}
          />
        </div>
        {/* 모바일 액션 패널 - 손패 아래에 배치, 컴팩트하게 */}
        <div className="lg:hidden">
          <ActionPanel
            player={localPlayer}
            phase={gameState.turnPhase}
            isMyTurn={isMyTurn}
          />
        </div>
      </footer>

      {/* 전투 다이얼로그 */}
      <BattleDialog
        combat={gameState.combat}
        onClose={clearCombat}
      />
    </div>
  );
}
