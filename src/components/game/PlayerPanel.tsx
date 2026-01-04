'use client';

import { cn } from '@/lib/utils';
import type { Player } from '@/types/player';
import { Badge } from '../ui/Badge';

interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer?: boolean;
  compact?: boolean;
}

export function PlayerPanel({ player, isCurrentPlayer = false, compact = false }: PlayerPanelProps) {
  const handCount = player.handSize ?? player.hand.length;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1 md:py-2 rounded-lg transition-all',
          isCurrentPlayer ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-white/80',
          player.isEliminated && 'opacity-50 grayscale'
        )}
        >
        <div
          className="w-3 h-3 md:w-4 md:h-4 rounded-full shadow"
          style={{ backgroundColor: player.color }}
        />
        <span className="font-medium text-xs md:text-sm">{player.name.charAt(0)}</span>
        <span className="text-[10px] md:text-xs text-gray-500">🏰{player.territories.length}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 rounded-xl shadow-lg transition-all',
        isCurrentPlayer ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-white',
        player.isEliminated && 'opacity-50 grayscale'
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: player.color }}
          >
            {player.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold">{player.name}</div>
            {isCurrentPlayer && (
              <Badge variant="warning" size="sm">
                현재 턴
              </Badge>
            )}
          </div>
        </div>
        {player.isEliminated && (
          <Badge variant="danger">탈락</Badge>
        )}
      </div>

      {/* 상태 정보 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1">
          <span>🃏</span>
          <span>손패: {handCount}장</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🏰</span>
          <span>영토: {player.territories.length}개</span>
        </div>
        <div className="flex items-center gap-1">
          <span>⚡</span>
          <span>행동력: {player.actions}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💰</span>
          <span>병력: {player.resources}</span>
        </div>
      </div>

      {/* 동맹 표시 */}
      {player.alliances.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-xs text-gray-500">🤝 동맹: {player.alliances.length}명</span>
        </div>
      )}
    </div>
  );
}
