# Three Kingdoms Game - Feature Structure Map

## Overview

삼국지 기반 턴제 전략 카드 게임. 로컬/온라인(소켓) 모드를 모두 지원하며, 핵심 룰은 `GameEngine`에 집중되어 있습니다.

---

## 1. App Entry & Layout

| Feature | Description | Location |
| --- | --- | --- |
| App 루트 레이아웃 | 전역 레이아웃 및 메타데이터 | `src/app/layout.tsx` |
| 초기 화면 분기 | 게임 미시작 시 로비, 시작 후 보드 | `src/app/page.tsx` |
| 전역 스타일 | Tailwind 기반 전역 스타일 | `src/app/globals.css` |

---

## 2. State Management (Client Orchestration)

| Feature | Description | Location |
| --- | --- | --- |
| 게임 상태 보관 | `gameState`, 선택 상태, 연결 정보 | `src/stores/gameStore.ts` |
| 로컬 모드 액션 | `GameEngine` 직접 호출 | `src/stores/gameStore.ts` |
| 온라인 모드 액션 | 소켓 이벤트 송신 | `src/stores/gameStore.ts` |
| 소켓 연결/재연결 | `ensureSocket` + 상태 갱신 | `src/stores/gameStore.ts` |
| 좌석 토큰 저장 | localStorage 기반 좌석 복구 | `src/stores/gameStore.ts` |

---

## 3. Multiplayer (Socket Server)

| Feature | Description | Location |
| --- | --- | --- |
| 소켓 서버 초기화 | Next.js API에서 Socket.IO 구성 | `src/pages/api/socket.ts` |
| 방 생성/참가/종료 | 코드 생성, 참가, 클린업 | `src/pages/api/socket.ts` |
| 좌석 선택/복구 | 좌석 예약, 재접속 복구 | `src/pages/api/socket.ts` |
| 호스트 관리 | 호스트 승계 및 검증 | `src/pages/api/socket.ts` |
| 게임 시작/상태 전파 | 서버에서 GameEngine 호출 후 마스킹 전송 | `src/pages/api/socket.ts` |
| 핸드 마스킹 | 본인 핸드만 노출 | `src/pages/api/socket.ts` |

---

## 4. Game Engine (Core Rules)

| Feature | Description | Location |
| --- | --- | --- |
| 게임 초기화 | 덱/플레이어/영토 세팅 | `src/lib/game/engine.ts` |
| 카드 드로우 | 덱 소진 시 재셔플 포함 | `src/lib/game/engine.ts` |
| 턴/페이즈 진행 | Draw → Action, 손패 초과 시 Discard 강제 | `src/lib/game/engine.ts` |
| 턴 종료 처리 | draw 페이즈에서는 불가, 손패 초과 시 discard 후 자동 턴 종료 | `src/lib/game/engine.ts` |
| 공격 시작 | action 페이즈만, 인접성/행동력/진행중 전투/카드 타입(general,strategy) 검증 | `src/lib/game/engine.ts` |
| 방어/전투 해결 | general/strategy만 방어 가능, 동점은 수비 승리, 점령 시 garrison→discard | `src/lib/game/engine.ts` |
| 무장 배치 | action 페이즈만, 소유 영토/전투 미진행/카드 cost 기반 행동력 검증 | `src/lib/game/engine.ts` |
| 카드 사용 | action 페이즈만, 턴/전투 검증, cost 기반 행동력 차감, resource/event만 처리 | `src/lib/game/engine.ts` |
| 카드 버리기 | discard 페이즈에서 손패 초과분 버리기, 제한 이하 시 자동 턴 종료 | `src/lib/game/engine.ts` |
| 승리 조건 | 영토 18개/가치 30 이상/생존, 전투 후 즉시 판정, 동점 시 현재 턴 플레이어 우선 | `src/lib/game/engine.ts` |
| 로그 기록 | 이벤트 로그 누적 | `src/lib/game/engine.ts` |
| 영토 보너스 | 지역 지배/분산 패널티 | `src/lib/game/engine.ts` |
| 턴 효과 처리 | turnEffects 관리, 턴 종료 시 효과 만료, 공격/방어 보너스 계산 | `src/lib/game/engine.ts` |
| 글로벌 이벤트 | blockNeutralCapture(황건적), blockAllAttacks(휴전), activeEvents duration 관리 | `src/lib/game/engine.ts` |

---

## 5. Card System & Deck

| Feature | Description | Location |
| --- | --- | --- |
| 카드 타입 정의 | General/Strategy/Resource/Event/Tactician, 구현/미구현 효과 분리, quantity 필드 | `src/types/card.ts` |
| 전략 효과 | 구현: BURN/AMBUSH/SIEGE/REINFORCE, 미구현: CHAIN/DIVIDE/ALLIANCE/RETREAT/SPY | `src/types/card.ts` |
| 자원 보너스 효과 | 모두 구현: DRAW_1/ATTACK_BOOST/ATTACK_BOOST_SMALL/TERRITORY_DEFENSE | `src/types/card.ts` |
| 이벤트 효과 | 모두 구현: DRAW_3/ATTACK_DEBUFF/DISCARD_ALL_1/BLOCK_NEUTRAL/BLOCK_ATTACK/ATTACK_BUFF | `src/types/card.ts` |
| 턴 효과 시스템 | TurnEffect 인터페이스, 턴 종료 시 자동 만료, 공격/방어 보너스 적용 | `src/types/game.ts`, `src/lib/game/engine.ts` |
| 카드 데이터 | 무장/전략/자원/이벤트/책사 카드, quantity 기반 수량 관리 | `src/data/*.ts` |
| 덱 생성/셔플/드로우 | quantity 기반 카드 확장, 인스턴스 ID 부여, Fisher-Yates 셔플 | `src/data/cards.ts` |
| 덱 밸런스 | 총 281장: 무장 210(75%), 전략 26(9%), 자원 24(9%), 책사 12(4%), 이벤트 9(3%) | `src/data/*.ts` |

---

## 6. Territory System

| Feature | Description | Location |
| --- | --- | --- |
| 영토 정의 | 46개 영토, 양방향 인접 관계, 방어 보너스 | `src/data/territories.ts` |
| 지역 구분 | 지역별 소속/보너스 데이터 | `src/data/territories.ts` |
| 영토 타입 | 소유자/수비대 모델 | `src/types/territory.ts` |

---

## 7. UI Components (Game)

| Component | Purpose | Location |
| --- | --- | --- |
| `GameLobby` | 로컬/온라인 로비 및 방 관리 | `src/components/game/GameLobby.tsx` |
| `GameBoard` | 게임 전체 화면 컨테이너 | `src/components/game/GameBoard.tsx` |
| `TerritoryMap` | 지도 렌더링 | `src/components/game/TerritoryMap.tsx` |
| `Territory` | 개별 영토 표시 | `src/components/game/Territory.tsx` |
| `CardHand` | 손패 UI | `src/components/game/CardHand.tsx` |
| `Card` | 카드 렌더링 | `src/components/game/Card.tsx` |
| `PlayerPanel` | 플레이어 정보 패널 | `src/components/game/PlayerPanel.tsx` |
| `ActionPanel` | 턴 액션 UI | `src/components/game/ActionPanel.tsx` |
| `TurnIndicator` | 턴/페이즈 표시 | `src/components/game/TurnIndicator.tsx` |
| `GameLog` | 로그 패널 | `src/components/game/GameLog.tsx` |
| `BattleDialog` | 전투 처리 UI | `src/components/game/BattleDialog.tsx` |
| `VictoryScreen` | 승리 화면 | `src/components/game/VictoryScreen.tsx` |

---

## 8. UI Components (Shared)

| Component | Purpose | Location |
| --- | --- | --- |
| `Button` | 공통 버튼 | `src/components/ui/Button.tsx` |
| `Badge` | 라벨/배지 | `src/components/ui/Badge.tsx` |
| `Dialog` | 모달 다이얼로그 | `src/components/ui/Dialog.tsx` |

---

## 9. Types & Shared Constants

| Feature | Description | Location |
| --- | --- | --- |
| 게임 상태 | `GameState`, `CombatState` 등 | `src/types/game.ts` |
| 플레이어 모델 | `Player`, `PlayerId` 타입 별칭, `createPlayerId` 헬퍼 | `src/types/player.ts` |
| 카드 모델 | 카드 타입 정의, quantity 필드 | `src/types/card.ts` |
| 영토 모델 | `Territory`, `TerritoryId`, `GarrisonCard`, `PlayerId` 기반 owner | `src/types/territory.ts` |

---

## 10. Utilities

| Feature | Description | Location |
| --- | --- | --- |
| 클래스 병합 | `clsx` + `tailwind-merge` | `src/lib/utils.ts` |

