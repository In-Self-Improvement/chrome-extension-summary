# 웹페이지 Markdown 변환기

이 크롬 익스텐션은 현재 보고 있는 웹페이지의 내용을 Markdown 형식으로 변환해주는 도구입니다.

## 기능

- 현재 웹페이지의 내용을 Markdown으로 변환
- 불필요한 요소(광고, 네비게이션, 푸터 등) 제외
- 변환된 Markdown을 클립보드에 복사

## 설치 방법

1. 이 저장소를 클론하거나 다운로드합니다.
2. 크롬 브라우저에서 `chrome://extensions/` 페이지로 이동합니다.
3. 우측 상단의 '개발자 모드'를 활성화합니다.
4. '압축해제된 확장 프로그램을 로드합니다' 버튼을 클릭합니다.
5. 다운로드한 폴더를 선택합니다.

## 사용 방법

1. Markdown으로 변환하고 싶은 웹페이지에서 익스텐션 아이콘을 클릭합니다.
2. '현재 페이지 변환' 버튼을 클릭합니다.
3. 변환된 Markdown이 텍스트 영역에 표시됩니다.
4. '복사하기' 버튼을 클릭하여 클립보드에 복사할 수 있습니다.

### 사용 예시

아래 GIF는 확장 프로그램의 실행 방법을 보여줍니다:

![웹페이지 Markdown 변환기 사용법](https://github.com/user-attachments/assets/e3e1780d-746e-47a0-9912-584fb9758d53)

## 기술 스택

- JavaScript
- Chrome Extension API
- Turndown.js (HTML to Markdown 변환 라이브러리)

## 라이센스

MIT

## 왜 Markdown 변환이 중요한가요?

웹페이지 내용을 Markdown으로 변환하면 AI 도구(예: ChatGPT, Claude)와 상호작용할 때 더 나은 결과를 얻을 수 있습니다. 아래는 동일한 질문에 대해 다른 입력 방식을 사용했을 때의 차이점입니다:

| 입력 방식            | 설명                               | 결과                                                                                                   |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 웹페이지 링크 + 질문 | 원본 URL을 제공하고 질문           | ![링크 기반 응답](https://github.com/user-attachments/assets/5a867b59-5965-4fba-bff3-ce914695256c)     |
| Markdown 형식 + 질문 | 정제된 Markdown 콘텐츠와 함께 질문 | ![Markdown 기반 응답](https://github.com/user-attachments/assets/ad302f12-2479-4334-847b-0f9d7c697123) |

위 비교에서 볼 수 있듯이, Markdown 형식으로 변환된 콘텐츠를 사용할 때 AI의 응답 품질이 크게 향상됩니다. 이 확장 프로그램은 웹페이지의 핵심 내용만 추출하여 AI가 더 정확하고 관련성 높은 답변을 제공할 수 있도록 도와줍니다.
