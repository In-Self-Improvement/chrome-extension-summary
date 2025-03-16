# Chrome Extension PRD (Product Requirements Document)

## 1. 프로젝트 개요
### 1.1 개요
- 현재 보고 있는 웹페이지의 내용을 Markdown 형태로 추출하는 크롬 익스텐션 개발
- 추출한 Markdown 데이터를 GPT에 전송하여 요약 및 추가적인 대화 지원
- Markdown 포맷을 사용하여 GPT의 이해도를 높이고, 구조적인 정보를 유지

### 1.2 주요 기능
1. **웹페이지 Markdown 변환**
   - 현재 웹페이지의 HTML을 Markdown으로 변환
   - 필요한 경우 특정 요소(광고, 불필요한 스크립트 등) 제외
2. **GPT 연동**
   - 추출한 Markdown을 GPT API에 전송
   - 요약 및 추가 대화 기능 지원
3. **UI 제공**
   - 사용자가 Markdown을 확인하고 편집할 수 있는 인터페이스
   - GPT 요청을 보내고 결과를 확인할 수 있는 패널
4. **설정 옵션**
   - 제외할 요소, 요약 스타일 등의 사용자 설정 지원
   
## 2. 개발 계획

### 2.1 일정
- 목표: 3주 내 개발 완료 (주당 5시간 내외)
- 1주차: 기본 기능 개발 (Markdown 변환, 크롬 익스텐션 기본 구조 구현)
- 2주차: GPT 연동 및 UI 개발
- 3주차: 최적화 및 배포 준비

### 2.2 개발 단계
#### 1주차: 크롬 익스텐션 기본 기능 개발
1. 크롬 익스텐션 **폴더 및 파일 구조 생성**
   - `manifest.json`: 크롬 익스텐션의 메타 정보 설정
   - `popup.html`: UI 제공을 위한 HTML 파일
   - `popup.js`: UI 동작을 위한 JavaScript 파일
   - `content.js`: 웹페이지에서 HTML을 추출하는 스크립트
   - `background.js`: 확장 프로그램의 백그라운드 스크립트 (필요한 경우)
2. **Manifest.json 설정**
   - 기본적인 확장 프로그램 정보 추가 (이름, 버전, 퍼미션 등)
   - `content_scripts` 및 `background` 설정
3. **웹페이지에서 HTML을 가져오는 content script 개발**
4. **HTML을 Markdown으로 변환하는 로직 구현 (turndown.js 사용 검토)**
5. **변환된 Markdown을 로컬에 저장하고 표시하는 기본 UI 개발**

#### 2주차: GPT 연동 및 UI 개발
1. **OpenAI API 키를 통한 GPT 연동**
   - API 요청을 위한 함수 작성
   - Markdown 데이터를 API로 전송하여 요약 결과 받기
2. **Markdown을 GPT로 전송하여 요약 요청**
3. **요약된 결과를 UI에 표시**
4. **사용자가 직접 편집할 수 있는 기능 추가**

#### 3주차: 최적화 및 배포 준비
1. **성능 최적화** (불필요한 태그 제거, 속도 개선)
2. **사용성 개선** (UX/UI 조정, 버그 수정)
3. **크롬 익스텐션 웹스토어 배포 준비** (설명, 아이콘, 스크린샷 준비)

## 3. 기술 스택
- **크롬 익스텐션**: JavaScript, Manifest v3
- **Markdown 변환**: Turndown.js
- **GPT 연동**: OpenAI API
- **UI**: 기본 HTML/CSS + JavaScript (또는 React if needed)

---

## 4. 기대 효과
- 웹페이지의 텍스트 정보를 Markdown으로 변환하여 효율적으로 요약 가능
- GPT API와 연동하여 콘텐츠 이해 및 대화 확장 가능
- 사용자 친화적인 UI를 제공하여 편리한 사용 경험 제공

이 PRD를 기반으로 각 단계별로 작업을 진행하면 3주 내 목표를 달성할 수 있습니다.

