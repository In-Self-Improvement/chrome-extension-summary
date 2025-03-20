document.addEventListener("DOMContentLoaded", function () {
  const convertBtn = document.getElementById("convert-btn");
  const markdownOutput = document.getElementById("markdown-output");
  const statusDiv = document.getElementById("status");

  // 페이지 로드 시 자동으로 변환 시작
  convertAndCopy();

  // 변환 및 복사 버튼 클릭 이벤트
  convertBtn.addEventListener("click", function () {
    convertAndCopy();
  });

  // 변환 및 복사 기능을 하나로 통합한 함수
  function convertAndCopy() {
    statusDiv.textContent = "변환 중...";
    markdownOutput.value = ""; // 이전 결과 초기화

    // 먼저 스크립트 삽입 요청
    chrome.runtime.sendMessage(
      { action: "injectTurndown" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error("스크립트 삽입 오류:", chrome.runtime.lastError);
          statusDiv.textContent =
            "스크립트 삽입 실패: " + chrome.runtime.lastError.message;
          statusDiv.className = "error";
          return;
        }

        if (!response || !response.success) {
          statusDiv.textContent =
            "스크립트 삽입 실패: " + (response?.error || "알 수 없는 오류");
          statusDiv.className = "error";
          return;
        }

        // 스크립트 삽입 성공 후 변환 요청
        setTimeout(() => {
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              if (!tabs || tabs.length === 0) {
                statusDiv.textContent = "활성화된 탭을 찾을 수 없습니다.";
                statusDiv.className = "error";
                return;
              }

              try {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: "convert" },
                  function (response) {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "메시지 전송 오류:",
                        chrome.runtime.lastError
                      );
                      statusDiv.textContent =
                        "변환 실패: " + chrome.runtime.lastError.message;
                      statusDiv.className = "error";
                      return;
                    }

                    if (response && response.markdown) {
                      // 요약 프롬프트 템플릿
                      const summaryPrompt = `아래는 웹페이지의 내용을 담고 있는 Markdown 파일입니다.  
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
${response.markdown}
\`\`\`
`;

                      // 원본 마크다운은 텍스트 영역에 표시
                      markdownOutput.value = response.markdown;

                      // 프롬프트가 포함된 내용을 클립보드에 복사
                      navigator.clipboard
                        .writeText(summaryPrompt)
                        .then(() => {
                          statusDiv.textContent =
                            "요약 프롬프트가 클립보드에 복사되었습니다!";
                          statusDiv.className = "";
                        })
                        .catch((err) => {
                          console.error("클립보드 복사 실패:", err);
                          // 대체 방법으로 시도
                          const tempTextarea =
                            document.createElement("textarea");
                          tempTextarea.value = summaryPrompt;
                          document.body.appendChild(tempTextarea);
                          tempTextarea.select();
                          document.execCommand("copy");
                          document.body.removeChild(tempTextarea);
                          statusDiv.textContent =
                            "요약 프롬프트가 클립보드에 복사되었습니다!";
                          statusDiv.className = "";
                        });

                      // 2초 후 상태 메시지 지우기
                      setTimeout(function () {
                        statusDiv.textContent = "";
                      }, 2000);
                    } else if (response && response.error) {
                      console.error("변환 오류:", response.error);
                      statusDiv.textContent = "변환 실패: " + response.error;
                      statusDiv.className = "error";
                    } else {
                      statusDiv.textContent = "변환 실패. 다시 시도해주세요.";
                      statusDiv.className = "error";
                    }
                  }
                );
              } catch (error) {
                console.error("예외 발생:", error);
                statusDiv.textContent = "오류 발생: " + error.message;
                statusDiv.className = "error";
              }
            }
          );
        }, 500); // 스크립트가 로드될 시간을 주기 위해 약간의 지연 추가
      }
    );
  }
});
