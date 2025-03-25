document.addEventListener("DOMContentLoaded", function () {
  const convertBtn = document.getElementById("convert-btn");
  const copyPromptBtn = document.getElementById("copy-prompt-btn");
  const sendToChatGPTBtn = document.getElementById("send-to-chatgpt-btn");
  const markdownOutput = document.getElementById("markdown-output");
  const statusDiv = document.getElementById("status");

  // 현재 탭 ID 저장 (스크립트 삽입에 사용)
  let currentTabId = null;

  // 페이지 로드 시 현재 탭 ID 가져오기
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0) {
      currentTabId = tabs[0].id;
      console.log("현재 탭 ID:", currentTabId);
    }
  });

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

    // 먼저 클립보드에 복사
    copyToClipboard(summaryPrompt);

    // chrome.storage.local에 저장
    chrome.storage.local.set(
      {
        markdownToAI: summaryPrompt,
        lastUsedAt: new Date().toISOString(),
      },
      function () {
        if (chrome.runtime.lastError) {
          statusDiv.textContent =
            "저장 오류: " + chrome.runtime.lastError.message;
          return;
        }

        console.log("프롬프트가 storage에 저장되었습니다.");
        statusDiv.textContent =
          "프롬프트가 클립보드에 복사되었습니다. ChatGPT로 이동 중...";

        // ChatGPT 페이지 열기
        chrome.tabs.create(
          { url: "https://chat.openai.com/" },
          function (newTab) {
            if (chrome.runtime.lastError) {
              statusDiv.textContent =
                "ChatGPT 열기 오류: " + chrome.runtime.lastError.message;
            } else {
              window.close(); // 팝업 창 닫기
            }
          }
        );
      }
    );
  });

  // 변환 및 복사 기능을 하나로 통합한 함수
  function convertAndCopy(callback) {
    statusDiv.textContent = "페이지 변환 중...";
    markdownOutput.value = "";

    console.log("웹페이지 변환 시작...", new Date().toISOString());

    // 활성 탭 정보 가져오기
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        const errorMsg = "활성 탭을 찾을 수 없습니다.";
        statusDiv.textContent = errorMsg;
        console.error(errorMsg);
        return;
      }

      console.log("활성 탭 정보:", tabs[0].url);

      // 스크립트 삽입 요청 전에 상태 표시
      statusDiv.innerHTML = `<div>페이지 변환 중... <span style="color: #777;">(${tabs[0].url})</span></div><div style="margin-top: 5px; font-size: 12px;">스크립트 삽입 중...</div>`;

      // 백그라운드 스크립트에게 turndown.js와 content.js 삽입 요청
      console.log("스크립트 삽입 요청 중...");
      chrome.runtime.sendMessage(
        { action: "injectTurndown", tabId: tabs[0].id },
        function (response) {
          if (chrome.runtime.lastError) {
            const errorMsg =
              "메시지 전송 오류: " + chrome.runtime.lastError.message;
            console.error(errorMsg);
            statusDiv.innerHTML = `<div style="color: #f44336;">스크립트 삽입 중 오류가 발생했습니다:</div><div style="margin-top: 5px;">${chrome.runtime.lastError.message}</div>`;
            return;
          }

          if (!response || !response.success) {
            const errorMsg = "스크립트 삽입에 실패했습니다.";
            console.error(errorMsg, response);
            statusDiv.textContent = errorMsg;
            return;
          }

          console.log("스크립트 삽입 성공, 변환 요청 준비");
          statusDiv.innerHTML = `<div>페이지 변환 중...</div><div style="margin-top: 5px; font-size: 12px;">스크립트 삽입 완료, 변환 중...</div>`;

          // 스크립트가 삽입되었으므로 변환 요청
          setTimeout(function () {
            console.log("변환 요청 전송...");
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "convert" },
              function (convertResponse) {
                if (chrome.runtime.lastError) {
                  const errorMsg =
                    "변환 요청 오류: " + chrome.runtime.lastError.message;
                  console.error(errorMsg);
                  statusDiv.innerHTML = `<div style="color: #f44336;">페이지 변환 중 오류가 발생했습니다:</div><div style="margin-top: 5px;">${chrome.runtime.lastError.message}</div>`;

                  // 변환 오류 시 직접 변환 시도 버튼 추가
                  const retryBtn = document.createElement("button");
                  retryBtn.textContent = "직접 변환 시도";
                  retryBtn.style.marginTop = "10px";
                  retryBtn.style.padding = "5px 10px";
                  retryBtn.onclick = function () {
                    directConversion(tabs[0].id);
                  };
                  statusDiv.appendChild(retryBtn);
                  return;
                }

                if (!convertResponse || !convertResponse.markdown) {
                  const errorMsg = "마크다운 변환에 실패했습니다.";
                  console.error(errorMsg, convertResponse);
                  statusDiv.textContent = errorMsg;
                  return;
                }

                console.log(
                  "변환 성공! 마크다운 길이:",
                  convertResponse.markdown.length
                );

                // 변환 성공, 결과 표시
                markdownOutput.value = convertResponse.markdown;

                // 변환 후 자동으로 클립보드에 복사
                copyToClipboard(convertResponse.markdown, false); // 성공 메시지 감추기

                statusDiv.innerHTML = `<div style="color: #4caf50;">변환 완료! 클립보드에 복사되었습니다.</div><div style="margin-top: 5px; font-size: 12px;">${convertResponse.markdown.length} 자</div>`;

                // 콜백 함수가 제공된 경우 실행
                if (typeof callback === "function") {
                  callback(convertResponse.markdown);
                }
              }
            );
          }, 1000); // 스크립트 로딩을 위한 시간 지연 (1초로 늘림)
        }
      );
    });
  }

  // 백업: 직접 변환 시도하는 함수
  function directConversion(tabId) {
    statusDiv.textContent = "직접 변환 시도 중...";

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        function: function () {
          // 페이지 텍스트 내용 추출
          const title = document.title;

          // 주요 콘텐츠 영역 찾기
          let content = "";
          const article = document.querySelector("article");
          const main = document.querySelector("main");

          if (article) {
            content = article.innerText || article.textContent;
          } else if (main) {
            content = main.innerText || main.textContent;
          } else {
            content = document.body.innerText || document.body.textContent;
          }

          // 기본 마크다운 형식 생성
          let markdown = `# ${title}\n\n`;
          markdown += `URL: ${window.location.href}\n\n`;
          markdown += content;

          return { markdown: markdown };
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent =
            "직접 변환 실패: " + chrome.runtime.lastError.message;
          return;
        }

        if (results && results[0] && results[0].result) {
          markdownOutput.value = results[0].result.markdown;
          statusDiv.textContent = "직접 변환 완료!";
        } else {
          statusDiv.textContent = "직접 변환 결과를 얻지 못했습니다.";
        }
      }
    );
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

  // 클립보드에 복사 - execCommand 방식으로 변경
  function copyToClipboard(text, showMessage = true) {
    // 사용자에게 복사 진행 중임을 알림
    if (showMessage) {
      statusDiv.textContent = "클립보드에 복사 중...";
    }
    console.log("복사 시도 - 텍스트 길이:", text.length);

    try {
      // 임시 textarea 생성
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = text;
      tempTextArea.style.position = "fixed"; // 화면 밖에 위치
      tempTextArea.style.left = "-9999px";
      tempTextArea.style.top = "0";
      document.body.appendChild(tempTextArea);

      // 텍스트 선택 및 복사
      tempTextArea.select();
      tempTextArea.setSelectionRange(0, 99999999); // 모바일 지원

      const successful = document.execCommand("copy");

      // 임시 element 제거
      document.body.removeChild(tempTextArea);

      // 결과 처리
      if (successful) {
        console.log("복사 성공!");
        if (showMessage) {
          statusDiv.textContent = "클립보드에 복사되었습니다!";

          // 시각적 피드백 강화
          statusDiv.style.backgroundColor = "#4caf50";
          statusDiv.style.color = "white";
          statusDiv.style.padding = "5px";
          statusDiv.style.borderRadius = "4px";

          // 3초 후 원래 스타일로 복원
          setTimeout(() => {
            statusDiv.style.backgroundColor = "";
            statusDiv.style.color = "";
            statusDiv.style.padding = "";
            statusDiv.style.borderRadius = "";
          }, 3000);
        }
        return true;
      } else {
        throw new Error("execCommand('copy') 실패");
      }
    } catch (err) {
      console.error("복사 실패:", err);
      if (showMessage) {
        statusDiv.textContent = "클립보드 복사 실패: " + err.message;
        statusDiv.style.color = "#f44336";

        // 대체 UI - 직접 선택하라는 안내
        const copyArea = document.createElement("div");
        copyArea.style.marginTop = "10px";
        copyArea.innerHTML = `
          <p style="color: #f44336;">자동 복사가 실패했습니다. 아래 텍스트를 직접 선택하여 복사하세요:</p>
          <textarea style="width: 100%; height: 100px; margin-top: 5px; padding: 5px;">${text.substring(
            0,
            500
          )}...</textarea>
          <p style="font-size: 12px; color: #777;">* 전체 텍스트는 메인 텍스트 영역에서 확인할 수 있습니다.</p>
        `;
        statusDiv.appendChild(copyArea);
      }
      return false;
    }
  }
});
