# 서울경제-부동산 rss to slack

서울경제 부동산 RSS를 주기적으로 읽어서  
새 기사만 Slack 채널로 전송하는 Node.js 기반 자동화 봇입니다.

---

## 기능

- 서울경제 부동산 RSS 구독  
  https://www.sedaily.com/rss/realestate
- Slack Incoming Webhook으로 기사 알림 전송
- 기사 중복 전송 방지 (link 기준)
- 선택적 키워드 필터링
- GitHub Actions로 서버 없이 자동 실행
- 실행 주기: 한국시간(KST) 기준 오전 6시 ~ 오후 8시, 매 1시간

---

## 프로젝트 구조

- index.js  
  RSS를 읽어서 Slack으로 전송하는 메인 로직

- sent.json  
  이미 전송한 기사 link 저장 (중복 방지용 상태 파일)

- package.json  
  Node.js 의존성 정의

- .github/workflows/rss.yml  
  GitHub Actions 스케줄 설정

---

## 사전 준비

### 1) Slack Incoming Webhook 생성

1. Slack API에서 앱 생성
2. Bot User 추가
3. Incoming Webhooks 활성화
4. 알림을 보낼 채널 선택
5. Webhook URL 발급

※ 발급된 Webhook URL은 외부에 노출되면 안 됩니다.

---

### 2) GitHub Secrets 설정

레포지토리에서 아래 경로로 이동합니다.

Settings  
→ Secrets and variables  
→ Actions  
→ New repository secret

- Name: SLACK_WEBHOOK_URL
- Value: Slack Incoming Webhook URL

---

## 로컬 실행 (선택)

1. 의존성 설치

    npm install

2. 환경 변수 설정 (macOS / Linux)

    export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

   Windows (PowerShell)

    setx SLACK_WEBHOOK_URL "https://hooks.slack.com/services/..."

3. 실행

    npm run start

---

## 실행 스케줄

GitHub Actions의 cron은 UTC 기준으로 동작합니다.

이 프로젝트는  
한국시간(KST) 기준 오전 6시 ~ 오후 8시까지  
매 1시간마다 실행되도록 설정되어 있습니다.

UTC 기준 cron 표현식은 아래와 같습니다.

    0 21-23,0-11 * * *

의미:
- UTC 21~23시 + 0~11시
- KST 기준 06:00 ~ 20:00 매시간 실행

---

## 중복 전송 방지 방식

- RSS 각 item의 link를 고유 ID로 사용합니다.
- 이미 전송한 link는 sent.json에 저장합니다.
- sent.json은 최대 5,000개까지만 유지하여
  파일이 무한히 커지는 것을 방지합니다.

---

## 커스터마이징

### 키워드 필터 수정

index.js 상단의 KEYWORDS 배열을 수정하면
특정 키워드가 포함된 기사만 전송할 수 있습니다.

예시:

    const KEYWORDS = ["전세", "월세", "청약", "분양"];

모든 기사를 전송하고 싶다면
matchesKeywords 함수가 항상 true를 반환하도록 수정하면 됩니다.

---

## 주의사항

- SLACK_WEBHOOK_URL은 절대 코드나 README에 직접 커밋하지 마세요.
- sent.json을 gitignore 처리하면 상태가 유지되지 않아
  중복 알림이 발생할 수 있습니다.
- 브랜치 보호(Protected Branch)가 설정된 경우
  GitHub Actions에서 sent.json 커밋 단계가 실패할 수 있습니다.

---

## 라이선스

개인 사용, 학습용, 사내 자동화 용도로 자유롭게 사용 가능합니다.
