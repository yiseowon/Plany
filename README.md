# Plany

친구와 여행 일정, 장소, 비용, 체크리스트를 함께 관리하는 웹 앱입니다. 웹 서비스 운영은 종료되었으며 소스 코드는 포트폴리오로 공개합니다.

## 기술 스택

- HTML, CSS, JavaScript
- Firebase Authentication, Cloud Firestore
- Google Maps Platform
- GitHub Pages로 배포한 이력

## 로컬 실행

로그인과 지도 기능을 실행하려면 `config.example.js`를 `config.local.js`로 복사한 뒤, 본인의 Firebase 웹 앱 설정과 Google Maps Platform 브라우저 키를 입력합니다. Firebase에서 Google 로그인과 Cloud Firestore를 설정하고, 해당 프로젝트에 `firestore.rules`의 접근 규칙을 적용합니다. 로컬 실행에 사용하는 호스트를 인증 승인 도메인과 지도 키 제한에 추가합니다.

저장소 루트에서 아래 명령을 실행하고 브라우저에서 `http://localhost:8000`을 엽니다. 설정 파일 없이 실행하면 랜딩 화면을 확인할 수 있습니다.

```bash
python3 -m http.server 8000
```

`config.local.js`에는 로컬 실행에 필요한 값만 넣습니다. OpenWeather 키는 날씨 기능을 로컬에서 확인할 때만 입력합니다. 키 사용 범위는 [보안 문서](SECURITY.md)에 따라 제한합니다.

## 검증

```bash
npm test
npm run check
```

버전별 변경 사항은 [변경 내역](CHANGELOG.md)에서 확인할 수 있습니다.
