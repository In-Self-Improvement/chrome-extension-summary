document.addEventListener("DOMContentLoaded", function () {
  const convertBtn = document.getElementById("convert-btn");
  const copyPromptBtn = document.getElementById("copy-prompt-btn");
  const sendToChatGPTBtn = document.getElementById("send-to-chatgpt-btn");
  const markdownOutput = document.getElementById("markdown-output");
  const statusDiv = document.getElementById("status");

  // 페이지 로드 시 자동으로 변환 시작
  convertAndCopy();

  // 변환 및 복사 버튼 클릭 이벤트
  convertBtn.addEventListener("click", function () {
    convertAndCopy();
  });

  // 요약 프롬프트 복사 버튼
  copyPromptBtn.addEventListener("click", function () {
    if (!markdownOutput.value) {
      statusDiv.textContent = "먼저 페이지를 변환해주세요!";
      return;
    }

    const summaryPrompt = generateSummaryPrompt(markdownOutput.value);
    copyToClipboard(summaryPrompt);
    statusDiv.textContent = "요약 프롬프트가 클립보드에 복사되었습니다!";
  });

  // ChatGPT로 전송 버튼
  sendToChatGPTBtn.addEventListener("click", function () {
    if (!markdownOutput.value) {
      statusDiv.textContent = "먼저 페이지를 변환해주세요!";
      return;
    }

    // 요약 프롬프트 생성
    const summaryPrompt = generateSimpleSummaryPrompt(markdownOutput.value);

    // chrome.storage.local에 저장
    chrome.storage.local.set({ markdownToAI: summaryPrompt }, function () {
      if (chrome.runtime.lastError) {
        statusDiv.textContent =
          "저장 오류: " + chrome.runtime.lastError.message;
        return;
      }

      console.log("프롬프트가 storage에 저장되었습니다.");

      // ChatGPT 페이지 열기
      chrome.tabs.create(
        { url: "https://chat.openai.com/" },
        function (newTab) {
          if (chrome.runtime.lastError) {
            statusDiv.textContent =
              "ChatGPT 열기 오류: " + chrome.runtime.lastError.message;
          } else {
            statusDiv.textContent = "ChatGPT로 이동 중...";
            window.close(); // 팝업 창 닫기
          }
        }
      );
    });
  });

  // 변환 및 복사 기능을 하나로 통합한 함수
  function convertAndCopy(callback) {
    statusDiv.textContent = "페이지 변환 중...";
    markdownOutput.value = "";

    // 활성 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        statusDiv.textContent = "활성 탭을 찾을 수 없습니다.";
        return;
      }

      // 백그라운드 스크립트에게 turndown.js와 content.js 삽입 요청
      chrome.runtime.sendMessage(
        { action: "injectTurndown" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error("메시지 전송 오류:", chrome.runtime.lastError);
            statusDiv.textContent =
              "스크립트 삽입 중 오류가 발생했습니다: " +
              chrome.runtime.lastError.message;
            return;
          }

          if (!response || !response.success) {
            statusDiv.textContent = "스크립트 삽입에 실패했습니다.";
            return;
          }

          // 스크립트가 삽입되었으므로 변환 요청
          setTimeout(function () {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "convert" },
              function (convertResponse) {
                if (chrome.runtime.lastError) {
                  console.error("변환 요청 오류:", chrome.runtime.lastError);
                  statusDiv.textContent =
                    "페이지 변환 중 오류가 발생했습니다: " +
                    chrome.runtime.lastError.message;
                  return;
                }

                if (!convertResponse || !convertResponse.markdown) {
                  statusDiv.textContent = "마크다운 변환에 실패했습니다.";
                  return;
                }

                // 변환 성공, 결과 표시
                markdownOutput.value = convertResponse.markdown;
                statusDiv.textContent = "변환 완료!";

                // 콜백 함수가 제공된 경우 실행
                if (typeof callback === "function") {
                  callback(convertResponse.markdown);
                }
              }
            );
          }, 500); // 스크립트 로딩을 위한 시간 지연
        }
      );
    });
  }

  // 요약 프롬프트 생성 함수
  function generateSummaryPrompt(markdown) {
    return `아래는 웹페이지의 내용을 담고 있는 Markdown 파일입니다.  
이 내용을 아래의 포맷에 맞춰 markdown으로 전달드린 내용을 요약해주세요. 
포맷은 아래와 같습니다. 
내용을 줄때에는 markdown이 아닌 텍스트로 주세요.

## 📝 **웹페이지 요약**

### 📌 **웹페이지 제목 및 주제**  
- **제목**: (웹페이지의 제목)
- **주제**: (웹페이지의 주요 주제 및 목적)

### 📋 **대략적인 내용 목차 및 3줄 요약**
**목차**:
- (주요 목차 항목들)

**요약**:
1. (첫 번째 요약 문장)
2. (두 번째 요약 문장)
3. (세 번째 요약 문장)

### 🔍 **핵심 기능 및 내용 요약**  
**✅ 주요 기능**: 
- (웹페이지에서 제공하는 핵심 기능 1)
- (웹페이지에서 제공하는 핵심 기능 2)

**📚 핵심 내용**: 
- (웹페이지에서 전달하는 주요 메시지/정보 1)
- (웹페이지에서 전달하는 주요 메시지/정보 2)

**🌟 특징적인 요소**: 
- (특별히 눈에 띄는 요소 1 - 예: 대화형 기능, 데이터 시각화 등)
- (특별히 눈에 띄는 요소 2)

### ❓ **이 글에서 질문할만한 내용 3가지**
1. **Q1**: (첫 번째 질문)
2. **Q2**: (두 번째 질문)
3. **Q3**: (세 번째 질문)

\`\`\`markdown
${markdown}
\`\`\``;
  }

  // 간단한 요약 프롬프트 생성 함수 (ChatGPT로 전송용)
  function generateSimpleSummaryPrompt(markdown) {
    return `다음은 웹페이지에서 추출한 내용입니다. 이 내용을 간결하게 요약해주세요:

${markdown}`;
  }

  // 클립보드에 복사
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("클립보드 복사 실패:", err);
      statusDiv.textContent = "클립보드 복사 실패: " + err.message;
    });
  }
});
