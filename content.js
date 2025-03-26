// 웹페이지 내용을 Markdown으로 변환하는 함수
function convertPageToMarkdown() {
  // 메인 콘텐츠 영역 찾기 (일반적으로 article, main, #content 등)
  let contentElement = document.querySelector(
    "article, main, #content, .content, .article, .post"
  );

  // 메인 콘텐츠 영역이 없으면 body 사용
  if (!contentElement) {
    contentElement = document.body;
  }

  // 콘텐츠 복제
  const clonedContent = contentElement.cloneNode(true);

  // 불필요한 요소 제거 (광고, 네비게이션, 푸터 등)
  // 직접 복제된 콘텐츠에서 선택자로 찾아 제거
  const elementsToRemove = clonedContent.querySelectorAll(
    "nav, footer, .ads, .advertisement, .sidebar, .comments, script, style"
  );

  elementsToRemove.forEach((element) => {
    element.remove();
  });

  // 페이지 제목 가져오기
  const title =
    document.title || document.querySelector("h1")?.textContent || "";

  try {
    // TurndownService 인스턴스 생성
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });

    // HTML을 Markdown으로 변환
    let markdown = "";

    // 제목 추가
    if (title) {
      markdown += `# ${title}\n\n`;
    }

    // 본문 내용 변환
    markdown += turndownService.turndown(clonedContent);

    return markdown;
  } catch (error) {
    console.error("Turndown 변환 오류:", error);
    throw new Error("Markdown 변환 중 오류가 발생했습니다: " + error.message);
  }
}

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "convert") {
    try {
      // TurndownService가 로드되었는지 확인
      if (typeof TurndownService === "undefined") {
        console.error("TurndownService가 정의되지 않았습니다.");
        sendResponse({
          error: "TurndownService가 로드되지 않았습니다.",
        });
        return true;
      }

      const markdown = convertPageToMarkdown();
      sendResponse({
        markdown: markdown,
      });
    } catch (error) {
      console.error("변환 오류:", error);
      sendResponse({
        error: error.message,
      });
    }
    return true;
  }
});

// ChatGPT 페이지에서 텍스트를 붙여넣기 위한 간단한 스크립트
(function () {
  // DOM에 디버그 로그를 표시하는 함수
  function logToDOM(message, isError = false) {
    console.log("DOM 로그: " + message); // 콘솔에도 출력

    // 로그 컨테이너가 없으면 생성
    let logContainer = document.getElementById("extension-debug-log");
    if (!logContainer) {
      logContainer = document.createElement("div");
      logContainer.id = "extension-debug-log";
      logContainer.style.position = "fixed";
      logContainer.style.top = "10px";
      logContainer.style.right = "10px";
      logContainer.style.zIndex = "9999";
      logContainer.style.backgroundColor = "rgba(0,0,0,0.8)";
      logContainer.style.color = "white";
      logContainer.style.padding = "10px";
      logContainer.style.borderRadius = "5px";
      logContainer.style.maxWidth = "400px";
      logContainer.style.maxHeight = "300px";
      logContainer.style.overflowY = "auto";
      logContainer.style.fontSize = "12px";
      logContainer.style.fontFamily = "monospace";

      // 닫기 버튼 추가
      const closeButton = document.createElement("button");
      closeButton.textContent = "X";
      closeButton.style.position = "absolute";
      closeButton.style.top = "5px";
      closeButton.style.right = "5px";
      closeButton.style.background = "transparent";
      closeButton.style.border = "none";
      closeButton.style.color = "white";
      closeButton.style.cursor = "pointer";
      closeButton.onclick = function () {
        logContainer.style.display = "none";
      };

      logContainer.appendChild(closeButton);
      document.body.appendChild(logContainer);
    }

    // 로그 메시지 추가
    const logEntry = document.createElement("div");
    logEntry.style.borderBottom = "1px solid #444";
    logEntry.style.padding = "3px 0";
    logEntry.style.color = isError ? "#ff6b6b" : "#a8ff78";

    // 타임스탬프 추가
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;

    logContainer.appendChild(logEntry);

    // 자동 스크롤
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // 시작 로그
  logToDOM("콘텐츠 스크립트 로드됨: " + new Date().toISOString());
  console.log(
    "ChatGPT 페이지에서 자동 실행되는 스크립트가 로드되었습니다.",
    new Date().toISOString()
  );

  // 초기화를 위한 지연 실행
  setTimeout(function () {
    logToDOM("checkAndProcess 함수 실행 예정");
    checkAndProcess();
  }, 5000);

  // 스토리지 체크 및 알림 처리
  function checkAndProcess() {
    logToDOM("스토리지 확인 중...");
    console.log("스토리지 확인 중...");

    try {
      chrome.storage.local.get(["markdownToAI"], function (result) {
        logToDOM(
          "스토리지 조회 결과: " +
            (result.markdownToAI ? "데이터 있음" : "데이터 없음")
        );

        if (!result.markdownToAI) {
          logToDOM("삽입할 텍스트가 없습니다.");
          console.log("삽입할 텍스트가 없습니다.");
          return;
        }

        const text = result.markdownToAI;
        logToDOM(`텍스트 발견! 길이: ${text.length}`);
        console.log("텍스트가 발견되었습니다. 길이:", text.length);

        // 텍스트 입력 및 전송 실행
        logToDOM("pasteAndSend 함수 호출 직전");
        pasteAndSend(text)
          .then(() => {
            logToDOM("pasteAndSend 완료, 스토리지 데이터 삭제");
            // 작업이 완료되었으므로 스토리지에서 데이터 삭제
            chrome.storage.local.remove(["markdownToAI"], function () {
              logToDOM("스토리지에서 데이터가 삭제되었습니다.");
              console.log("스토리지에서 데이터가 삭제되었습니다.");
            });
          })
          .catch((error) => {
            logToDOM(`pasteAndSend 실패: ${error.message}`, true);
          });
      });
    } catch (error) {
      logToDOM(`checkAndProcess 오류: ${error.message}`, true);
      console.error("checkAndProcess 오류:", error);
    }
  }

  // 텍스트 입력 및 엔터키 전송 함수
  async function pasteAndSend(text, retryCount = 0) {
    const maxRetries = 2;

    try {
      logToDOM(`텍스트 입력 시도 (${retryCount + 1}/${maxRetries + 1})...`);
      console.log(`텍스트 입력 시도 (${retryCount + 1}/${maxRetries + 1})...`);

      // 1. 먼저 클립보드 확인
      try {
        logToDOM("클립보드 내용 확인 중...");
        const clipboardContent = await navigator.clipboard.readText();
        logToDOM(`클립보드 내용 길이: ${clipboardContent.length}`);

        // ... existing code ...
      } catch (clipboardError) {
        logToDOM(`클립보드 접근 오류: ${clipboardError.message}`, true);
        // ... existing code ...
      }

      // 2. 입력 필드 찾기
      logToDOM("입력 필드 찾기 시작...");
      const inputElement = await findInputField();
      logToDOM(
        `입력 필드 찾음: ${inputElement.tagName}, ${inputElement.className}`
      );

      // ... existing code ...

      // 최종 완료 로그
      logToDOM("텍스트 입력 및 전송 완료!");
      console.log("텍스트 입력 및 전송 완료");
      showSimpleNotification("텍스트가 성공적으로 입력되었습니다!");
    } catch (error) {
      logToDOM(`텍스트 입력 실패: ${error.message}`, true);
      console.error("텍스트 입력 실패:", error);

      // ... existing code ...
    }
  }

  // ... existing code ...
})();
