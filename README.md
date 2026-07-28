# Plany

친구와 여행 일정, 장소, 비용, 체크리스트를 함께 관리하는 웹 앱입니다.

## 서비스 구조

- Hosting: GitHub Pages (`www.plany.life`)
- Authentication / Firestore: Firebase project `maps-5fe2c`
- Google Maps Platform: Google Cloud project `maps-481116`
- Current source version: `1.3.0`
- Patch notes: [`1.3.0`](docs/PATCH_NOTES_1.3.0.md) · [`1.2.0`](docs/PATCH_NOTES_1.2.0.md)
- Security checklist: [`SECURITY.md`](SECURITY.md)

## 로컬 확인

정적 웹 앱이므로 로컬 HTTP 서버에서 실행합니다. 브라우저에서 `file://`로 직접 열면 Firebase와 지도 API의 도메인 정책 때문에 일부 기능이 동작하지 않을 수 있습니다.

```bash
npm test
npm run check
```

## 릴리스 원칙

- 이전 안정 버전은 Git 태그로 보존합니다.
- 기능 개발은 버전 브랜치에서 진행합니다.
- API 키 값은 문서나 이슈에 복사하지 않습니다.
- Google Maps 키는 서비스 도메인과 사용하는 API로 제한해야 합니다.
