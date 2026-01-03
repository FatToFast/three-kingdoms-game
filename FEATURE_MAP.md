# Three Kingdoms Game - Feature Map

## Overview

삼국지 기반 턴제 전략 카드 게임. Next.js 16 + React 19 + Zustand 상태관리로 구현된 브라우저 기반 멀티플레이어 게임.

---

## 1. Core Game Mechanics

### 1.1 Game Flow
| Feature | Status | Location |
|---------|--------|----------|
| 게임 초기화 (2-4인) | ✅ 구현됨 | `engine.ts:15-83` |
| 턴 순환 시스템 | ✅ 구현됨 | `engine.ts:123-167` |
| 페이즈 관리 (Draw → Action → Discard) | ✅ 구현됨 | `engine.ts:111-120` |
| 행동력 시스템 (3 actions/turn) | ✅ 구현됨 | `engine.ts:148` |
| 승리 조건 체크 | ✅ 구현됨 | `engine.ts:466-491` |

### 1.2 Victory Conditions
- **영토 점령**: 15개 이상 영토 확보
- **영토 가치**: 총 가치 25 이상 달성
- **최후 생존**: 다른 플레이어 전원 탈락

---

## 2. Card System

### 2.1 Card Types
| Type | Count | Description |
|------|-------|-------------|
| **General (무장)** | 210장 | 공격/방어력 보유, 영토 배치 가능 (삼국지14 기준 확장) |
| **Strategy (전략)** | 16장 | 전투 보너스, 특수 효과 |
| **Resource (자원)** | 12장 | 병력 증가, 보너스 효과 |
| **Event (이벤트)** | 6장 | 글로벌/개인 효과 |
| **Tactician (군사)** | 8장 | 전투 중 특수 효과 발동 |

### 2.2 General Cards by Faction
| Faction | Count | Notable Characters |
|---------|-------|-------------------|
| **Wei (위)** | 49장 | 조조, 사마의, 장료, 하후돈, 하후연, 순욱, 곽가, 가후, 정욱, 조인 등 |
| **Shu (촉)** | 45장 | 유비, 관우, 장비, 조자룡, 제갈량, 마초, 황충, 위연, 강유, 법정 등 |
| **Wu (오)** | 42장 | 손권, 주유, 육손, 감녕, 태사자, 여몽, 황개, 정보, 노숙, 육항 등 |
| **Neutral (중립)** | 74장 | 여포, 동탁, 원소, 원술, 공손찬, 유표, 장각, 초선, 화타 등 |

### 2.3 Card Rarity
- **Legendary**: 강력한 특수 능력 보유
- **Rare**: 상위 스탯 또는 유용한 능력
- **Common**: 기본 스탯

### 2.4 Card Mechanics
| Feature | Status | Location |
|---------|--------|----------|
| 카드 드로우 | ✅ 구현됨 | `engine.ts:86-108` |
| 카드 버리기 | ✅ 구현됨 | `engine.ts:386-398` |
| 무장 배치 | ✅ 구현됨 | `engine.ts:351-384` |
| 전략/자원 카드 사용 | ✅ 구현됨 | `engine.ts:400-444` |
| 덱 재셔플 | ✅ 구현됨 | `engine.ts:97-103` |

---

## 3. Territory System

### 3.1 Map Structure
| Region | Count | Notable Cities |
|--------|-------|----------------|
| **Hebei (하북)** | 7개 | 업(Ye), 북평, 남피 |
| **Zhongyuan (중원)** | 8개 | 낙양, 허창, 복양 |
| **Xibei (서북)** | 6개 | 장안, 한중, 천수 |
| **Jiangnan (강남)** | 8개 | 건업, 시상, 회계 |
| **Jingxiang (형상)** | 7개 | 양양, 강릉, 장사 |
| **Yizhou (익주)** | 7개 | 성도, 영안, 가맹관 |
| **Jiaozhi (교지)** | 3개 | 교지, 남해, 일남 |

**총 46개 도시**

### 3.2 Territory Properties
- **Value (가치)**: 1-3점, 승리 조건에 영향
- **Defense Bonus (방어 보너스)**: 0-3, 지형에 따른 방어력
- **Adjacency (인접)**: 공격/이동 가능한 연결 영토

### 3.3 Major Cities (수도급)
낙양, 허창, 업, 장안, 건업, 성도, 양양

---

## 4. Combat System

### 4.1 Combat Flow
```
1. 공격자: 인접 적 영토 선택 + 공격 카드 선택
2. 방어자: 방어 카드 선택 (또는 스킵)
3. 전투 해결: 공격력 vs 방어력 비교
4. 결과 처리: 영토 점령 또는 공격 실패
```

### 4.2 Power Calculation
| Feature | Status | Location |
|---------|--------|----------|
| 공격력 계산 | ✅ 구현됨 | `engine.ts:265-270` |
| 방어력 계산 (지형 + 수비대 + 카드) | ✅ 구현됨 | `engine.ts:273-284` |
| 화공 효과 (방어력 감소) | ✅ 구현됨 | `engine.ts:286-289` |
| 전투 결과 처리 | ✅ 구현됨 | `engine.ts:291-341` |

### 4.3 Combat States
- `selecting`: 공격 카드 선택 중
- `defending`: 방어자 응답 대기
- `resolving`: 전투 계산 중
- `resolved`: 결과 표시

---

## 5. UI Components

### 5.1 Core Components
| Component | Purpose | Location |
|-----------|---------|----------|
| `GameBoard` | 메인 게임 화면 | `components/game/GameBoard.tsx` |
| `GameLobby` | 게임 시작 로비 | `components/game/GameLobby.tsx` |
| `TerritoryMap` | 영토 지도 렌더링 | `components/game/TerritoryMap.tsx` |
| `Territory` | 개별 영토 표시 | `components/game/Territory.tsx` |
| `CardHand` | 손패 표시 | `components/game/CardHand.tsx` |
| `Card` | 카드 렌더링 | `components/game/Card.tsx` |
| `PlayerPanel` | 플레이어 정보 | `components/game/PlayerPanel.tsx` |
| `ActionPanel` | 행동 버튼 패널 | `components/game/ActionPanel.tsx` |
| `TurnIndicator` | 턴/페이즈 표시 | `components/game/TurnIndicator.tsx` |
| `GameLog` | 게임 로그 | `components/game/GameLog.tsx` |
| `BattleDialog` | 전투 다이얼로그 | `components/game/BattleDialog.tsx` |
| `VictoryScreen` | 승리 화면 | `components/game/VictoryScreen.tsx` |

### 5.2 UI Components
| Component | Purpose | Location |
|-----------|---------|----------|
| `Button` | 공통 버튼 | `components/ui/Button.tsx` |
| `Badge` | 뱃지/태그 | `components/ui/Badge.tsx` |
| `Dialog` | 모달 다이얼로그 | `components/ui/Dialog.tsx` |

---

## 6. State Management

### 6.1 Game Store (Zustand)
| State | Type | Description |
|-------|------|-------------|
| `gameState` | `GameState \| null` | 전체 게임 상태 |
| `selectedCardIds` | `string[]` | 선택된 카드 ID |
| `selectedTerritoryId` | `string \| null` | 선택된 영토 ID |
| `isLoading` | `boolean` | 로딩 상태 |

### 6.2 Actions
| Action | Description |
|--------|-------------|
| `initGame` | 게임 초기화 |
| `resetGame` | 게임 리셋 |
| `selectCard/deselectCard` | 카드 선택/해제 |
| `selectTerritory` | 영토 선택 |
| `drawCards` | 카드 드로우 |
| `endTurn` | 턴 종료 |
| `attack/defend/skipDefense` | 전투 액션 |
| `deployGeneral` | 무장 배치 |
| `playCard` | 카드 사용 |
| `discardCard` | 카드 버리기 |

---

## 7. Special Abilities (일부 구현됨)

### 7.1 General Abilities
| Character | Ability | Effect |
|-----------|---------|--------|
| 조조 | 간웅의 위엄 | 위 무장 사용시 공격력 +1 |
| 제갈량 | 천기 | 전략 카드 효과 2배 |
| 관우 | 청룡언월도 | 단독 공격 시 공격력 +2 |
| 장비 | 장판교의 호통 | 방어 시 적 1장 무력화 |
| 조자룡 | 장판파 돌파 | 위기 시 회피 가능 |
| 주유 | 화공 대가 | 화공 카드 효과 2배 |
| 여포 | 무쌍방천극 | 공격력이 방어력보다 항상 우선 |

---

## 8. Technology Stack

### 8.1 Frontend
- **Next.js 16.1.1**: App Router
- **React 19.2.3**: UI Framework
- **TypeScript 5**: Type Safety
- **Tailwind CSS 4**: Styling
- **Framer Motion**: Animations

### 8.2 State & Utils
- **Zustand 5**: State Management
- **nanoid**: Unique ID Generation
- **clsx / tailwind-merge**: Class Utilities
- **Lucide React**: Icons

---

## 9. Data Structure

### 9.1 Type Definitions
```
src/types/
├── card.ts      # Card types (General, Strategy, Resource, Event, Tactician)
├── game.ts      # GameState, CombatState, GameConfig
├── player.ts    # Player type
├── territory.ts # Territory type
└── index.ts     # Re-exports
```

### 9.2 Game Data
```
src/data/
├── generals.ts    # 210 general cards (삼국지14 기준)
├── strategies.ts  # 16 strategy cards
├── resources.ts   # 12 resource cards
├── events.ts      # 6 event cards
├── tacticians.ts  # 8 tactician cards
├── territories.ts # 46 territories
└── cards.ts       # Deck utilities
```

---

## 10. Future Improvements (TODO)

### 10.1 Missing Features
| Feature | Priority | Complexity |
|---------|----------|------------|
| AI 플레이어 | High | High |
| 멀티플레이어 (WebSocket) | High | High |
| 특수 능력 완전 구현 | Medium | Medium |
| 사운드/음악 | Low | Low |
| 저장/불러오기 | Medium | Medium |
| 튜토리얼 | Medium | Medium |
| 모바일 최적화 | Medium | Medium |

### 10.2 Balance Adjustments
- 무장 능력치 밸런싱
- 전략 카드 효과 조정
- 영토 방어 보너스 재검토

### 10.3 UI/UX Enhancements
- 영토 연결선 시각화 개선
- 카드 애니메이션 추가
- 전투 연출 강화
- 반응형 디자인 개선

---

## Quick Start

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── game/          # 게임 컴포넌트 (12개)
│   └── ui/            # 공통 UI (3개)
├── data/              # 게임 데이터 (6개)
├── lib/
│   ├── game/
│   │   └── engine.ts  # 게임 엔진 (504줄)
│   └── utils.ts
├── stores/
│   └── gameStore.ts   # Zustand 스토어
└── types/             # TypeScript 타입 (5개)
```

---

*Last Updated: 2026-01-03*
