# Worker Layer – AGENTS.md

**Scope:** `apps/poker-backend` · **Updated:** 2025‑06‑15

## 목적
이 문서는 Cloudflare Worker + Durable Objects 백엔드를 유지·확장하는 모든 개발자(AI 및 인간)가 반드시 준수해야 하는 **단일 진리 원본**입니다. 핵심은 XState v5 액터 모델과 Durable Objects를 엮어 권위 서버를 구성하고, **"저격 홀덤" 게임 규칙**에 따라 D1 SQLite에 이벤트·스냅샷을 영속화하는 패턴을 일관되게 지키는 것입니다.

> ⚠️ **PR 리뷰 불합격 사유:** 본 가이드라인과 상충 / 테스트 미충족 / 타입 안전성 깨짐 / 치료 불가한 레이스 조건 / **게임 규칙 위배**

---

## 0. 아키텍처 개요 

```
Client ──▶ Router Worker                            
                 │  Upgrade /ws?room=abc            
                 ▼                                   
         ┌─ Durable Object : Room Actor ───────────┐
         │  • createActor(gameMachine, services)   │
         │  • WebSocket fan‑out broadcast          │
         │  • setAlarm(5s) → saveSnapshot()        │
         └─────────────────▲───────────────────────┘
                          │ D1.room_snapshots
```

| 구성 요소 | 역할 | 특징 |
|-----------|------|------|
| **Room DO** | 단일 스레드 FSM 권위 인스턴스 | XState v5 createActor로 구동 → 레이스 컨디션 없음 |
| **Match DO** | 방 생성·대기열·룸 코드 반환 | 모든 룸 ID 생성·검증은 이곳에서만 수행 |
| **Router Worker** | JWT 검증 & 업그레이드 라우팅 | 비즈니스 로직 없음. 정적 자산은 Pages CDN 통과 |

---

## 1. 디렉터리 규칙

| 경로 | 책임 | 변형 허용 범위 |
|------|------|----------------|
| `src/worker.ts` | HTTP → WebSocket 업그레이드 / `/api/*` 프락시 | 🟢 핫 코드 (수시 변경 OK) |
| `src/room.do.ts` | Room DO – FSM, 소켓 관리, alarm 스냅샷 | 🔴 **절대 가볍게 건드리지 말 것.** 논리 변경 시 반드시 시뮬레이션 테스트 추가 |
| `src/match.do.ts` | 로비·룸 생성 API | 🟡 기능 추가 가능하나 Room ID 정책과 충돌 금지 |
| `src/services/*.impl.ts` | 외부 I/O 구현(D1·RNG) | 🟢 구현 교체 OK, 시그니처 불변 |
| `test/` | miniflare + k6 로드·시뮬 테스트 | 🔴 통과하지 못하면 배포 X |

---

## 2. XState v5 코딩 가이드

### 2‑1 핵심 패턴

```typescript
const roomActor = createActor(gameMachine, {
  input: { rng: () => Math.random() },        // ← RNG 의존성 주입
  services: {
    saveSnapshot: ({ context }) => saveSnap(DB, id, context),
    loadSnapshot: () => loadSnap(DB, id)
  }
}).start();
```

### 2‑2 코딩 규칙

| 규칙 | ❌ 잘못된 예시 | ✅ 올바른 예시 |
|------|-------------|-------------|
| **이벤트 객체 사용** | `send('BET')` | `send({ type: 'RAISE', amount: 10 })` |
| **Guard 키워드** | `cond: 'hasChips'` | `guard: 'hasChips'` |
| **내부 이벤트** | `send({ type: 'INTERNAL' })` | `raise({ type: 'INTERNAL' })` |
| **외부 액터** | `send(event)` | `sendTo(target, event)` |

### 2‑3 서비스 DI 목록

| 이름 | 타입 | 설명 |
|------|------|------|
| `saveSnapshot` | `(snap) => Promise<void>` | 5초마다 호출; Room DO → D1 |
| `loadSnapshot` | `() => Promise<GameSnapshot \| null>` | DO 재시작 시 복원 |

---

## 3. 메시지 프로토콜 (저격 홀덤 특화)

### 3‑1 클라이언트 → Room Actor (WebSocket)

```typescript
// ClientIntent @repo/fsm/types/events.ts
type ClientIntent =
  | { type: 'JOIN'; playerId: string }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'CHECK' }
  | { type: 'CALL' }
  | { type: 'RAISE'; amount: number }
  | { type: 'FOLD' }
  | { type: 'SNIPE'; targetRank: HandRank; targetNumber: Card }
  | { type: 'SNIPE_PASS' }
  | { type: 'CONFIRM_SURVIVAL' }
```

| Type | 예시 | 설명 |
|------|------|------|
| `JOIN` | `{ type: 'JOIN', playerId: 'user123' }` | 게임 참가 |
| `CHECK` | `{ type: 'CHECK' }` | 추가 베팅 없이 패스 |
| `CALL` | `{ type: 'CALL' }` | 현재 베팅액에 맞춤 |
| `RAISE` | `{ type: 'RAISE', amount: 10 }` | 베팅액 상승 |
| `FOLD` | `{ type: 'FOLD' }` | 폴드 |
| `SNIPE` | `{ type: 'SNIPE', targetRank: 'STRAIGHT', targetNumber: 8 }` | 저격 선언 |
| `SNIPE_PASS` | `{ type: 'SNIPE_PASS' }` | 저격 패스 |
| `CONFIRM_SURVIVAL` | `{ type: 'CONFIRM_SURVIVAL' }` | 생존 확정 (75칩 지불) |

**규칙:**
- 모든 필드는 camelCase & 최소화
- 저격은 `targetRank` + `targetNumber` 조합으로 선언
- 버전 필드 없음: Actor가 diff 이벤트에 버전을 포함해 브로드캐스트

### 3‑2 Room Actor → 클라이언트

```typescript
type ServerDiff =
  | { type: 'STATE'; value: string; version: number }
  | { type: 'POT'; pot: number }
  | { type: 'CURRENT_BET'; amount: number }
  | { type: 'PLAYER'; player: { id: string; bet: number; chips: number; folded: boolean; isSurvived?: boolean } }
  | { type: 'COMMUNITY'; cards: Card[]; revealed: number }
  | { type: 'SNIPE_DECLARED'; playerId: string; targetRank: HandRank; targetNumber: Card }
  | { type: 'HAND_REVEALED'; playerId: string; hand: Card[] }
  | { type: 'WINNER'; playerId: string; amount: number }
  | { type: 'SURVIVAL_CONFIRMED'; playerId: string }
```

**특징:**
- **Idempotent:** 클라이언트가 version 갭 감지 시 `/snapshot` REST 재동기화
- **저격 홀덤 특화:** `SNIPE_DECLARED`, `SURVIVAL_CONFIRMED` 등 게임 특화 이벤트

---

## 4. 게임 상태 머신 (FSM)

### 4‑1 상태 전이도

```
waiting → deal → bet_round1 → reveal_community → bet_round2 → snipe_phase → showdown
    ↑                                                                            ↓
    └────────────────────────── (다음 라운드) ←──────────────────────────────────┘
                                                   ↓
                                               game_over
```

### 4‑2 상태별 액션

| 상태 | 입력 이벤트 | 액션 | 다음 상태 |
|------|------------|------|-----------|
| `waiting` | `JOIN` | 플레이어 추가 | `waiting` |
| `waiting` | `START_GAME` | - | `deal` |
| `deal` | - | 카드 배분 (개인 2장 + 공유 2장) | `bet_round1` |
| `bet_round1` | `CHECK/CALL/RAISE/FOLD` | 베팅 처리 | `reveal_community` |
| `reveal_community` | - | 공유 카드 2장 추가 공개 | `bet_round2` |
| `bet_round2` | `CHECK/CALL/RAISE/FOLD` | 베팅 처리 | `snipe_phase` |
| `snipe_phase` | `SNIPE/SNIPE_PASS` | 저격 선언 처리 | `showdown` |
| `showdown` | - | 족보 판정 & 팟 분배 | `deal` or `game_over` |

---

## 5. D1 스키마 규칙

| 테이블 | 스키마 | 규칙 |
|--------|--------|------|
| `room_snapshots` | `(id TEXT PK, version INT, data TEXT, updated_at TIMESTAMP)` | 최신 버전만 저장 (UPSERT) |
| `event_log` | `(id INTEGER PK AUTOINCREMENT, room_id TEXT, ver INT, event TEXT, ts TIMESTAMP)` | INSERT 전용, UPDATE 금지 |

### 게임 컨텍스트 스냅샷 구조

```typescript
interface GameSnapshot {
  players: Player[]              // 플레이어 상태 (칩, 베팅, 핸드 등)
  community: Card[]              // 공유 카드 4장
  communityRevealed: number      // 공개된 공유 카드 수 (0, 2, 4)
  pot: number                    // 현재 팟
  currentBet: number             // 현재 라운드 최고 베팅
  version: number                // 동기화 버전
  snipeDeclarations: SnipeDeclaration[]  // 저격 선언 목록
  // ... 기타 게임 상태
}
```

### 추가 규칙

| 항목 | 규칙 |
|------|------|
| **데이터 무결성** | Roll‑forward only (event_log에 UPDATE 금지) |
| **TTL** | Cloudflare DB R2 export cron (30일) 후 purge |
| **게임 규칙 준수** | 모든 상태 변경은 `game-rule.md` 규칙에 따름 |

---

## 6. 테스트 & CI

| 단계 | 툴 | 필수 통과 조건 |
|------|-----|---------------|
| **유닛** | vitest | guards/actions 순수성 테스트 100% 통과 |
| **시뮬** | miniflare + @xstate/test | 2→6인 자동 모델 탐색 시 예외 0 |
| **부하** | k6 | 100 룸 × 6 socket × 10분 → p95 < 250ms |
| **E2E** | Playwright | 브라우저 2개 연결 후 베팅·저격·쇼다운 자동 진행 |
| **게임 규칙** | 시뮬레이션 테스트 | `game-rule.md` 모든 시나리오 100% 검증 |

> 📋 **배포 조건:** GitHub Actions `ci.yml`에서 전부 녹색이어야 deploy workflow 실행

---

## 7. 코드 리뷰 체크리스트

| 항목 | 체크 포인트 |
|------|-------------|
| **성능** | Room DO에 블로킹 await를 50ms 이상 걸지 않았다 |
| **에러 핸들링** | 메시지 파싱 실패 시 400 응답 or `ws.close(1003)`으로 명확히 처리했다 |
| **알람 주기** | Durable Object alarm 주기는 `5 ± 0.5`초; 하드코딩 변경 금지 |
| **DB 마이그레이션** | 새 DB 테이블·컬럼은 D1 migration 파일 + PR 설명 포함 |
| **테스트 커버리지** | 테스트 추가 없이 비즈니스 로직을 바꾸지 않았다 |
| **게임 규칙 준수** | `game-rule.md`와 상충하는 로직 변경 금지 |
| **타입 안전성** | `ClientIntent`, `ServerDiff`, `GameContext` 타입 정합성 확인 |

---

## 8. 운영 & 관측

| 영역 | 도구/방법 | 설명 |
|------|-----------|------|
| **로깅** | Workers Analytics Dash | `wrangler tail --format pretty` 대신 사용 |
| **메트릭** | Analytics Engine | `reportWebVitals({ name:'pot_size', value })` |
| **알람** | Slack #oncall | 503 비율 > 1% 5분 지속 시 알림 |
| **게임 룰 검증** | Custom 메트릭 | 저격 성공률, 생존 확정률 등 게임 밸런스 모니터링 |

---

## 9. FAQ

| Q | A |
|---|---|
| **Room ID 체계 바꿔도 될까요?** | 반드시 Match DO → Unit Test 추가 + Backward compat 고려 |
| **스냅샷 주기 바꾸고 싶어요** | `5s` → 변경 시 k6 부하 + D1 write burst 재측정 필수 |
| **게임 규칙 수정하고 싶어요** | `game-rule.md` 업데이트 → FSM 로직 수정 → 시뮬레이션 테스트 추가 순서 필수 |
| **저격 로직이 복잡해요** | `@repo/fsm/src/actions/processSnipe.ts` 참조. 중복 선언 방지는 guard에서 처리 |

---

**끝.** PR 전에는 변경 기록 Table 업데이트 잊지 말 것!