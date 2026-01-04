'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GameLogEntry } from '@/types/game';
import type { Player } from '@/types/player';

interface GameLogProps {
  logs: GameLogEntry[];
  players: Player[];
  className?: string;
}

export function GameLog({ logs, players, className }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 새 로그가 추가되면 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const getPlayerInfo = (playerId: string) => {
    if (playerId === 'system') {
      return { name: '시스템', color: '#6B7280' };
    }
    const player = players.find((p) => p.id === playerId);
    return player ? { name: player.name, color: player.color } : { name: '???', color: '#6B7280' };
  };

  return (
    <div className={cn('flex flex-col bg-white rounded-lg shadow min-h-0', className)}>
      <div className="px-4 py-2 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
        <h3 className="font-bold text-sm">📜 게임 로그</h3>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0"
      >
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            아직 기록이 없습니다.
          </p>
        ) : (
          logs.map((log) => {
            const { name, color } = getPlayerInfo(log.playerId);

            return (
              <div
                key={log.id}
                className="text-xs py-1 px-2 rounded hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400 mr-1">턴{log.turn}</span>
                <span
                  className="font-medium mr-1"
                  style={{ color: color }}
                >
                  {name}:
                </span>
                <span className="text-gray-700">{log.action}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
