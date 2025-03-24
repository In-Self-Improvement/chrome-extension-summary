// ChatGPT 페이지에서 텍스트를 붙여넣기 위한 간단한 스크립트
(function () {
  console.log("ChatGPT 페이지에서 자동 실행되는 스크립트가 로드되었습니다.");

  // 초기화를 위한 지연 실행 (React 앱이 완전히 로드 및 렌더링 완료되도록)
  setTimeout(checkAndProcess, 3000);

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

  // 스토리지 체크 및 알림 처리
  function checkAndProcess() {
    chrome.storage.local.get(["markdownToAI"], function (result) {
      if (!result.markdownToAI) {
        console.log("삽입할 텍스트가 없습니다.");
        return;
      }

      const text = result.markdownToAI;
      console.log("텍스트가 발견되었습니다. 클립보드 복사를 시도합니다.");

      // 클립보드에 텍스트 복사
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // 복사 성공 시 React의 DOM 구조와 충돌하지 않는 간단한 메시지 표시
          showSimpleAlert(
            "텍스트가 클립보드에 복사되었습니다.\n준비가 되면 Ctrl+V(Mac의 경우 ⌘+V)로 붙여넣기 하세요."
          );

          // 작업이 완료되었으므로 스토리지에서 데이터 삭제
          chrome.storage.local.remove(["markdownToAI"], function () {
            console.log("스토리지에서 데이터가 삭제되었습니다.");
          });
        })
        .catch((error) => {
          console.error("클립보드 복사 실패:", error);
          showSimpleAlert(
            "클립보드에 복사하지 못했습니다. 오류: " + error.message,
            true
          );
        });
    });
  }

  // React DOM과 충돌하지 않는 단순 알림 표시
  function showSimpleAlert(message, isError) {
    // 브라우저 기본 alert() 사용 - React와 충돌하지 않음
    alert(message);

    // 콘솔에도 메시지 출력
    if (isError) {
      console.error("확장 프로그램 알림 (오류):", message);
    } else {
      console.log("확장 프로그램 알림:", message);
    }
  }
})();
