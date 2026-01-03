'use client';

import { motion } from 'framer-motion';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Card } from './Card';
import { useGameStore } from '@/stores/gameStore';
import type { CombatState } from '@/types/game';

interface BattleDialogProps {
  combat: CombatState | null;
  onClose: () => void;
}

export function BattleDialog({ combat, onClose }: BattleDialogProps) {
  const {
    gameState,
    selectedCardIds,
    selectCard,
    deselectCard,
    defend,
    skipDefense,
    clearCombat,
    mode,
    playerId,
  } = useGameStore();

  if (!combat || !gameState) return null;

  const attacker = gameState.players.find((p) => p.id === combat.attackerId);
  const defender = gameState.players.find((p) => p.id === combat.defenderId);
  const territory = gameState.territories.find((t) => t.id === combat.targetTerritoryId);
  const tacticianTargetCard = combat.tacticianTargetInstanceId
    ? combat.attackCards.find((card) => card.instanceId === combat.tacticianTargetInstanceId)
    : null;

  const isDefending = combat.phase === 'defending';
  const isResolved = combat.phase === 'resolved';
  const isMyDefense =
    isDefending && (mode === 'online' ? defender?.id === playerId : true);

  const handleCardClick = (cardId: string) => {
    if (selectedCardIds.includes(cardId)) {
      deselectCard(cardId);
    } else {
      selectCard(cardId);
    }
  };

  const handleDefend = () => {
    defend();
  };

  const handleSkip = () => {
    skipDefense();
  };

  const handleClose = () => {
    clearCombat();
    onClose();
  };

  return (
    <Dialog isOpen={!!combat} onClose={handleClose} title="⚔️ 전투!" size="lg">
      <div className="space-y-4">
        {/* 전투 정보 */}
        <div className="text-center text-lg font-bold text-gray-800">
          <span style={{ color: attacker?.color }}>{attacker?.name}</span>
          <span className="mx-2">→</span>
          <span className="text-amber-600">{territory?.nameKo}</span>
          {defender && (
            <>
              <span className="mx-2">(</span>
              <span style={{ color: defender?.color }}>{defender?.name}</span>
              <span>)</span>
            </>
          )}
        </div>

        {/* 공격 카드 */}
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">⚔️ 공격 카드</h4>
          <div className="flex gap-2 justify-center flex-wrap">
            {combat.attackCards.map((card) => (
              <Card key={card.instanceId} card={card} size="sm" />
            ))}
          </div>
        </div>

        {combat.tacticianCard && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">🧠 책사 카드</h4>
            <div className="flex gap-2 justify-center items-center flex-wrap">
              <Card card={combat.tacticianCard} size="sm" />
              {tacticianTargetCard && (
                <span className="text-xs text-gray-500">
                  → {tacticianTargetCard.nameKo} 강화
                </span>
              )}
            </div>
          </div>
        )}

        {/* 방어 단계 */}
        {isDefending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isMyDefense ? (
              <>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  🛡️ 방어할 카드를 선택하세요!
                </h4>
                <div className="flex gap-2 justify-center flex-wrap mb-4">
                  {defender?.hand.map((card) => (
                    <Card
                      key={card.instanceId}
                      card={card}
                      size="sm"
                      isSelected={selectedCardIds.includes(card.instanceId)}
                      onClick={() => handleCardClick(card.instanceId)}
                    />
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleDefend} disabled={selectedCardIds.length === 0}>
                    🛡️ 방어하기
                  </Button>
                  <Button variant="ghost" onClick={handleSkip}>
                    방어 포기
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">
                  <span style={{ color: defender?.color }}>{defender?.name}</span>
                  님이 방어 중입니다...
                </p>
                <motion.div
                  className="mt-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ⏳
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* 방어 카드 표시 */}
        {combat.defenseCards.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">🛡️ 방어 카드</h4>
            <div className="flex gap-2 justify-center flex-wrap">
              {combat.defenseCards.map((card) => (
                <Card key={card.instanceId} card={card} size="sm" />
              ))}
            </div>
          </div>
        )}

        {/* 전투 결과 */}
        {isResolved && combat.result && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-4"
          >
            <div className="text-4xl mb-2">
              {combat.result.winner === 'attacker' ? '⚔️' : '🛡️'}
            </div>
            <div className="text-2xl font-bold mb-2">
              {combat.result.winner === 'attacker' ? (
                <span className="text-red-600">공격 성공!</span>
              ) : (
                <span className="text-blue-600">방어 성공!</span>
              )}
            </div>
            <div className="text-gray-600">
              공격력 <span className="font-bold text-red-600">{combat.result.attackPower}</span>
              {' vs '}
              방어력 <span className="font-bold text-blue-600">{combat.result.defensePower}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              차이: {combat.result.difference}
            </div>

            <Button onClick={handleClose} className="mt-4">
              확인
            </Button>
          </motion.div>
        )}
      </div>
    </Dialog>
  );
}
