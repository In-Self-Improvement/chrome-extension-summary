// 익스텐션이 설치되거나 업데이트될 때 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log("웹페이지 Markdown 변환기가 설치되었습니다.");
});

// 확장 프로그램 아이콘 클릭 이벤트
chrome.action.onClicked.addListener(async (tab) => {
  console.log("확장 프로그램 아이콘 클릭됨");

  try {
    // 진행 상태 표시
    chrome.action.setBadgeText({ text: "변환" });
    chrome.action.setBadgeBackgroundColor({ color: "#4285f4" });

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

    // 상태 업데이트
    chrome.action.setBadgeText({ text: "완료" });
    chrome.action.setBadgeBackgroundColor({ color: "#4caf50" });

    // ChatGPT 페이지 열기
    await openChatGPT();

    // 배지 지우기
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  } catch (error) {
    console.error("아이콘 클릭 처리 중 오류 발생:", error);
    // 오류 알림
    chrome.action.setBadgeText({ text: "오류" });
    chrome.action.setBadgeBackgroundColor({ color: "#f44336" });

    // 배지 지우기
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 3000);
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
      console.log("활성화된 탭 정보:", tab.url);

      try {
        // 탭의 콘텐츠 스크립트 실행
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            // 페이지 제목
            const title = document.title;
            console.log("페이지 제목:", title);

            // article, main 또는 body 콘텐츠 추출
            let content = "";
            const article = document.querySelector("article");
            const main = document.querySelector("main");

            if (article) {
              console.log("article 요소 발견");
              content = article.innerText;
            } else if (main) {
              console.log("main 요소 발견");
              content = main.innerText;
            } else {
              console.log("article/main 요소 없음, body에서 추출 시도");
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
            console.log("추출된 콘텐츠 길이:", content.length);

            return { title, content, url: window.location.href };
          },
        });

        if (!results || results.length === 0 || !results[0].result) {
          console.error("콘텐츠 추출 결과가 없습니다:", results);
          reject(new Error("페이지 콘텐츠를 가져올 수 없습니다."));
          return;
        }

        console.log("콘텐츠 추출 성공");
        resolve(results[0].result);
      } catch (error) {
        console.error("콘텐츠 추출 오류:", error);
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

// 메시지 리스너 등록
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectTurndown") {
    console.log("injectTurndown 요청 받음", new Date().toISOString());

    // 1. 명시적으로 전달된 tabId가 있으면 그것을 사용
    if (request.tabId) {
      console.log("요청에서 제공된 tabId 사용:", request.tabId);
      injectScriptsToTab(request.tabId, sendResponse);
      return true;
    }

    // 2. sender.tab이 있는 경우 (content script에서 보낸 메시지)는 그것을 사용
    if (sender && sender.tab) {
      console.log("sender.tab을 통해 탭 ID 사용:", sender.tab.id);
      injectScriptsToTab(sender.tab.id, sendResponse);
      return true;
    }

    // 3. 활성 탭 찾기 시도
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      async (tabs) => {
        try {
          if (!tabs || tabs.length === 0) {
            // 마지막으로 포커스 된 창에서 활성 탭이 없으면 전체 탭 확인
            console.log("활성 탭을 찾을 수 없어 다른 방법으로 시도");

            chrome.tabs.query({}, function (allTabs) {
              if (!allTabs || allTabs.length === 0) {
                throw new Error("열린 탭이 없습니다");
              }

              // 가장 최근에 업데이트된 탭 사용 (일반적으로 현재 사용 중인 탭)
              const mostRecentTab = allTabs.reduce((newest, tab) => {
                return !newest || tab.lastAccessed > newest.lastAccessed
                  ? tab
                  : newest;
              }, null);

              if (mostRecentTab) {
                console.log("최근 탭 사용:", mostRecentTab.url);
                injectScriptsToTab(mostRecentTab.id, sendResponse);
              } else {
                throw new Error("사용 가능한 탭을 찾을 수 없습니다");
              }
            });
            return true;
          }

          console.log("스크립트 삽입 대상 탭:", tabs[0].url);
          injectScriptsToTab(tabs[0].id, sendResponse);
        } catch (error) {
          console.error("스크립트 삽입 오류:", error);
          sendResponse({ success: false, error: error.message });
        }
      }
    );
    return true; // 비동기 응답을 위해 true 반환
  }

  // 디버깅용 메시지 리스너 추가
  if (request.action === "debug") {
    console.log("디버깅 요청 받음:", request);
    // 스토리지 내용 확인
    chrome.storage.local.get(null, function (items) {
      console.log("현재 스토리지 내용:", items);
      sendResponse({ success: true, storage: items });
    });
    return true;
  }
});

// 특정 탭에 스크립트 삽입하는 함수 분리
async function injectScriptsToTab(tabId, sendResponse) {
  try {
    // turndown.js 스크립트 삽입
    console.log("turndown.js 삽입 시도...");
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["turndown.js"],
    });
    console.log("turndown.js 삽입 성공");

    // content.js 스크립트 삽입
    console.log("content.js 삽입 시도...");
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    console.log("content.js 삽입 성공");

    console.log("모든 스크립트 삽입 성공");
    sendResponse({ success: true });
  } catch (error) {
    console.error("스크립트 삽입 오류:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// 로컬 스토리지에 저장
async function saveToStorage(markdownContent) {
  return new Promise((resolve, reject) => {
    console.log(
      "스토리지에 저장 시도, 내용 길이:",
      markdownContent.length,
      "시간:",
      new Date().toISOString()
    );

    // 콘텐츠가 비어있는지 확인
    if (!markdownContent || markdownContent.trim() === "") {
      const error = new Error("저장할 콘텐츠가 비어있습니다");
      console.error(error);
      reject(error);
      return;
    }

    try {
      // 저장 전 기존 데이터 확인
      chrome.storage.local.get(["markdownToAI"], (result) => {
        if (result.markdownToAI) {
          console.log(
            "기존 데이터 발견, 덮어쓰기:",
            result.markdownToAI.substring(0, 100) + "..."
          );
        }

        // 저장 시도
        chrome.storage.local.set(
          {
            markdownToAI: markdownContent,
            lastSavedAt: new Date().toISOString(),
            contentLength: markdownContent.length,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error("스토리지 저장 오류:", chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              // 저장 확인
              chrome.storage.local.get(
                ["markdownToAI", "lastSavedAt"],
                (result) => {
                  if (result.markdownToAI) {
                    const savedLength = result.markdownToAI.length;
                    const originalLength = markdownContent.length;

                    console.log(
                      `마크다운 콘텐츠 저장 완료! 원본 길이: ${originalLength}, 저장된 길이: ${savedLength}, 시간: ${result.lastSavedAt}`
                    );

                    if (savedLength !== originalLength) {
                      console.warn(
                        "저장된 데이터 길이가 원본과 다릅니다! 백업 저장 시도..."
                      );

                      // 백업 저장 시도
                      try {
                        const backupKey = `markdownBackup_${Date.now()}`;
                        chrome.storage.local.set(
                          { [backupKey]: markdownContent },
                          () => {
                            console.log("백업 저장 완료:", backupKey);
                          }
                        );
                      } catch (backupErr) {
                        console.error("백업 저장 실패:", backupErr);
                      }
                    }

                    // 저장된 내용 미리보기
                    console.log(
                      "저장된 콘텐츠 미리보기:",
                      result.markdownToAI.substring(0, 200) + "..."
                    );
                    resolve();
                  } else {
                    console.error("콘텐츠가 저장되지 않았습니다!");
                    reject(new Error("콘텐츠 저장 실패"));
                  }
                }
              );
            }
          }
        );
      });
    } catch (err) {
      console.error("스토리지 저장 중 예외 발생:", err);
      reject(err);
    }
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
