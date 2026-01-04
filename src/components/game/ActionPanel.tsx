'use client';

import { Button } from '../ui/Button';
import { useGameStore } from '@/stores/gameStore';
import type { Player } from '@/types/player';
import { MAX_HAND_SIZE } from '@/types/player';
import type { TurnPhase } from '@/types/game';

interface ActionPanelProps {
  player: Player | null;
  phase: TurnPhase;
  isMyTurn: boolean;
}

export function ActionPanel({ player, phase, isMyTurn }: ActionPanelProps) {
  const {
    selectedCardIds,
    selectedTerritoryId,
    selectedTacticianTargetId,
    gameState,
    drawCards,
    endTurn,
    attack,
    playCard,
    deployGeneral,
    discardCard,
    clearSelectedCards,
    getAttackableTerritories,
  } = useGameStore();

  if (!player || !gameState) return null;

  const attackableTerritories = getAttackableTerritories();

  const selectedCards = player.hand.filter((c) => selectedCardIds.includes(c.instanceId));
  const selectedAttackCards = selectedCards.filter((c) => c.type !== 'tactician');
  const selectedTactician = selectedCards.find((c) => c.type === 'tactician');
  const tacticianTargetCard =
    selectedCards.find((c) => c.instanceId === selectedTacticianTargetId) || null;
  const tacticianNeedsTarget = !!selectedTactician && !tacticianTargetCard;

  const canAttack =
    selectedAttackCards.length > 0 &&
    selectedTerritoryId &&
    attackableTerritories.includes(selectedTerritoryId) &&
    player.actions > 0 &&
    !tacticianNeedsTarget;

  const hasGeneralSelected = selectedCards.some((c) => c.type === 'general');
  const hasStrategySelected = selectedCards.some((c) => c.type === 'strategy' || c.type === 'resource');

  if (!isMyTurn) {
    return (
      <div className="p-2 md:p-4 bg-white border-t">
        <p className="text-xs md:text-sm text-gray-600">상대 턴</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t flex-shrink-0 flex flex-col max-h-40 lg:max-h-56">
      {/* 상단: 행동력 표시 */}
      <div className="px-2 md:px-4 py-1 text-xs md:text-sm text-gray-600 flex-shrink-0 border-b flex items-center justify-between">
        <div>
          <span className="font-medium">⚡</span>
          <span className="text-amber-600 font-bold ml-1">{player.actions}</span>/3
        </div>
        {/* 모바일에서 턴 종료 버튼을 상단에 표시 */}
        <Button onClick={endTurn} variant="ghost" className="lg:hidden py-0.5 px-2 text-xs">
          턴 종료
        </Button>
      </div>

      {/* 페이즈별 액션 */}
      {phase === 'draw' && (
        <div className="px-2 md:px-4 py-2 md:py-3">
          <Button onClick={drawCards} className="w-full py-1.5 md:py-2 text-sm">
            🎴 카드 뽑기
          </Button>
        </div>
      )}

      {phase === 'action' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* 선택 정보 - 모바일에서 간소화 */}
          {(selectedCardIds.length > 0 || selectedTerritoryId) && (
            <div className="flex-shrink-0 px-2 md:px-4 py-1 md:py-2 text-[10px] md:text-xs bg-gray-50 border-b space-y-0.5 md:space-y-1 max-h-12 md:max-h-16 overflow-y-auto">
              {selectedCardIds.length > 0 && (
                <div className="flex items-center justify-between gap-1 md:gap-2">
                  <span className="truncate">
                    🃏 {selectedCards.map((c) => c.nameKo).join(', ')}
                  </span>
                  <button
                    onClick={clearSelectedCards}
                    className="text-red-500 hover:underline flex-shrink-0 text-[10px] md:text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              {selectedTactician && tacticianNeedsTarget && (
                <div className="text-red-500">⚠️ 책사 대상 선택</div>
              )}
              {selectedTerritoryId && (() => {
                const territory = gameState.territories.find((t) => t.id === selectedTerritoryId);
                if (!territory) return null;
                const garrisonDefense = territory.garrison.reduce((sum, g) => sum + g.defense, 0);
                const totalDefense = territory.defenseBonus + garrisonDefense;
                return (
                  <div className="flex items-center gap-1 md:gap-2">
                    <span>🏰 {territory.nameKo}</span>
                    <span className="text-blue-600">🛡️{totalDefense}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex-shrink-0 px-2 md:px-4 py-1.5 md:py-2">
            {/* 모바일: 가로 배치 / 데스크톱: 기존 레이아웃 */}
            <div className="flex gap-1.5 md:gap-2">
              {/* 공격 버튼 */}
              <Button
                onClick={attack}
                disabled={!canAttack}
                variant={canAttack ? 'danger' : 'secondary'}
                className="flex-1 py-1 md:py-1.5 text-xs md:text-sm"
              >
                ⚔️
              </Button>

              {hasGeneralSelected && selectedCardIds.length === 1 && (
                <Button
                  onClick={() => {
                    const myTerritory = player.territories[0];
                    if (myTerritory) deployGeneral(myTerritory);
                  }}
                  variant="secondary"
                  className="flex-1 py-1 md:py-1.5 text-xs md:text-sm"
                  disabled={player.actions <= 0}
                >
                  🛡️
                </Button>
              )}

              {hasStrategySelected && selectedCardIds.length === 1 && (
                <Button
                  onClick={() => playCard()}
                  variant="secondary"
                  className="flex-1 py-1 md:py-1.5 text-xs md:text-sm"
                  disabled={player.actions <= 0}
                >
                  📜
                </Button>
              )}

              {/* 턴 종료 - 데스크톱에서만 */}
              <Button onClick={endTurn} variant="ghost" className="hidden lg:flex flex-1 py-1.5 text-sm">
                턴 종료
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'discard' && (() => {
        const cardsToDiscard = player.hand.length - MAX_HAND_SIZE;
        const canDiscard = selectedCardIds.length > 0 && selectedCardIds.length <= cardsToDiscard;

        const handleDiscard = () => {
          // 선택된 카드들을 하나씩 버리기
          selectedCardIds.forEach((cardId) => {
            discardCard(cardId);
          });
          clearSelectedCards();
        };

        return (
          <div className="px-2 md:px-4 py-2 md:py-3 space-y-2">
            <p className="text-xs md:text-sm text-red-600">
              ⚠️ 손패 초과! {cardsToDiscard}장 버리기 (선택: {selectedCardIds.length}장)
            </p>
            {selectedCardIds.length > 0 && (
              <div className="text-[10px] md:text-xs text-gray-600 truncate">
                🃏 {selectedCards.map((c) => c.nameKo).join(', ')}
              </div>
            )}
            <Button
              onClick={handleDiscard}
              disabled={!canDiscard}
              variant={canDiscard ? 'danger' : 'secondary'}
              className="w-full py-1.5 md:py-2 text-xs md:text-sm"
            >
              🗑️ 선택 카드 버리기
            </Button>
          </div>
        );
      })()}
    </div>
  );
}
