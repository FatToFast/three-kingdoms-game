'use client';

import { motion } from 'framer-motion';
import type { Territory as TerritoryType } from '@/types/territory';
import type { Player } from '@/types/player';
import { territoryColors } from '@/data/territories';

interface TerritoryProps {
  territory: TerritoryType;
  owner?: Player;
  isSelected: boolean;
  isAttackable: boolean;
  isDefending: boolean;
  onClick: () => void;
}

// 46개 도시에 맞게 크기 조정
const TERRITORY_RADIUS = 22;
const TERRITORY_RADIUS_OUTER = 26;
const OWNER_RING_RADIUS = 28;

export function Territory({
  territory,
  owner,
  isSelected,
  isAttackable,
  isDefending,
  onClick,
}: TerritoryProps) {
  const baseColor = territoryColors[territory.id];
  // 소유자가 있으면 플레이어 색상, 없으면 중립 색상 (빈 영토)
  const NEUTRAL_COLOR = '#D1D5DB'; // 중립 회색
  const fillColor = owner ? owner.color : NEUTRAL_COLOR;

  return (
    <motion.g
      onClick={onClick}
      className="cursor-pointer"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 소유자 외곽 링 (플레이어 색상 강조) */}
      {owner && (
        <circle
          cx={territory.position.x}
          cy={territory.position.y}
          r={OWNER_RING_RADIUS}
          fill="none"
          stroke={owner.color}
          strokeWidth={4}
          opacity={0.8}
        />
      )}

      {/* 영토 영역 (원형) - 축소된 크기 */}
      <motion.circle
        cx={territory.position.x}
        cy={territory.position.y}
        r={TERRITORY_RADIUS}
        fill={fillColor}
        stroke={isSelected ? '#FBBF24' : isAttackable ? '#EF4444' : '#374151'}
        strokeWidth={isSelected || isAttackable ? 3 : 1.5}
        initial={{ scale: 0 }}
        animate={{
          scale: 1,
          filter: isDefending ? 'drop-shadow(0 0 8px #3B82F6)' : 'none',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />

      {/* 공격 가능 표시 (깜빡이는 효과) */}
      {isAttackable && (
        <motion.circle
          cx={territory.position.x}
          cy={territory.position.y}
          r={TERRITORY_RADIUS_OUTER}
          fill="none"
          stroke="#EF4444"
          strokeWidth={1.5}
          strokeDasharray="4,3"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* 영토 이름 - 빈 영토는 어두운 색상으로 가독성 확보 */}
      <text
        x={territory.position.x}
        y={territory.position.y + 1}
        textAnchor="middle"
        fontSize="8"
        className={`font-bold pointer-events-none select-none ${owner ? 'fill-white' : 'fill-gray-700'}`}
        style={{ textShadow: owner ? '1px 1px 1px rgba(0,0,0,0.7)' : '1px 1px 1px rgba(255,255,255,0.5)' }}
      >
        {territory.nameKo}
      </text>

      {/* 영토 가치 표시 - 빈 영토는 어두운 노란색 */}
      <text
        x={territory.position.x}
        y={territory.position.y + 12}
        textAnchor="middle"
        fontSize="7"
        className={`font-bold pointer-events-none select-none ${owner ? 'fill-yellow-300' : 'fill-yellow-600'}`}
      >
        ★{territory.value}
      </text>

      {/* 방어 보너스 표시 - 축소 */}
      {territory.defenseBonus > 0 && (
        <text
          x={territory.position.x + 18}
          y={territory.position.y - 15}
          textAnchor="middle"
          fontSize="7"
          className="fill-blue-200 pointer-events-none select-none"
        >
          🛡{territory.defenseBonus}
        </text>
      )}

      {/* 배치된 무장 표시 - 축소 */}
      {territory.garrison.length > 0 && (
        <g>
          <circle
            cx={territory.position.x - 15}
            cy={territory.position.y - 15}
            r={8}
            fill="#1F2937"
            stroke="#FBBF24"
            strokeWidth={1.5}
          />
          <text
            x={territory.position.x - 15}
            y={territory.position.y - 12}
            textAnchor="middle"
            fontSize="8"
            className="fill-white font-bold pointer-events-none select-none"
          >
            {territory.garrison.length}
          </text>
        </g>
      )}

      {/* 소유자 이니셜 표시 */}
      {owner && (
        <g>
          <circle
            cx={territory.position.x}
            cy={territory.position.y + 22}
            r={7}
            fill={owner.color}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={territory.position.x}
            y={territory.position.y + 25}
            textAnchor="middle"
            fontSize="8"
            className="fill-white font-bold pointer-events-none select-none"
          >
            {owner.name.charAt(0).toUpperCase()}
          </text>
        </g>
      )}
    </motion.g>
  );
}
