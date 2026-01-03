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

export function Territory({
  territory,
  owner,
  isSelected,
  isAttackable,
  isDefending,
  onClick,
}: TerritoryProps) {
  const baseColor = territoryColors[territory.id];
  const ownerColor = owner?.color || baseColor || '#9CA3AF';

  return (
    <motion.g
      onClick={onClick}
      className="cursor-pointer"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 영토 영역 (원형) - 축소된 크기 */}
      <motion.circle
        cx={territory.position.x}
        cy={territory.position.y}
        r={TERRITORY_RADIUS}
        fill={ownerColor}
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

      {/* 영토 이름 - 축소된 폰트 */}
      <text
        x={territory.position.x}
        y={territory.position.y + 1}
        textAnchor="middle"
        fontSize="8"
        className="fill-white font-bold pointer-events-none select-none"
        style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.7)' }}
      >
        {territory.nameKo}
      </text>

      {/* 영토 가치 표시 - 숫자로 변경 (별 대신) */}
      <text
        x={territory.position.x}
        y={territory.position.y + 12}
        textAnchor="middle"
        fontSize="7"
        className="fill-yellow-300 font-bold pointer-events-none select-none"
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

      {/* 소유자 표시 - 축소 */}
      {owner && (
        <circle
          cx={territory.position.x}
          cy={territory.position.y + 20}
          r={5}
          fill={owner.color}
          stroke="white"
          strokeWidth={1}
        />
      )}
    </motion.g>
  );
}
