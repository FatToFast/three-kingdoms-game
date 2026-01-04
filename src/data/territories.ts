// 영토 데이터 - 삼국지14 기준 46개 도시

import type { Territory, TerritoryConnection } from '@/types/territory';

// 지역(주) 정의
export type Region = 'hebei' | 'zhongyuan' | 'xibei' | 'jiangnan' | 'jingxiang' | 'yizhou' | 'jiaozhi';

export const regionNames: Record<Region, { name: string; nameKo: string }> = {
  hebei: { name: 'Hebei', nameKo: '하북' },
  zhongyuan: { name: 'Zhongyuan', nameKo: '중원' },
  xibei: { name: 'Xibei', nameKo: '서북' },
  jiangnan: { name: 'Jiangnan', nameKo: '강남' },
  jingxiang: { name: 'Jingxiang', nameKo: '형상' },
  yizhou: { name: 'Yizhou', nameKo: '익주' },
  jiaozhi: { name: 'Jiaozhi', nameKo: '교지' },
};

export const initialTerritories: (Omit<Territory, 'owner' | 'garrison'> & { region: Region })[] = [
  // ===== 하북(河北) 지역 - 7개 도시 =====
  {
    id: 'jibei',
    name: 'Jibei',
    nameKo: '계북',
    region: 'hebei',
    value: 2,
    position: { x: 380, y: 30 },
    adjacentTo: ['beiping', 'nanpi', 'dai'],
    defenseBonus: 1,
  },
  {
    id: 'beiping',
    name: 'Beiping',
    nameKo: '북평',
    region: 'hebei',
    value: 2,
    position: { x: 450, y: 50 },
    adjacentTo: ['jibei', 'liaodong', 'nanpi'],
    defenseBonus: 2, // 요새
  },
  {
    id: 'liaodong',
    name: 'Liaodong',
    nameKo: '요동',
    region: 'hebei',
    value: 1,
    position: { x: 550, y: 30 },
    adjacentTo: ['beiping'],
    defenseBonus: 2, // 변방
  },
  {
    id: 'nanpi',
    name: 'Nanpi',
    nameKo: '남피',
    region: 'hebei',
    value: 2,
    position: { x: 400, y: 90 },
    adjacentTo: ['jibei', 'beiping', 'ye', 'pingyuan'],
    defenseBonus: 0,
  },
  {
    id: 'dai',
    name: 'Dai',
    nameKo: '대',
    region: 'hebei',
    value: 1,
    position: { x: 300, y: 50 },
    adjacentTo: ['jibei', 'jinyang', 'ye'],
    defenseBonus: 1,
  },
  {
    id: 'ye',
    name: 'Ye',
    nameKo: '업',
    region: 'hebei',
    value: 3,
    position: { x: 350, y: 130 },
    adjacentTo: ['dai', 'nanpi', 'pingyuan', 'jinyang', 'luoyang'],
    defenseBonus: 2, // 위나라 수도급
  },
  {
    id: 'pingyuan',
    name: 'Pingyuan',
    nameKo: '평원',
    region: 'hebei',
    value: 2,
    position: { x: 430, y: 140 },
    adjacentTo: ['nanpi', 'ye', 'beihai'],
    defenseBonus: 0,
  },

  // ===== 중원(中原) 지역 - 8개 도시 =====
  {
    id: 'luoyang',
    name: 'Luoyang',
    nameKo: '낙양',
    region: 'zhongyuan',
    value: 3,
    position: { x: 280, y: 200 },
    adjacentTo: ['ye', 'jinyang', 'changan', 'wancheng', 'xuchang', 'puyang'],
    defenseBonus: 2, // 수도
  },
  {
    id: 'xuchang',
    name: 'Xuchang',
    nameKo: '허창',
    region: 'zhongyuan',
    value: 3,
    position: { x: 350, y: 230 },
    adjacentTo: ['luoyang', 'puyang', 'chenliu', 'runan', 'wancheng'],
    defenseBonus: 2, // 조조의 거점
  },
  {
    id: 'puyang',
    name: 'Puyang',
    nameKo: '복양',
    region: 'zhongyuan',
    value: 2,
    position: { x: 400, y: 180 },
    adjacentTo: ['ye', 'pingyuan', 'beihai', 'chenliu', 'xuchang', 'luoyang'],
    defenseBonus: 0,
  },
  {
    id: 'chenliu',
    name: 'Chenliu',
    nameKo: '진류',
    region: 'zhongyuan',
    value: 2,
    position: { x: 420, y: 230 },
    adjacentTo: ['puyang', 'beihai', 'xiapi', 'runan', 'xuchang'],
    defenseBonus: 0,
  },
  {
    id: 'beihai',
    name: 'Beihai',
    nameKo: '북해',
    region: 'zhongyuan',
    value: 2,
    position: { x: 490, y: 160 },
    adjacentTo: ['pingyuan', 'puyang', 'chenliu', 'xiapi'],
    defenseBonus: 0,
  },
  {
    id: 'xiapi',
    name: 'Xiapi',
    nameKo: '하비',
    region: 'zhongyuan',
    value: 2,
    position: { x: 480, y: 240 },
    adjacentTo: ['beihai', 'chenliu', 'runan', 'shouchun', 'guangling'],
    defenseBonus: 1,
  },
  {
    id: 'runan',
    name: 'Runan',
    nameKo: '여남',
    region: 'zhongyuan',
    value: 2,
    position: { x: 400, y: 290 },
    adjacentTo: ['xuchang', 'chenliu', 'xiapi', 'shouchun', 'wancheng', 'xinye'],
    defenseBonus: 0,
  },
  {
    id: 'wancheng',
    name: 'Wancheng',
    nameKo: '완',
    region: 'zhongyuan',
    value: 2,
    position: { x: 310, y: 280 },
    adjacentTo: ['luoyang', 'xuchang', 'runan', 'xinye', 'shangyong'],
    defenseBonus: 1,
  },

  // ===== 서북(西北) 지역 - 6개 도시 =====
  {
    id: 'jinyang',
    name: 'Jinyang',
    nameKo: '진양',
    region: 'xibei',
    value: 2,
    position: { x: 230, y: 100 },
    adjacentTo: ['dai', 'ye', 'luoyang', 'changan', 'anding'],
    defenseBonus: 2, // 산악
  },
  {
    id: 'changan',
    name: "Chang'an",
    nameKo: '장안',
    region: 'xibei',
    value: 3,
    position: { x: 180, y: 180 },
    adjacentTo: ['jinyang', 'luoyang', 'anding', 'tianshui', 'hanzhong'],
    defenseBonus: 2, // 옛 수도
  },
  {
    id: 'anding',
    name: 'Anding',
    nameKo: '안정',
    region: 'xibei',
    value: 1,
    position: { x: 130, y: 120 },
    adjacentTo: ['jinyang', 'changan', 'tianshui', 'wuwei'],
    defenseBonus: 1,
  },
  {
    id: 'tianshui',
    name: 'Tianshui',
    nameKo: '천수',
    region: 'xibei',
    value: 2,
    position: { x: 100, y: 180 },
    adjacentTo: ['anding', 'changan', 'hanzhong', 'wuwei'],
    defenseBonus: 1,
  },
  {
    id: 'wuwei',
    name: 'Wuwei',
    nameKo: '무위',
    region: 'xibei',
    value: 1,
    position: { x: 50, y: 100 },
    adjacentTo: ['anding', 'tianshui'],
    defenseBonus: 2, // 변방
  },
  {
    id: 'hanzhong',
    name: 'Hanzhong',
    nameKo: '한중',
    region: 'xibei',
    value: 2,
    position: { x: 150, y: 260 },
    adjacentTo: ['changan', 'tianshui', 'shangyong', 'zitong'],
    defenseBonus: 3, // 천험의 요새
  },

  // ===== 강남(江南) 지역 - 8개 도시 =====
  {
    id: 'shouchun',
    name: 'Shouchun',
    nameKo: '수춘',
    region: 'jiangnan',
    value: 2,
    position: { x: 450, y: 320 },
    adjacentTo: ['runan', 'xiapi', 'guangling', 'lujiang', 'xinye'],
    defenseBonus: 1,
  },
  {
    id: 'guangling',
    name: 'Guangling',
    nameKo: '광릉',
    region: 'jiangnan',
    value: 2,
    position: { x: 520, y: 290 },
    adjacentTo: ['xiapi', 'shouchun', 'jianye', 'wujun'],
    defenseBonus: 0,
  },
  {
    id: 'lujiang',
    name: 'Lujiang',
    nameKo: '노강',
    region: 'jiangnan',
    value: 2,
    position: { x: 420, y: 370 },
    adjacentTo: ['shouchun', 'jianye', 'chaisang', 'xinye'],
    defenseBonus: 0,
  },
  {
    id: 'jianye',
    name: 'Jianye',
    nameKo: '건업',
    region: 'jiangnan',
    value: 3,
    position: { x: 490, y: 360 },
    adjacentTo: ['guangling', 'lujiang', 'wujun', 'chaisang', 'kuaiji'],
    defenseBonus: 2, // 오나라 수도
  },
  {
    id: 'wujun',
    name: 'Wujun',
    nameKo: '오군',
    region: 'jiangnan',
    value: 2,
    position: { x: 550, y: 380 },
    adjacentTo: ['guangling', 'jianye', 'kuaiji'],
    defenseBonus: 1,
  },
  {
    id: 'kuaiji',
    name: 'Kuaiji',
    nameKo: '회계',
    region: 'jiangnan',
    value: 2,
    position: { x: 560, y: 440 },
    adjacentTo: ['jianye', 'wujun', 'poyang'],
    defenseBonus: 1,
  },
  {
    id: 'chaisang',
    name: 'Chaisang',
    nameKo: '시상',
    region: 'jiangnan',
    value: 2,
    position: { x: 400, y: 420 },
    adjacentTo: ['lujiang', 'jianye', 'poyang', 'changsha'],
    defenseBonus: 1, // 적벽 근처
  },
  {
    id: 'poyang',
    name: 'Poyang',
    nameKo: '파양',
    region: 'jiangnan',
    value: 1,
    position: { x: 470, y: 460 },
    adjacentTo: ['kuaiji', 'chaisang', 'changsha', 'jiaozhi_city'],
    defenseBonus: 0,
  },

  // ===== 형상(荊襄) 지역 - 7개 도시 =====
  {
    id: 'xinye',
    name: 'Xinye',
    nameKo: '신야',
    region: 'jingxiang',
    value: 1,
    position: { x: 330, y: 340 },
    adjacentTo: ['wancheng', 'runan', 'shouchun', 'lujiang', 'xiangyang'],
    defenseBonus: 0,
  },
  {
    id: 'shangyong',
    name: 'Shangyong',
    nameKo: '상용',
    region: 'jingxiang',
    value: 1,
    position: { x: 220, y: 300 },
    adjacentTo: ['wancheng', 'hanzhong', 'xiangyang', 'zitong'],
    defenseBonus: 2, // 산악
  },
  {
    id: 'xiangyang',
    name: 'Xiangyang',
    nameKo: '양양',
    region: 'jingxiang',
    value: 2,
    position: { x: 280, y: 370 },
    adjacentTo: ['xinye', 'shangyong', 'jiangling', 'changsha'],
    defenseBonus: 2, // 요충지
  },
  {
    id: 'jiangling',
    name: 'Jiangling',
    nameKo: '강릉',
    region: 'jingxiang',
    value: 2,
    position: { x: 300, y: 420 },
    adjacentTo: ['xiangyang', 'changsha', 'wuling', 'yong_an'],
    defenseBonus: 1,
  },
  {
    id: 'changsha',
    name: 'Changsha',
    nameKo: '장사',
    region: 'jingxiang',
    value: 2,
    position: { x: 360, y: 470 },
    adjacentTo: ['xiangyang', 'jiangling', 'chaisang', 'poyang', 'lingling', 'guiyang'],
    defenseBonus: 0,
  },
  {
    id: 'lingling',
    name: 'Lingling',
    nameKo: '영릉',
    region: 'jingxiang',
    value: 1,
    position: { x: 320, y: 520 },
    adjacentTo: ['changsha', 'wuling', 'guiyang'],
    defenseBonus: 0,
  },
  {
    id: 'guiyang',
    name: 'Guiyang',
    nameKo: '계양',
    region: 'jingxiang',
    value: 1,
    position: { x: 400, y: 540 },
    adjacentTo: ['changsha', 'lingling', 'jiaozhi_city'],
    defenseBonus: 0,
  },

  // ===== 익주(益州) 지역 - 7개 도시 =====
  {
    id: 'zitong',
    name: 'Zitong',
    nameKo: '자동',
    region: 'yizhou',
    value: 2,
    position: { x: 140, y: 340 },
    adjacentTo: ['hanzhong', 'shangyong', 'chengdu', 'jiameng'],
    defenseBonus: 2, // 검각
  },
  {
    id: 'jiameng',
    name: 'Jiameng',
    nameKo: '가맹관',
    region: 'yizhou',
    value: 1,
    position: { x: 100, y: 300 },
    adjacentTo: ['zitong', 'chengdu'],
    defenseBonus: 3, // 천험의 요새
  },
  {
    id: 'chengdu',
    name: 'Chengdu',
    nameKo: '성도',
    region: 'yizhou',
    value: 3,
    position: { x: 120, y: 380 },
    adjacentTo: ['zitong', 'jiameng', 'jiangzhou', 'yong_an'],
    defenseBonus: 2, // 촉한 수도
  },
  {
    id: 'jiangzhou',
    name: 'Jiangzhou',
    nameKo: '강주',
    region: 'yizhou',
    value: 2,
    position: { x: 180, y: 430 },
    adjacentTo: ['chengdu', 'yong_an', 'nanzhong'],
    defenseBonus: 1,
  },
  {
    id: 'yong_an',
    name: 'Yong An',
    nameKo: '영안',
    region: 'yizhou',
    value: 2,
    position: { x: 230, y: 450 },
    adjacentTo: ['chengdu', 'jiangzhou', 'jiangling', 'wuling'],
    defenseBonus: 2, // 백제성
  },
  {
    id: 'wuling',
    name: 'Wuling',
    nameKo: '무릉',
    region: 'yizhou',
    value: 1,
    position: { x: 270, y: 500 },
    adjacentTo: ['yong_an', 'jiangling', 'lingling', 'nanzhong'],
    defenseBonus: 1,
  },
  {
    id: 'nanzhong',
    name: 'Nanzhong',
    nameKo: '남중',
    region: 'yizhou',
    value: 1,
    position: { x: 140, y: 500 },
    adjacentTo: ['jiangzhou', 'wuling', 'jiaozhi_city', 'rinan'],
    defenseBonus: 2, // 오지
  },

  // ===== 교지(交趾) 지역 - 3개 도시 =====
  {
    id: 'jiaozhi_city',
    name: 'Jiaozhi',
    nameKo: '교지',
    region: 'jiaozhi',
    value: 1,
    position: { x: 280, y: 580 },
    adjacentTo: ['nanzhong', 'guiyang', 'poyang', 'nanhai', 'rinan'],
    defenseBonus: 1,
  },
  {
    id: 'nanhai',
    name: 'Nanhai',
    nameKo: '남해',
    region: 'jiaozhi',
    value: 1,
    position: { x: 420, y: 600 },
    adjacentTo: ['jiaozhi_city'],
    defenseBonus: 0,
  },
  {
    id: 'rinan',
    name: 'Rinan',
    nameKo: '일남',
    region: 'jiaozhi',
    value: 1,
    position: { x: 200, y: 600 },
    adjacentTo: ['nanzhong', 'jiaozhi_city'],
    defenseBonus: 0,
  },
];

// 영토 연결선 (지도 렌더링용) - 자동 생성
export const territoryConnections: TerritoryConnection[] = (() => {
  const connections: TerritoryConnection[] = [];
  const added = new Set<string>();

  initialTerritories.forEach(territory => {
    territory.adjacentTo.forEach(adjId => {
      const key = [territory.id, adjId].sort().join('-');
      if (!added.has(key)) {
        added.add(key);
        connections.push({ from: territory.id, to: adjId });
      }
    });
  });

  return connections;
})();

// 지역별 색상
export const regionColors: Record<Region, string> = {
  hebei: '#3B82F6',     // 파랑 - 하북
  zhongyuan: '#FFD700', // 금색 - 중원
  xibei: '#9333EA',     // 보라 - 서북
  jiangnan: '#EF4444',  // 빨강 - 강남
  jingxiang: '#22C55E', // 초록 - 형상
  yizhou: '#14B8A6',    // 청록 - 익주
  jiaozhi: '#F97316',   // 주황 - 교지
};

// 영토 색상 (지역 기반)
export const territoryColors: Record<string, string> = Object.fromEntries(
  initialTerritories.map(t => [t.id, regionColors[t.region]])
);

// 주요 도시 (수도급)
export const majorCities = ['luoyang', 'xuchang', 'ye', 'changan', 'jianye', 'chengdu', 'xiangyang'];

// 승리 조건: 전체 지도 장악 (46개 도시 전부 점령)
export const TOTAL_TERRITORIES = 46;
export const VICTORY_TERRITORIES_46 = TOTAL_TERRITORIES; // 전체 영토 점령
export const VICTORY_VALUE_46 = 999; // 가치 기준 승리 비활성화 (전체 점령만 유효)

// 승리 확정에 필요한 유지 턴 수 (선두 가속 방지)
// 승리 조건 달성 후 이 턴 수만큼 유지해야 승리 확정
export const VICTORY_CONFIRMATION_TURNS = 1;

// 플레이어 시작 위치 - 서로 최대한 멀리 떨어진 전략적 위치
// 2인: 대각선 반대편 (요동-남해)
// 3인: 삼각형 배치 (요동-성도-회계)
// 4인: 사각형 배치 (요동-무위-남해-회계)
export const STARTING_POSITIONS: Record<number, string[]> = {
  2: ['liaodong', 'nanhai'],           // 요동(동북 끝) vs 남해(남쪽 끝)
  3: ['liaodong', 'chengdu', 'kuaiji'], // 요동(동북) vs 성도(서남) vs 회계(동남)
  4: ['liaodong', 'wuwei', 'nanhai', 'kuaiji'], // 요동(동북) vs 무위(서북) vs 남해(남) vs 회계(동남)
};

// ===== 영토 보너스 시스템 =====

// 영토 수에 따른 카드 드로우 보너스 (5개마다 +1장)
export const TERRITORY_DRAW_BONUS_THRESHOLD = 5;

// 영토 수에 따른 추가 행동력 (10개마다 +1)
export const TERRITORY_ACTION_BONUS_THRESHOLD = 10;

// ===== 보너스 상한 (선두 가속 방지) =====
export const BONUS_CAPS = {
  DRAW: 2, // 영토 수 기반 카드 보너스 상한
  ACTION: 1, // 영토 수 기반 행동력 보너스 상한
} as const;

// ===== 지역 지배 보너스 체감 =====
// 첫 번째 지역: 100%, 두 번째 이후: 50%
export const REGION_BONUS_DIMINISHING_RATE = 0.5;

// ===== 과확장 페널티 =====
export const OVEREXPANSION = {
  THRESHOLD: 16, // 이 영토 수 이상이면 페널티
  PENALTY: { draw: 0, action: -1, description: '과확장: 행동력 -1 (영토 16개 이상)' },
} as const;

// 지역별 영토 목록 (지역 지배 보너스용)
export const REGION_TERRITORIES: Record<Region, string[]> = {
  hebei: ['jibei', 'beiping', 'liaodong', 'nanpi', 'dai', 'ye', 'pingyuan'],
  zhongyuan: ['luoyang', 'xuchang', 'puyang', 'chenliu', 'beihai', 'xiapi', 'runan', 'wancheng'],
  xibei: ['jinyang', 'changan', 'anding', 'tianshui', 'wuwei', 'hanzhong'],
  jiangnan: ['shouchun', 'guangling', 'lujiang', 'jianye', 'wujun', 'kuaiji', 'chaisang', 'poyang'],
  jingxiang: ['xinye', 'shangyong', 'xiangyang', 'jiangling', 'changsha', 'lingling', 'guiyang'],
  yizhou: ['zitong', 'jiameng', 'chengdu', 'jiangzhou', 'yong_an', 'wuling', 'nanzhong'],
  jiaozhi: ['jiaozhi_city', 'nanhai', 'rinan'],
};

// 지역 지배 보너스 (해당 지역 전체 점령 시)
export const REGION_DOMINATION_BONUS: Record<Region, { draw: number; action: number; description: string }> = {
  hebei: { draw: 1, action: 0, description: '하북 지배: 매 턴 카드 +1장' },
  zhongyuan: { draw: 1, action: 1, description: '중원 지배: 매 턴 카드 +1장, 행동력 +1' },
  xibei: { draw: 0, action: 1, description: '서북 지배: 매 턴 행동력 +1' },
  jiangnan: { draw: 2, action: 0, description: '강남 지배: 매 턴 카드 +2장' },
  jingxiang: { draw: 1, action: 1, description: '형상 지배: 매 턴 카드 +1장, 행동력 +1' },
  yizhou: { draw: 0, action: 2, description: '익주 지배: 매 턴 행동력 +2' },
  jiaozhi: { draw: 1, action: 0, description: '교지 지배: 매 턴 카드 +1장' },
};

// ===== 영토 분산 페널티 시스템 =====
// 연결되지 않은 영토 그룹이 있으면 페널티 적용
// 2개 그룹: 카드 -1, 3개 이상: 카드 -1, 행동력 -1

// 분산 페널티 적용 임계값
export const FRAGMENTATION_THRESHOLD = {
  MINOR: 2, // 경미한 분산 (2개 그룹)
  SEVERE: 3, // 심각한 분산 (3개 이상 그룹)
} as const;

export const FRAGMENTATION_PENALTY = {
  [FRAGMENTATION_THRESHOLD.MINOR]: { draw: -1, action: 0, description: '영토 분산: 카드 -1장 (2개 그룹)' },
  [FRAGMENTATION_THRESHOLD.SEVERE]: { draw: -1, action: -1, description: '영토 분산: 카드 -1장, 행동력 -1 (3개+ 그룹)' },
};

// ===== 양방향 인접 관계 맵 (BFS에서 방향성 문제 해결) =====
// adjacentTo 데이터가 비대칭일 수 있으므로, 양방향 연결을 보장하는 맵 생성
export const buildBidirectionalAdjacencyMap = (
  territories: readonly { id: string; adjacentTo: string[] }[]
): Map<string, Set<string>> => {
  const adjacencyMap = new Map<string, Set<string>>();

  // 모든 영토 초기화
  for (const t of territories) {
    adjacencyMap.set(t.id, new Set());
  }

  // 양방향 연결 추가
  for (const t of territories) {
    const neighbors = adjacencyMap.get(t.id)!;
    for (const adjId of t.adjacentTo) {
      neighbors.add(adjId);
      // 역방향도 추가 (비대칭 데이터 보정)
      adjacencyMap.get(adjId)?.add(t.id);
    }
  }

  return adjacencyMap;
};

// 초기 영토 데이터 기반 양방향 인접 맵 (캐시)
export const bidirectionalAdjacencyMap = buildBidirectionalAdjacencyMap(initialTerritories);
