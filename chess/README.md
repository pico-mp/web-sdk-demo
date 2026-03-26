# ingChess - PicoMP Web SDK 연동 예제 🎮

ingChess는 **PicoMP(피코 멀티플레이어)** SDK를 웹 클라이언트(React)에서 어떻게 사용하는지를 가장 직관적으로 보여주기 위해 제작된 1대1 실시간 체스 게임입니다.

복잡한 백엔드 코딩 없이 100% 프론트엔드 코드만으로 방(Room) 생성, 접속, 데이터 브로드캐스팅(이벤트 통신), 인게임 치트 방어 로직을 구현하는 모범 사례를 제공합니다.

---

## 🚀 주요 기능 및 핵심 개념

### 1. 웹 브라우저 기반 동기화 구현 (`usePicoMP.ts`)
PicoMP SDK의 `.createRoom()`, `.joinRoom()`, `.sendAll()`, `.onReceive()` 등의 생명주기 API를 React 컴포넌트 생명주기(Hooks)와 연결하여 설계되었습니다.
- **방 생성 및 입장**: 상대방과 매칭하기 위한 고유 Room Code를 발급받고 처리합니다.
- **이벤트 전파**: 누군가 체스 말을 이동시켰을 때 좌표값을 브로드캐스팅합니다.
- **연결 유실 처리**: 상대방 접속 종료 시 기권승 처리 등을 수행합니다.

### 2. 클라이언트 기반 보안 (Anti-Cheat 로직) (`App.tsx`)
PicoMP는 서버측 연산을 최소화하고 고성능 멀티플레이를 구현하기 위해 상태(State) 검증의 일부를 클라이언트로 위임합니다.
- 악의적인 사용자가 상대방의 턴에 수작을 부리거나, 불가능한 위치(예: 폰 5칸 전진)로 좌표를 조작해 전송할 경우, 클라이언트의 룰엔진(`getSafeValidMoves`)에서 이를 1차 검증하고 **패킷을 폐기(Reject)** 합니다.

### 3. 모듈화된 로컬 게임 엔진 (`useChessGame.ts`, `engine/rules.ts`)
- 체스판의 오프라인 룰과 상태 조작만을 담당합니다. 이 구조 덕분에 게임 자체의 비즈니스 로직과 PicoMP 네트워크 로직이 깔끔하게 분리되어 있습니다.

---

## 📂 파일 구조 가이드

```text
src/
├── App.tsx                  # 게임 UI 메인 및 네트워크/로컬 이벤트 통합
├── components/              # 체스판(ChessBoard) 및 렌더링용 순수(단순) 컴포넌트
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
   # SDK에서 기본적으로 상용망 주소를 자체 내장하고 있으므로, 
   # 발급받은 KEY만 입력하면 자동으로 웹 서비스 배포가 완료됩니다!
   # VITE_PICO_API_KEY=웹_콘솔에서_발급받은_키_입력
   ```

2. **Game Server 실행 확인 (로컬 테스트 시)**
   멀티플레이 테스트를 위해서는 로컬 환경의 `Game Server`가 동작하고 있어야 합니다. (기본 7426 포트)
   ```bash
   cd ../tinyMP/Game_Server
   npm run dev
   ```

3. **클라이언트 실행**
   ```bash
   npm install
   npm run dev
   ```
   이후 표시된 로컬 주소(ex: `http://localhost:5173`)를 브라우저 탭 2개에 띄워 한쪽에서 방을 생성하고, 다른 탭에서 해당 코드로 접속하여 테스트합니다.
