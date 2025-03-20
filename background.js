// 익스텐션이 설치되거나 업데이트될 때 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log("웹페이지 Markdown 변환기가 설치되었습니다.");
});

// 확장 프로그램 아이콘 클릭 이벤트
chrome.action.onClicked.addListener(async (tab) => {
  console.log("확장 프로그램 아이콘 클릭됨");

  try {
    // 현재 활성화된 탭의 URL 및 콘텐츠 가져오기
    const pageContent = await getPageContent();

    // 마크다운으로 변환
    const markdownContent = await convertToMarkdown(pageContent);

    // 요약 프롬프트 추가
    const summaryPrompt =
      "다음은 웹페이지에서 추출한 내용입니다. 이 내용을 간결하게 요약해주세요:\n\n";
    const fullContent = summaryPrompt + markdownContent;

    // localStorage에 저장
    await saveToStorage(fullContent);

    // ChatGPT 페이지 열기
    await openChatGPT();
  } catch (error) {
    console.error("아이콘 클릭 처리 중 오류 발생:", error);
    // 오류 알림
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "오류 발생",
      message:
        "페이지 내용을 처리하는 중 문제가 발생했습니다: " + error.message,
    });
  }
});

// 현재 활성화된 탭의 콘텐츠 가져오기
async function getPageContent() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        reject(new Error("활성화된 탭을 찾을 수 없습니다."));
        return;
      }

      const tab = tabs[0];

      try {
        // 탭의 콘텐츠 스크립트 실행
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // 페이지 제목
            const title = document.title;

            // article, main 또는 body 콘텐츠 추출
            let content = "";
            const article = document.querySelector("article");
            const main = document.querySelector("main");

            if (article) {
              content = article.innerText;
            } else if (main) {
              content = main.innerText;
            } else {
              // article이나 main이 없는 경우, body에서 주요 콘텐츠 추출 시도
              const body = document.body;
              // 불필요한 요소 제외
              const elementsToExclude = [
                "header",
                "footer",
                "nav",
                "aside",
                "script",
                "style",
                "noscript",
                "iframe",
              ];

              // body의 복제본 생성
              const tempBody = body.cloneNode(true);

              // 불필요한 요소 제거
              elementsToExclude.forEach((selector) => {
                const elements = tempBody.querySelectorAll(selector);
                elements.forEach((el) => el.remove());
              });

              content = tempBody.innerText;
            }

            // 여러 줄바꿈 정리
            content = content.replace(/\n{3,}/g, "\n\n");

            return { title, content, url: window.location.href };
          },
        });

        if (!results || results.length === 0 || !results[0].result) {
          reject(new Error("페이지 콘텐츠를 가져올 수 없습니다."));
          return;
        }

        resolve(results[0].result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// 마크다운으로 변환
async function convertToMarkdown(pageInfo) {
  return new Promise((resolve) => {
    // 마크다운 형식 생성
    let markdown = `# ${pageInfo.title}\n\n`;
    markdown += `URL: ${pageInfo.url}\n\n`;
    markdown += pageInfo.content;

    resolve(markdown);
  });
}

// 로컬 스토리지에 저장
async function saveToStorage(markdownContent) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ markdownToAI: markdownContent }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        console.log("마크다운 콘텐츠가 저장되었습니다.");
        resolve();
      }
    });
  });
}

// ChatGPT 페이지 열기
async function openChatGPT() {
  return new Promise((resolve, reject) => {
    const chatGPTUrl = "https://chat.openai.com";

    // 먼저 기존 ChatGPT 탭 검색
    chrome.tabs.query({ url: chatGPTUrl + "/*" }, (tabs) => {
      if (tabs.length > 0) {
        // 기존 탭이 있으면 활성화
        chrome.tabs.update(tabs[0].id, { active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      } else {
        // 기존 탭이 없으면 새 탭 열기
        chrome.tabs.create({ url: chatGPTUrl }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(tab);
          }
        });
      }
    });
  });
}

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
