// 익스텐션이 설치되거나 업데이트될 때 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log("웹페이지 Markdown 변환기가 설치되었습니다.");
});

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectTurndown") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        // turndown.js 스크립트 삽입
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["turndown.js"],
        });

        // content.js 스크립트 삽입
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content.js"],
        });

        sendResponse({ success: true });
      } catch (error) {
        console.error("스크립트 삽입 오류:", error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // 비동기 응답을 위해 true 반환
  }
});
