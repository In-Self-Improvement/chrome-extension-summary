// ChatGPT 페이지에서 텍스트를 붙여넣기 위한 간단한 스크립트
(function () {
  console.log(
    "ChatGPT 페이지에서 자동 실행되는 스크립트가 로드되었습니다.",
    new Date().toISOString()
  );

  // 초기화를 위한 지연 실행 (React 앱이 완전히 로드 및 렌더링 완료되도록)
  setTimeout(checkAndProcess, 5000);

  // 알림 스타일 정의
  const notificationCSS = document.createElement("style");
  notificationCSS.textContent = `
    .markdown-extension-notification {
      position: fixed; 
      top: 20px; 
      left: 50%; 
      transform: translateX(-50%);
      z-index: 10000; 
      padding: 12px 16px; 
      border-radius: 6px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
      font-family: system-ui, -apple-system, sans-serif; 
      font-size: 14px; 
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      max-width: 90%;
      min-width: 300px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .markdown-extension-notification.success {
      background-color: #4caf50; 
      color: white;
    }
    .markdown-extension-notification.error {
      background-color: #f44336; 
      color: white;
    }
    .markdown-extension-notification .close-btn {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      margin-left: 12px;
      font-size: 16px;
      padding: 0 6px;
    }
  `;
  document.head.appendChild(notificationCSS);

  // 입력 필드 찾기 함수
  async function findInputField() {
    const maxAttempts = 20; // 최대 20초 대기
    let attempts = 0;

    console.log("입력 필드 찾기 시작...");

    while (attempts < maxAttempts) {
      // 다양한 선택자로 시도
      const selectors = [
        'textarea[data-id="root"]',
        'textarea[placeholder*="Send a message"]',
        'textarea[placeholder*="메시지 보내기"]',
        "textarea.chat-textarea",
        'div[contenteditable="true"]',
        "textarea",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`입력 필드 찾음! 선택자: ${selector}`);
          return element;
        }
      }

      console.log(`입력 필드 찾기 시도 ${attempts + 1}/${maxAttempts}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    console.error("입력 필드를 찾을 수 없습니다.");
    // 디버깅을 위해 DOM 구조 로깅
    console.log(
      "현재 DOM 구조:",
      document.body.innerHTML.substring(0, 1000) + "..."
    );
    throw new Error("입력 필드를 찾을 수 없습니다.");
  }

  // 텍스트 입력 및 엔터키 전송 함수
  async function pasteAndSend(text, retryCount = 0) {
    const maxRetries = 2;

    try {
      console.log(`텍스트 입력 시도 (${retryCount + 1}/${maxRetries + 1})...`);
      console.log("텍스트 길이:", text.length);
      console.log("텍스트 미리보기:", text.substring(0, 100) + "...");

      // 1. 먼저 클립보드 확인
      try {
        const clipboardContent = await navigator.clipboard.readText();
        console.log("현재 클립보드 내용 길이:", clipboardContent.length);
        console.log(
          "클립보드 미리보기:",
          clipboardContent.substring(0, 50) + "..."
        );

        // 클립보드와 전송할 텍스트가 일치하는지 확인
        if (clipboardContent.trim() !== text.trim()) {
          console.log("클립보드 내용이 전송할 텍스트와 다릅니다. 복사 시도...");
          await navigator.clipboard.writeText(text);
          console.log("텍스트를 클립보드에 복사했습니다.");
        } else {
          console.log("클립보드에 이미 올바른 텍스트가 있습니다.");
        }
      } catch (clipboardError) {
        console.warn("클립보드 접근 오류:", clipboardError);
        // 오류 발생 시 클립보드 복사 시도
        try {
          // 임시 텍스트 영역 생성
          const tempTextArea = document.createElement("textarea");
          tempTextArea.value = text;
          document.body.appendChild(tempTextArea);
          tempTextArea.select();
          document.execCommand("copy");
          document.body.removeChild(tempTextArea);
          console.log("execCommand를 사용하여 클립보드에 복사했습니다.");
        } catch (e) {
          console.error("모든 클립보드 복사 방법 실패:", e);
        }
      }

      // 2. 입력 필드 찾기
      const inputElement = await findInputField();
      console.log(
        "입력 필드 DOM 요소:",
        inputElement.tagName,
        inputElement.className
      );

      // 3. 입력 필드에 포커스 및 클릭
      inputElement.focus();
      inputElement.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("입력 필드에 포커스 및 클릭 완료");

      // 4. 입력 방법 시도
      let inputSuccess = false;

      // 방법 1: 직접 값 설정
      if (typeof inputElement.value !== "undefined") {
        inputElement.value = text;
        console.log("value 속성으로 텍스트 입력 완료");
        inputSuccess = true;
      } else if (typeof inputElement.textContent !== "undefined") {
        inputElement.textContent = text;
        console.log("textContent로 텍스트 입력 완료");
        inputSuccess = true;
      }

      // 방법 2: 붙여넣기 시도 (방법 1이 실패한 경우)
      if (!inputSuccess) {
        // 키보드 이벤트 시뮬레이션 - Ctrl+V (Mac에서는 Command+V)
        const isMac = navigator.platform.indexOf("Mac") !== -1;

        // Ctrl/Command 키 누름
        const modifierKey = new KeyboardEvent("keydown", {
          key: isMac ? "Meta" : "Control",
          code: isMac ? "MetaLeft" : "ControlLeft",
          keyCode: isMac ? 91 : 17,
          which: isMac ? 91 : 17,
          metaKey: isMac,
          ctrlKey: !isMac,
          bubbles: true,
        });
        inputElement.dispatchEvent(modifierKey);

        // V 키 누름
        const vKey = new KeyboardEvent("keydown", {
          key: "v",
          code: "KeyV",
          keyCode: 86,
          which: 86,
          metaKey: isMac,
          ctrlKey: !isMac,
          bubbles: true,
        });
        inputElement.dispatchEvent(vKey);

        // document.execCommand로 붙여넣기 시도 (백업 방법)
        try {
          document.execCommand("paste");
          console.log("document.execCommand('paste') 실행");
        } catch (e) {
          console.warn("document.execCommand('paste') 실패:", e);
        }
      }

      // 5. 이벤트 발생
      const events = ["input", "change"];
      for (const eventType of events) {
        inputElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // 6. 입력 확인
      console.log("현재 입력 필드의 텍스트 확인...");
      if (typeof inputElement.value !== "undefined") {
        const inputValue = inputElement.value;
        console.log(
          "입력된 텍스트 길이:",
          inputValue.length,
          "미리보기:",
          inputValue.substring(0, 50) + "..."
        );

        // 입력이 비어 있거나 불완전하면 재시도 준비
        if (
          (!inputValue || inputValue.length < text.length * 0.5) &&
          retryCount < maxRetries
        ) {
          console.warn("입력 필드가 비어 있거나 텍스트가 불완전합니다.");
          throw new Error("입력 필드에 텍스트가 제대로 입력되지 않았습니다.");
        }
      }

      // 7. 전송 버튼 찾아 클릭
      const sendButton = findSendButton();
      if (sendButton) {
        console.log("전송 버튼 찾음, 클릭 시도...");
        sendButton.click();
        console.log("전송 버튼 클릭 완료");
      } else {
        // 엔터키 이벤트 발생시키기
        console.log("전송 버튼을 찾을 수 없어 엔터키 이벤트 사용");
        const enterEvent = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        });
        inputElement.dispatchEvent(enterEvent);
      }

      console.log("텍스트 입력 및 전송 완료");
      showSimpleNotification("텍스트가 성공적으로 입력되었습니다!");
    } catch (error) {
      console.error("텍스트 입력 실패:", error);

      if (retryCount < maxRetries) {
        console.log(`재시도 중... (${retryCount + 2}/${maxRetries + 1})`);
        showSimpleNotification(
          `입력 재시도 중... (${retryCount + 2}/${maxRetries + 1})`,
          true
        );
        // 2초 후 재시도
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return pasteAndSend(text, retryCount + 1);
      } else {
        console.error("최대 재시도 횟수 초과, 실패");
        showSimpleNotification(
          `텍스트 입력에 실패했습니다: ${error.message}`,
          true
        );
      }
    }
  }

  // 전송 버튼 찾기 함수
  function findSendButton() {
    const buttonSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      "button.send-button",
      "button.submit",
      'button[type="submit"]',
      // 아이콘 버튼 찾기
      'button svg[viewBox="0 0 24 24"]',
      // 클래스로 찾기
      "div.submit-button button",
    ];

    for (const selector of buttonSelectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }

    // 버튼 내부의 SVG 아이콘 등을 통해 찾기
    const allButtons = document.querySelectorAll("button");
    for (const button of allButtons) {
      // 버튼 내에 종이비행기 아이콘이나 화살표 아이콘 등이 있는지 확인
      if (
        button.innerHTML.includes("svg") &&
        (button.innerHTML.includes("arrow") ||
          button.innerHTML.includes("send") ||
          button.innerHTML.includes("paper-plane"))
      ) {
        return button;
      }
    }

    return null;
  }

  // 간단한 알림 표시
  function showSimpleNotification(message, isError = false) {
    console.log(`알림: ${message}`);

    // DOM 기반 알림
    const notification = document.createElement("div");
    notification.className = `markdown-extension-notification ${
      isError ? "error" : "success"
    }`;
    notification.textContent = message;
    notification.style.zIndex = "10000";
    notification.style.opacity = "0";

    // 닫기 버튼
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "×";
    closeBtn.onclick = () => notification.remove();

    notification.appendChild(closeBtn);
    document.body.appendChild(notification);

    // 애니메이션 효과
    setTimeout(() => {
      notification.style.opacity = "1";
    }, 10);

    // 5초 후 자동으로 사라짐
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  // 스토리지 체크 및 알림 처리
  function checkAndProcess() {
    console.log("스토리지 확인 중...");

    chrome.storage.local.get(["markdownToAI"], function (result) {
      if (!result.markdownToAI) {
        console.log("삽입할 텍스트가 없습니다.");
        return;
      }

      const text = result.markdownToAI;
      console.log("텍스트가 발견되었습니다. 길이:", text.length);

      // 텍스트 입력 및 전송 실행
      pasteAndSend(text).then(() => {
        // 작업이 완료되었으므로 스토리지에서 데이터 삭제
        chrome.storage.local.remove(["markdownToAI"], function () {
          console.log("스토리지에서 데이터가 삭제되었습니다.");
        });
      });
    });
  }
})();
