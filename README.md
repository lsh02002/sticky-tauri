# Sticky Tauri

Tauri 2 + Rust + SQLite + React + Bootstrap로 만든 모듈형 스티키 메모 샘플입니다.

## 기능

- 텍스트 메모
- 투두리스트 메모
- 가계부 메모
- 메모 색상 변경
- 메모 삭제
- SQLite 영속 저장
- Rust repository / service / command 계층 분리

## 실행

```bash
npm install
npm run tauri dev
```

## Rust 계층

- `repository`: SQLite 접근과 SQL 실행
- `service`: 검증 및 비즈니스 로직
- `command`: Tauri command 노출
- `domain`: 요청/응답 DTO와 도메인 타입

## 참고

가계부 금액은 부동소수점 오차를 피하기 위해 정수형으로 저장합니다. 원화는 그대로 저장하고, 달러처럼 소수점이 있는 통화는 센트 단위로 저장하세요.

## Windows 아이콘 빌드 오류

Windows에서 다음 오류가 발생하면 `src-tauri/icons/icon.ico` 파일이 누락된 것입니다.

```text
`icons/icon.ico` not found; required for generating a Windows Resource file during tauri-build
```

이 프로젝트에는 Windows용 `icon.ico`와 PNG 아이콘 세트가 포함되어 있습니다. 이전 압축본에서 실행했다면 `src-tauri/target`을 삭제한 후 다시 실행하세요.

```powershell
Remove-Item -Recurse -Force .\src-tauri\target
npm run tauri dev
```


## 개별 메모 창

- 메인 창은 메모 생성 및 목록 관리용입니다.
- 메모를 만들면 `note-{id}` 라벨의 독립 Tauri 창이 자동으로 열립니다.
- 목록의 메모 카드를 클릭하면 해당 창이 열리며, 이미 열려 있으면 기존 창이 앞으로 이동합니다.
- 독립 창의 URL은 `index.html?noteId={id}` 형식이며 React 진입점이 쿼리 값을 읽어 메모 타입별 편집기를 렌더링합니다.
- 창 생성은 `src-tauri/src/command/window_command.rs`에서 담당합니다.
