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
    <div className="h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-100">
      {/* 상단: 턴 표시 및 다른 플레이어 정보 */}
      <header className="h-20 border-b bg-white/80 backdrop-blur flex items-center justify-between px-6 shadow-sm">
        <TurnIndicator
          turn={gameState.currentTurn}
          phase={gameState.turnPhase}
          currentPlayer={currentPlayer}
        />
        <div className="flex gap-2">
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
      <main className="flex-1 flex overflow-hidden">
        {/* 좌측: 영토 지도 */}
        <section className="flex-1 p-4">
          <TerritoryMap
            territories={gameState.territories}
            players={gameState.players}
            selectedTerritoryId={selectedTerritoryId}
            attackableTerritoryIds={attackableTerritories}
            defendingTerritoryId={gameState.combat?.targetTerritoryId || null}
            onTerritoryClick={handleTerritoryClick}
          />
        </section>

        {/* 우측: 사이드바 */}
        <aside className="w-80 border-l bg-white/80 backdrop-blur flex flex-col shadow-lg">
          {/* 현재 플레이어 정보 */}
          <div className="p-4 border-b">
            <PlayerPanel player={localPlayer || currentPlayer} isCurrentPlayer={isMyTurn} />
          </div>

          {/* 게임 로그 */}
          <GameLog
            logs={gameState.log}
            players={gameState.players}
            className="flex-1 m-4 mt-2"
          />

          {/* 액션 패널 */}
          <ActionPanel
            player={localPlayer}
            phase={gameState.turnPhase}
            isMyTurn={isMyTurn}
          />
        </aside>
      </main>

      {/* 하단: 내 손패 */}
      <footer className="h-52 border-t bg-gradient-to-t from-amber-200 to-amber-100 shadow-inner">
        <CardHand
          cards={localPlayer?.hand || []}
          selectedCardIds={selectedCardIds}
          onCardClick={handleCardClick}
          isMyTurn={isMyTurn}
        />
      </footer>

      {/* 전투 다이얼로그 */}
      <BattleDialog
        combat={gameState.combat}
        onClose={clearCombat}
      />
    </div>
  );
}
