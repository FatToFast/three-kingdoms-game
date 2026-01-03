'use client';

import { Button } from '../ui/Button';
import { useGameStore } from '@/stores/gameStore';
import type { Player } from '@/types/player';
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
      <div className="p-4 bg-white border-t">
        <p className="text-sm text-gray-600">상대 턴입니다. 잠시만 기다려주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border-t">
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">행동력: </span>
        <span className="text-amber-600 font-bold">{player.actions}</span> / 3
      </div>

      {/* 페이즈별 액션 */}
      {phase === 'draw' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 mb-2">🎴 카드를 뽑을 차례예요!</p>
          <p className="text-xs text-gray-500">
            무장만 나오면 비무장 카드 1장으로 교체됩니다.
          </p>
          <Button onClick={drawCards} className="w-full">
            카드 2장 뽑기
          </Button>
        </div>
      )}

      {phase === 'action' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 mb-2">
            {player.actions > 0
              ? '⚔️ 행동을 선택하세요!'
              : '행동력을 모두 사용했어요.'}
          </p>

          {/* 선택한 카드/영토 정보 */}
          {selectedCardIds.length > 0 && (
            <div className="text-xs bg-amber-50 p-2 rounded mb-2">
              <span className="font-medium">선택한 카드: </span>
              {selectedCards.map((c) => c.nameKo).join(', ')}
              <button
                onClick={clearSelectedCards}
                className="ml-2 text-red-500 hover:underline"
              >
                취소
              </button>
            </div>
          )}

          {selectedTactician && (
            <div className="text-xs bg-purple-50 p-2 rounded mb-2">
              <span className="font-medium">책사: </span>
              {selectedTactician.nameKo}
              {tacticianTargetCard ? (
                <span className="ml-2 text-gray-600">
                  → {tacticianTargetCard.nameKo} 강화
                </span>
              ) : (
                <span className="ml-2 text-red-500">대상 카드 선택 필요</span>
              )}
            </div>
          )}

          {selectedTerritoryId && (
            <div className="text-xs bg-blue-50 p-2 rounded mb-2">
              <span className="font-medium">선택한 영토: </span>
              {gameState.territories.find((t) => t.id === selectedTerritoryId)?.nameKo}
            </div>
          )}

          {/* 공격 버튼 */}
          <Button
            onClick={attack}
            disabled={!canAttack}
            variant={canAttack ? 'danger' : 'secondary'}
            className="w-full"
          >
            ⚔️ 공격하기
          </Button>

          {/* 무장 배치 */}
          {hasGeneralSelected && selectedCardIds.length === 1 && (
            <Button
              onClick={() => {
                const myTerritory = player.territories[0];
                if (myTerritory) deployGeneral(myTerritory);
              }}
              variant="secondary"
              className="w-full"
              disabled={player.actions <= 0}
            >
              🛡️ 무장 배치
            </Button>
          )}

          {/* 전략/자원 카드 사용 */}
          {hasStrategySelected && selectedCardIds.length === 1 && (
            <Button
              onClick={() => playCard()}
              variant="secondary"
              className="w-full"
              disabled={player.actions <= 0}
            >
              📜 카드 사용
            </Button>
          )}

          {/* 턴 종료 */}
          <Button onClick={endTurn} variant="ghost" className="w-full">
            턴 종료
          </Button>
        </div>
      )}

      {phase === 'discard' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 mb-2">
            ⚠️ 손패가 7장을 초과했어요! 카드를 버려주세요.
          </p>
          <p className="text-xs text-gray-500">
            현재 손패: {player.hand.length}장 (버려야 할 카드: {player.hand.length - 7}장)
          </p>
        </div>
      )}
    </div>
  );
}
