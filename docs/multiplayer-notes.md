# 멀티플레이 작업 기록

## 목표
로그인 없이, 방 코드와 좌석 선택으로 여러 기기에서 함께 플레이할 수 있도록 한다.

## 변경 요약
- Socket.IO 서버 엔드포인트를 추가해 방/좌석/게임 상태 브로드캐스트를 처리.
- 클라이언트 스토어에 온라인 모드(방 생성/참가, 좌석 선택, 시작, 액션 전송) 추가.
- 로비 UI에 로컬/온라인 탭, 방 코드, 좌석 선택 UX 추가.
- 서버에서 손패를 마스킹해 본인 손패만 내려주도록 변경.
- 좌석 토큰 기반 재접속 복구 및 비활성 방 정리 타이머 추가.

## 동작 방식
- 호스트가 방을 생성(2~4좌석)하고, 다른 기기는 방 코드로 참가.
- 각 기기가 좌석(색/번호)을 선택.
- 좌석 선택 시 토큰이 발급되고, 동일 기기 재접속 시 자동 복구.
- 모든 좌석이 채워지면 호스트가 게임 시작.
- 행동은 서버로 전송 → 검증 → 모든 클라이언트로 동기화.

## 추가/수정된 파일
- `src/pages/api/socket.ts` (Socket.IO 방/좌석 서버)
- `src/stores/gameStore.ts` (온라인 모드, 소켓 연결, 액션 전송)
- `src/components/game/GameLobby.tsx` (로컬/온라인 탭, 방/좌석 UI)
- `src/components/game/GameBoard.tsx` (좌석 기준 손패/행동 분기)
- `src/components/game/ActionPanel.tsx` (턴 제한 표시)
- `src/components/game/BattleDialog.tsx` (방어 제한)
- `src/components/game/PlayerPanel.tsx` (마스킹된 손패 개수 표시)
- `src/types/player.ts` (handSize 필드 추가)
- `package.json`, `package-lock.json` (socket.io 의존성)

## 실행 방법
1) 개발 PC에서 외부 접속 허용으로 실행: `npm run dev -- -H 0.0.0.0`
2) 개발 PC의 로컬 IP 확인(macOS Wi-Fi 기준): `ipconfig getifaddr en0`
3) 같은 Wi-Fi의 다른 기기(아이패드 등)에서 `http://<host-ip>:3000` 접속
4) 온라인 플레이 → 방 만들기/참가 → 좌석 선택 → 시작

참고:
- `http://localhost:3000`은 실행 중인 PC에서만 접속 가능.
- 방화벽이 3000 포트를 막으면 허용 필요.

## 알려진 한계
- 방은 메모리 기반이라 서버 재시작 시 게임이 사라진다.
- 좌석 복구는 동일 기기/브라우저(로컬 저장 토큰)에서만 가능하다.
- 좌석 복구 가능 시간(예약 만료) 이후에는 좌석이 해제된다.

## 추가 구현 상세
### 1) 서버에서 손패 마스킹(본인 손패만 내려주기)
- 서버는 `room.gameState`에 전체 손패를 유지한다.
- `game:update`는 소켓별로 마스킹한 상태를 전송한다.
- 본인만 `hand`를 유지하고, 다른 플레이어는 `hand`를 비운 뒤 `handSize`만 전달한다.
- `PlayerPanel`은 카드 수를 `handSize ?? hand.length`로 표시한다.

### 2) 재접속 시 좌석 복구(방 + 좌석 토큰)
- 좌석 선택 시 서버가 `seatToken`을 발급하고 `seat:confirmed`로 내려준다.
- 클라이언트는 `roomCode` 기준으로 토큰을 로컬 저장한다.
- 재접속 시 `room:join` 후 자동으로 `seat:reclaim`을 시도한다.
- 연결이 끊기면 좌석은 `reservedUntil`까지 예약 상태로 남는다(기본 5분).

### 3) 비활성 방 정리 타이머
- 방은 `lastActivityAt` 기준으로 정리된다.
- 기본 정책:
  - 빈 방: 5분 무활동 시 삭제.
  - 로비 방: 30분 무활동 시 삭제.
  - 진행 중 방: 60분 무활동 시 삭제.
- 삭제 전에 `room:closed` 이벤트로 안내한다.
