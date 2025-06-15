fsm – AGENTS.md

최종 업데이트 2025‑06‑14

목적 – 이 파일은 packages/fsm 라이브러리를 다루는 모든 인간 또는 AI 기여자를 위한 마이크로 핸드북입니다. 게임 로직 코어가 결정론적이고, 테스트 가능하며, 클라이언트와 서버 간에 공유될 수 있도록 코딩 표준, 가드레일, 워크플로우 팁을 정리했습니다.

---

## 1. 패키지 개요

fsm 워크스페이스 패키지는 온라인 홀덤 프로젝트를 위한 순수하고 프레임워크에 독립적인 도메인 로직을 포함합니다.

| 특징 | 설명 |
|------|------|
| 📦 **Exports** | XState 상태 머신들 (`gameMachine`, `bettingMachine`, `lobbyMachine`) + 타입이 지정된 이벤트/컨텍스트 |
| 💡 **Zero side‑effects** | `window`, `fs`, `fetch`, 또는 랜덤 전역 변수 없음 – `services/`를 통해 의존성 전달 |
| 👫 **Shared** | 권위 있는 서버(Durable Object)와 React CSR 클라이언트 모두에서 가져와 사용하여 차이를 방지 |

> 🔑  Golden rule:  If a change would break deterministic replay or cross‑environment compatibility, stop and talk to the maintainer.

--- 

## 2. 절대 규칙

| # | ✔️ 허용됨 | ❌ 금지됨 |
|---|-----------|----------|
| R‑1 | src/** 또는 tests/** 내부에서만 코드 추가/수정 | 여기서 다른 워크스페이스 패키지 건드리기 |
| R‑2 | src/**를 사이드 이펙트 없이 없이 유지. IO는 호출자나 services/에 배치 | actions/guards 내부에서 Math.random/Date 직접 import |
| R‑3 | 복잡한 블록에 AIDEV‑NOTE: / AIDEV‑TODO: 주석 달기 | 기존 AIDEV 앵커 삭제 |
| R‑4 | 200 LOC 이상 또는 3개 파일 이상 편집 시 먼저 계획 게시 | 대규모 리팩토링 무작정 진행 |
| R‑5 | PR 전에 pnpm -F @repo/fsm test & build 모두 통과 | 빨간 CI 머지 |


⸻

## 3. 디렉토리 맵

| 경로 | 여기에 있는 것 | 팁 |
|------|---------------|-----|
| src/types/ | 도메인 타입들 (cards.ts, events.ts, context.ts) | 패키지 간 TypeScript 타입의 진실의 원천 |
| src/utils/ | 순수 헬퍼들 (deck.ts, rank.ts) | 결정론적이고 참조 투명해야 함 |
| src/guards/ | XState 가드 조건자들 | 여기서 비동기 작업 금지 |
| src/actions/ | XState assign 또는 ctx를 변경하는 순수 함수들 | 긴 계산 피하기 – utils로 분리 |
| src/machines/ | 상태 머신 정의들 | 거대한 switch 트리를 중첩하지 말고 조합하기 |
| tests/ | Vitest & @xstate/test 시나리오들 | 인간이 고수준 테스트 설계 담당 |


⸻

## 4. 코딩 표준

| 항목 | 규칙 |
|------|------|
| 언어 | TypeScript 5.5 – strict true |
| 프레임워크 | XState v5 |
| 스타일 | 2칸 들여쓰기, biome (워크스페이스 루트 설정) |
| 네이밍 | camelCase 변수, PascalCase 타입, SCREAMING_SNAKE 열거형 |
| 순수성 | 모든 내보낸 함수는 순수해야 함; random/shuffle은 rng 인젝터 받기 |
| 부작용 | 래퍼를 services/에 두고 머신 옵션을 통해 주입 |
| 테스트 | vitest + @xstate/test 모델 기반 경로 |

앵커 예시:

```typescript
// AIDEV‑NOTE: 서버 스냅샷 스키마와 동기화 유지 (docs/adr‑04.md 참조)
// AIDEV‑TODO: 플레이어 핸드 평가 로직 최적화 필요 - O(n²) → O(n log n)
// AIDEV‑QUESTION: 동시 베팅 시 타이밍 이슈 처리 방법? (race condition)
``` 


⸻

## 5. 빌드 & 테스트

| 작업 | 명령어 |
|------|-------|
| 의존성 설치 | `pnpm i` (레포 루트에서 한 번) |
| 빌드 | `pnpm -F @repo/fsm build` |
| 테스트 감시 | `pnpm -F @repo/fsm dev` |
| CI | `build + vitest run --coverage` 실행 – 초록색 유지하기 |

⸻

## 6. 커밋 에티켓

| 순서 | 규칙 |
|------|------|
| 1 | 하나의 논리적 변경 → 하나의 커밋 ([AI] feat: add straight check) |
| 2 | 본문에서 이유 설명 (이슈/ADR 링크) |
| 3 | AI 생성 커밋에 [AI] 태그 달기 |
| 4 | 실패하는 테스트나 console.log 절대 커밋 금지 |

⸻

## 7. AI / 인간 워크플로우

| 단계 | 작업 |
|------|------|
| 1 | 이 파일 읽기 – 업데이트가 여기에 있음 |
| 2 | 격차 명확히 하기 – 규칙이 불분명하면 코딩 전에 질문 |
| 3 | 계획 초안 작성 – 사소하지 않은 것들 (30 LOC 이상) |
| 4 | 구현 – 순수성 & 디렉토리 규칙 준수 |
| 5 | 필요한 곳에 AIDEV 앵커 추가/조정 |
| 6 | 테스트 + 빌드 실행 |
| 7 | PR 생성 – 인간 리뷰 요청 |

⸻

## 8. 흔한 함정들

| 함정 | 결과 |
|------|------|
| assign 외부에서 컨텍스트 변경 | XState 스냅샷 깨짐 |
| Date/Math.random 직접 사용 | 결정론적 재생 깨짐 |
| 머신과 utils 간 순환 의존성 | 빌드 오류 |
| 상태 변경 후 context.version 증가 잊어버리기 | 동기화 문제 |

⸻

## 9. 용어집

| 용어 | 의미 |
|------|------|
| FSM | 유한 (또는 계층적) 상태 머신 – 여기서는 XState 모델 |
| 권위 있는 서버 | 진실을 해결하기 위해 동일한 FSM 코드를 실행하는 Cloudflare Durable Object |
| 스냅샷 | 지속성 및 diff를 위해 사용되는 머신 상태 + 컨텍스트의 직렬화 가능한 JSON |
| Diff | UI 업데이트를 위해 클라이언트에 전송되는 최소 페이로드 |
| AIDEV‑NOTE/TODO/QUESTION | 미래 관리자 및 AI를 위한 특별한 인라인 주석 |


⸻

의문이 들면 → 이슈를 열거나 관리자에게 연락하세요 🙂