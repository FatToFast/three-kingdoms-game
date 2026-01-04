'use client';

import { useState } from 'react';
import { Territory } from './Territory';
import type { Territory as TerritoryType } from '@/types/territory';
import type { Player } from '@/types/player';
import { territoryConnections, regionColors, regionNames, type Region } from '@/data/territories';

interface TerritoryMapProps {
  territories: TerritoryType[];
  players: Player[];
  selectedTerritoryId: string | null;
  attackableTerritoryIds: string[];
  defendingTerritoryId: string | null;
  onTerritoryClick: (territoryId: string) => void;
}

export function TerritoryMap({
  territories,
  players,
  selectedTerritoryId,
  attackableTerritoryIds,
  defendingTerritoryId,
  onTerritoryClick,
}: TerritoryMapProps) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getOwner = (ownerId: string | null): Player | undefined => {
    return players.find((p) => p.id === ownerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 2));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // 지역 범례 데이터
  const regions: Region[] = ['hebei', 'zhongyuan', 'xibei', 'jiangnan', 'jingxiang', 'yizhou', 'jiaozhi'];

  return (
    <div className="w-full h-full flex flex-col">
      {/* 지도 컨트롤 - 모바일에서 컴팩트 */}
      <div className="flex items-center justify-between px-2 md:px-3 py-1 md:py-2 bg-amber-100 border-b border-amber-300 flex-shrink-0">
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s * 1.2, 2))}
            className="px-1.5 md:px-2 py-0.5 md:py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs md:text-sm"
          >
            +
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s * 0.8, 0.5))}
            className="px-1.5 md:px-2 py-0.5 md:py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs md:text-sm"
          >
            -
          </button>
          <button
            onClick={resetView}
            className="px-1.5 md:px-2 py-0.5 md:py-1 bg-amber-200 hover:bg-amber-300 rounded text-xs md:text-sm"
          >
            ↺
          </button>
          <span className="text-[10px] md:text-xs text-amber-700">{Math.round(scale * 100)}%</span>
        </div>
        <div className="text-xs md:text-sm text-amber-800 font-semibold hidden sm:block">
          삼국지 천하대전
        </div>
      </div>

      {/* 지역 범례 - 모바일에서 숨김 */}
      <div className="hidden md:flex flex-wrap gap-2 px-3 py-1 bg-amber-50 border-b border-amber-200 flex-shrink-0">
        {regions.map((region) => (
          <div key={region} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: regionColors[region] }}
            />
            <span className="text-xs text-gray-600">{regionNames[region].nameKo}</span>
          </div>
        ))}
      </div>

      {/* 지도 영역 */}
      <div
        className="flex-1 overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 rounded-b-xl shadow-inner cursor-grab"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          viewBox="0 0 620 650"
          className="w-full h-full"
          style={{
            transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* 배경 장식 */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D4A373" strokeWidth="0.5" opacity="0.3" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="620" height="650" fill="url(#grid)" />

          {/* 영토 연결선 */}
          <g className="connections">
            {territoryConnections.map(({ from, to }) => {
              const fromTerritory = territories.find((t) => t.id === from);
              const toTerritory = territories.find((t) => t.id === to);
              if (!fromTerritory || !toTerritory) return null;

              return (
                <line
                  key={`${from}-${to}`}
                  x1={fromTerritory.position.x}
                  y1={fromTerritory.position.y}
                  x2={toTerritory.position.x}
                  y2={toTerritory.position.y}
                  stroke="#8B5A2B"
                  strokeWidth="1.5"
                  strokeDasharray="4,2"
                  opacity="0.4"
                />
              );
            })}
          </g>

          {/* 영토들 */}
          <g className="territories">
            {territories.map((territory) => (
              <Territory
                key={territory.id}
                territory={territory}
                owner={getOwner(territory.owner)}
                isSelected={selectedTerritoryId === territory.id}
                isAttackable={attackableTerritoryIds.includes(territory.id)}
                isDefending={defendingTerritoryId === territory.id}
                onClick={() => onTerritoryClick(territory.id)}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
