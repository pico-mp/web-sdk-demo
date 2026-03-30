# pico-chess — PicoMP Web SDK 연동 예제 🎮

pico-chess는 **PicoMP(피코 멀티플레이어)** SDK를 웹 클라이언트(React)에서 얼마나 쉽고 빠르게 활용할 수 있는지를 보여주기 위해 제작된 1대1 실시간 체스 게임입니다.

복잡한 백엔드 코딩 없이 100% 프론트엔드 코드만으로 방(Room) 생성, 접속, 실시간 게임 상태 동기화, 재접속 복원을 구현합니다.

---

## 🚀 주요 기능 및 핵심 개념

### 1. setRoomData로 게임 상태 동기화 (`usePicoMP.ts`)
PicoMP SDK의 `setRoomData`를 활용해 게임 상태 전체를 서버에 보관합니다.
- **이동 브로드캐스트**: 말을 이동하면 `setRoomData('gameState', newState)` 한 줄로 상대방에게 전파됩니다.
- **자동 재접속 복원**: 새 플레이어가 입장하면 `getAllRoomData()['gameState']`로 현재 상태를 즉시 복원합니다. RequestSync/BoardSync 핸드쉐이크가 필요 없습니다.
- **리셋 브로드캐스트**: 게임 리셋도 `setRoomData('gameState', INITIAL_GAME_STATE)`로 한 줄 처리됩니다.

### 2. 모듈화된 로컬 게임 엔진 (`useChessGame.ts`, `engine/rules.ts`)
체스판의 오프라인 룰과 상태 조작만을 담당합니다. 이 구조 덕분에 게임 비즈니스 로직과 PicoMP 네트워크 로직이 깔끔하게 분리되어 있습니다.

---

## 📂 파일 구조 가이드

```text
src/
├── App.tsx                  # 게임 UI 메인 및 네트워크/로컬 이벤트 통합
├── components/              # 체스판(ChessBoard) 및 렌더링용 순수 컴포넌트
├── engine/                  # 이동 경로 계산, 체크/체크메이트 판단 코어
│   └── rules.ts
├── hooks/
│   ├── useChessGame.ts      # 체스 보드 상태, 턴, 사망 기물 데이터 훅
│   └── usePicoMP.ts         # PicoMP SDK 네트워크 어댑터 훅 (핵심!!)
├── types/                   # TypeScript 타입 지정
└── data/pieces.json         # 각 기물(폰, 나이트 등)의 이동 규칙 JSON
```

---

## 🛠 실행 방법

1. **환경 변수(.env) 설정**
   실제 서버 또는 로컬 통신을 위해 프로젝트 루트에 `.env` 파일을 생성하고(기본 제공되는 `.env.example` 참고), 다음과 같이 기입합니다.
   ```env
   # 로컬 개발용 (Game Server 로컬 구동)
   VITE_PICO_API_KEY=

   # 실제 상용망(Cloud) 배포 시
   # VITE_PICO_API_KEY=웹_콘솔에서_발급받은_키_입력
   ```

2. **Game Server 실행 확인 (로컬 테스트 시)**
   ```bash
   cd ../pico-mp/Game_Server
   npm run dev
   ```

3. **클라이언트 실행**
   ```bash
   npm install
   npm run dev
   ```
   브라우저 탭 2개에서 한쪽은 Create Room, 다른 탭은 해당 코드로 Join하여 테스트합니다.
