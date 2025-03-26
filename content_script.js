// ChatGPT 페이지에서 텍스트를 붙여넣기 위한 간단한 스크립트
(function () {
  // DOM에 디버그 로그를 표시하는 함수
  function logToDOM(message, isError = false) {
    console.log(message); // 콘솔에도 기록

    // 로그 컨테이너 생성 또는 가져오기
    let logContainer = document.getElementById("extension-log-container");
    if (!logContainer) {
      logContainer = document.createElement("div");
      logContainer.id = "extension-log-container";
      logContainer.style.position = "fixed";
      logContainer.style.top = "10px";
      logContainer.style.right = "10px";
      logContainer.style.width = "300px";
      logContainer.style.maxHeight = "500px";
      logContainer.style.overflowY = "auto";
      logContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      logContainer.style.color = "white";
      logContainer.style.padding = "10px";
      logContainer.style.borderRadius = "5px";
      logContainer.style.zIndex = "9999";
      logContainer.style.fontFamily = "monospace";
      logContainer.style.fontSize = "12px";

      // 닫기 버튼 추가
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "X";
      closeBtn.style.float = "right";
      closeBtn.style.backgroundColor = "#f44336";
      closeBtn.style.border = "none";
      closeBtn.style.color = "white";
      closeBtn.style.padding = "2px 5px";
      closeBtn.style.cursor = "pointer";
      closeBtn.onclick = function () {
        logContainer.style.display = "none";
      };
      logContainer.appendChild(closeBtn);

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "로그 지우기";
      clearBtn.style.float = "right";
      clearBtn.style.backgroundColor = "#555";
      clearBtn.style.border = "none";
      clearBtn.style.color = "white";
      clearBtn.style.padding = "2px 5px";
      clearBtn.style.marginRight = "5px";
      clearBtn.style.cursor = "pointer";
      clearBtn.onclick = function () {
        const logs = logContainer.querySelectorAll(".log-entry");
        logs.forEach((log) => log.remove());
      };
      logContainer.appendChild(clearBtn);

      document.body.appendChild(logContainer);
    }

    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.style.borderBottom = "1px solid #444";
    entry.style.padding = "5px 0";
    entry.style.color = isError ? "#ff6b6b" : "#a8ff60";
    entry.textContent = `[${timestamp}] ${message}`;

    // 기존 로그가 있는 경우 그 앞에 추가
    if (logContainer.querySelector(".log-entry")) {
      logContainer.insertBefore(
        entry,
        logContainer.querySelector(".log-entry")
      );
    } else {
      logContainer.appendChild(entry);
    }
  }

  // 페이지 로드 시 항상 실행되는 초기화 로그
  logToDOM("Content script initialized", false);
  logToDOM("Current URL: " + window.location.href, false);

  // 스토리지 데이터 확인하기 위한 함수
  function checkStorageData() {
    logToDOM("Checking storage data...");
    chrome.storage.local.get(null, function (items) {
      if (chrome.runtime.lastError) {
        logToDOM(
          "Error getting storage data: " + chrome.runtime.lastError.message,
          true
        );
        return;
      }

      logToDOM("Storage data: " + JSON.stringify(items, null, 2));

      // markdownToAI 데이터가 있으면 표시
      if (items.markdownToAI) {
        logToDOM(
          "markdownToAI data found, length: " + items.markdownToAI.length
        );
      } else {
        logToDOM("No markdownToAI data found", true);
      }
    });
  }

  // 페이지 로드 후 1초 후에 스토리지 데이터 확인
  setTimeout(checkStorageData, 1000);

  // checkAndProcess 함수 수정 - 기존 내용 대체
  function checkAndProcess() {
    logToDOM("checkAndProcess 함수 실행됨");

    try {
      chrome.storage.local.get(
        ["markdownToAI", "lastUsedAt"],
        function (result) {
          logToDOM(
            "스토리지 데이터 확인 결과: " + Object.keys(result).join(", ")
          );

          if (chrome.runtime.lastError) {
            logToDOM(
              "스토리지 접근 중 오류: " + chrome.runtime.lastError.message,
              true
            );
            return;
          }

          if (result.markdownToAI) {
            const text = result.markdownToAI;
            logToDOM(
              "markdownToAI 데이터 발견: " +
                text.substring(0, 30) +
                "... (길이: " +
                text.length +
                ")"
            );

            // 전역 변수에 저장
            window.markdownToAIPending = text;

            // 입력 필드 찾기 시도
            const inputField = findInputField();

            if (inputField) {
              logToDOM(
                "입력 필드 발견, ID: " +
                  inputField.id +
                  ", 클래스: " +
                  inputField.className
              );

              // 페이지에 포커스 주기 시도
              window.focus();
              inputField.focus();

              // 잠시 대기 후 pasteAndSend 실행 (포커스를 얻기 위한 시간 확보)
              setTimeout(() => {
                pasteAndSend(text, inputField);

                // 사용 후 스토리지 데이터 삭제
                chrome.storage.local.remove(["markdownToAI"], function () {
                  logToDOM("markdownToAI 데이터 삭제됨");
                  // 삭제 후 스토리지 상태 다시 확인
                  setTimeout(checkStorageData, 500);
                });
              }, 500);
            } else {
              logToDOM("입력 필드를 찾을 수 없음", true);

              // 페이지 구조 디버깅을 위한 정보
              logToDOM("페이지 내 입력 필드 후보들:");
              const candidates = [
                document.querySelector('div[contenteditable="true"]'),
                document.querySelector("textarea"),
                document.querySelector('input[type="text"]'),
                document.querySelector(".ProseMirror"),
                document.getElementById("prompt-textarea"),
              ];

              candidates.forEach((elem, i) => {
                if (elem) {
                  logToDOM(
                    `후보 ${i + 1}: ${elem.tagName}, ID: ${elem.id}, 클래스: ${
                      elem.className
                    }`
                  );
                } else {
                  logToDOM(`후보 ${i + 1}: 없음`);
                }
              });

              // 입력 필드를 찾지 못했지만 데이터는 있으므로 삭제하지 않음
              logToDOM(
                "입력 필드를 찾지 못했습니다. 데이터는 유지됩니다. 나중에 다시 시도하세요.",
                true
              );
            }
          } else {
            logToDOM("markdownToAI 데이터가 없습니다");
          }
        }
      );
    } catch (error) {
      logToDOM("checkAndProcess 실행 중 예외 발생: " + error.message, true);
      console.error("Error in checkAndProcess:", error);
    }
  }

  // findInputField 함수를 더 강력하게 개선
  function findInputField() {
    logToDOM("입력 필드 찾는 중...");

    // 여러 선택자를 시도하여 입력 필드 찾기
    const selectors = [
      'div[contenteditable="true"][class*="ProseMirror"]',
      'div[contenteditable="true"]',
      'div[data-id="root"]',
      "textarea#prompt-textarea",
      "#prompt-textarea",
      '.ProseMirror[contenteditable="true"]',
    ];

    let inputField = null;

    // 각 선택자를 시도
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        for (const element of elements) {
          // 한국어 placeholder 문구로 필터링
          if (
            element
              .getAttribute("placeholder")
              ?.includes("메시지를 입력하세요") ||
            element.getAttribute("placeholder")?.includes("Send a message") ||
            element.id === "prompt-textarea" ||
            element.classList.contains("ProseMirror")
          ) {
            inputField = element;
            logToDOM(`입력 필드 발견: ${selector}`);
            break;
          }
        }
        if (inputField) break;
      }
    }

    // 마지막 시도: 페이지의 모든 contenteditable 요소 검색
    if (!inputField) {
      const allContentEditables = document.querySelectorAll(
        '[contenteditable="true"]'
      );
      logToDOM(`contenteditable 요소 ${allContentEditables.length}개 발견`);

      if (allContentEditables.length > 0) {
        // 가장 큰 contenteditable 요소를 선택 (대화 입력란일 가능성이 높음)
        let maxHeight = 0;
        for (const el of allContentEditables) {
          const rect = el.getBoundingClientRect();
          if (rect.height > maxHeight) {
            maxHeight = rect.height;
            inputField = el;
          }
        }

        if (inputField) {
          logToDOM(
            `가장 큰 contenteditable 요소 선택됨 (높이: ${maxHeight}px)`
          );
        }
      }
    }

    return inputField;
  }

  // pasteAndSend 함수 개선
  function pasteAndSend(text, inputField) {
    logToDOM("pasteAndSend 함수 실행됨, 텍스트 길이: " + text.length);

    try {
      // 포커스 확인 및 설정
      if (document.hasFocus()) {
        logToDOM("문서가 포커스되어 있습니다.");
      } else {
        logToDOM("문서가 포커스되어 있지 않습니다. 포커스 시도...");
        window.focus();
        inputField.focus();
      }

      // 대체 복사 방법 사용 - execCommand 방식
      logToDOM("대체 복사 방법 사용(클립보드 API 우회)...");

      // 1. 직접 입력 설정
      if (
        inputField.tagName.toLowerCase() === "textarea" ||
        inputField.tagName.toLowerCase() === "input"
      ) {
        inputField.value = text;
        logToDOM("입력 필드에 직접 값 설정됨");
      } else {
        inputField.textContent = text;
        logToDOM("입력 필드에 직접 textContent 설정됨");
      }

      // 2. 변경 이벤트 발생시키기
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      inputField.dispatchEvent(new Event("change", { bubbles: true }));
      logToDOM("입력/변경 이벤트 전송됨");

      // 3. 전송 버튼 찾아 클릭
      setTimeout(() => {
        const sendButtons = [
          document.querySelector('button[data-testid="send-button"]'),
          document.querySelector("button.absolute.p-1"),
          document.querySelector('button[aria-label="Send message"]'),
          document
            .querySelector('button svg[data-icon="paper-plane"]')
            ?.closest("button"),
          // 추가 후보
          document.querySelector('button[class*="bottom"]'),
          document.querySelector("button:has(svg)"),
        ].filter(Boolean);

        if (sendButtons.length > 0) {
          const sendButton = sendButtons[0];
          logToDOM(
            "전송 버튼 발견: " +
              (sendButton.outerHTML
                ? sendButton.outerHTML.substring(0, 50)
                : "HTML 정보 없음")
          );

          // 버튼 정보 상세 로깅
          logToDOM(
            `버튼 정보 - 태그: ${sendButton.tagName}, ID: ${sendButton.id}, 클래스: ${sendButton.className}`
          );

          // 버튼이 활성화되어 있는지 확인
          const isDisabled =
            sendButton.disabled ||
            sendButton.getAttribute("aria-disabled") === "true";
          if (isDisabled) {
            logToDOM("전송 버튼이 비활성화되어 있습니다", true);
            // 버튼이 비활성화된 이유 확인 시도
            logToDOM(
              "입력 필드 내용 확인: " +
                (inputField.value || inputField.textContent || "내용 없음")
            );
          } else {
            // 버튼 클릭
            sendButton.click();
            logToDOM("전송 버튼 클릭됨");
          }
        } else {
          logToDOM("전송 버튼을 찾을 수 없습니다", true);

          // 엔터키 이벤트로 전송 시도
          logToDOM("엔터키 이벤트로 전송 시도...");
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          inputField.dispatchEvent(enterEvent);
          logToDOM("엔터키 이벤트 전송됨");
        }
      }, 1000); // 버튼 찾기를 위한 시간 더 확보
    } catch (error) {
      logToDOM("pasteAndSend 실행 중 예외 발생: " + error.message, true);
      console.error("Error in pasteAndSend:", error);
    }
  }

  // 디버깅 버튼 추가
  function addDebugButton() {
    if (document.getElementById("extension-debug-button")) return;

    const debugButton = document.createElement("button");
    debugButton.id = "extension-debug-button";
    debugButton.textContent = "확장 프로그램 디버그";
    debugButton.style.position = "fixed";
    debugButton.style.bottom = "10px";
    debugButton.style.right = "10px";
    debugButton.style.padding = "5px 10px";
    debugButton.style.backgroundColor = "#4CAF50";
    debugButton.style.color = "white";
    debugButton.style.border = "none";
    debugButton.style.borderRadius = "5px";
    debugButton.style.zIndex = "9999";
    debugButton.style.cursor = "pointer";

    debugButton.onclick = function () {
      // 로그 컨테이너 표시/숨기기
      const logContainer = document.getElementById("extension-log-container");
      if (logContainer) {
        logContainer.style.display =
          logContainer.style.display === "none" ? "block" : "none";
      }

      // 현재 상태 재확인
      checkStorageData();

      // 입력 필드 다시 찾기
      const inputField = findInputField();
      if (inputField) {
        logToDOM(
          `입력 필드 재확인: ${inputField.tagName}, ID: ${inputField.id}, 클래스: ${inputField.className}`
        );
      } else {
        logToDOM("입력 필드를 찾을 수 없음", true);
      }

      // 페이지 정보 출력
      logToDOM("페이지 URL: " + window.location.href);
      logToDOM(
        "window.markdownToAIPending: " +
          (window.markdownToAIPending ? "있음" : "없음")
      );
    };

    // 테스트 버튼 추가
    const testPasteButton = document.createElement("button");
    testPasteButton.textContent = "붙여넣기 테스트";
    testPasteButton.style.position = "fixed";
    testPasteButton.style.bottom = "10px";
    testPasteButton.style.right = "150px";
    testPasteButton.style.padding = "5px 10px";
    testPasteButton.style.backgroundColor = "#2196F3";
    testPasteButton.style.color = "white";
    testPasteButton.style.border = "none";
    testPasteButton.style.borderRadius = "5px";
    testPasteButton.style.zIndex = "9999";
    testPasteButton.style.cursor = "pointer";

    testPasteButton.onclick = function () {
      const testText =
        "이것은 확장 프로그램 테스트 메시지입니다. " +
        new Date().toLocaleString();
      logToDOM("테스트 텍스트 붙여넣기: " + testText);

      const inputField = findInputField();
      if (inputField) {
        pasteAndSend(testText, inputField);
      } else {
        logToDOM("입력 필드를 찾을 수 없어 테스트를 실행할 수 없습니다", true);
      }
    };

    document.body.appendChild(debugButton);
    document.body.appendChild(testPasteButton);

    logToDOM("디버그 버튼 추가됨");
  }

  // 페이지 준비되면 디버그 버튼 추가
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(addDebugButton, 2000);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(addDebugButton, 2000);
    });
  }

  // 페이지 로드 확인을 위한 MutationObserver 설정
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && document.body) {
        logToDOM("페이지 DOM 변경 감지됨");
        if (!document.getElementById("extension-debug-button")) {
          setTimeout(addDebugButton, 1000);
        }
      }
    }
  });

  // 초기 실행 시간 늘리기
  setTimeout(checkAndProcess, 7000); // 5초에서 7초로 증가

  // 필요시 mutation observer 시작
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    logToDOM("MutationObserver 시작됨");
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      observer.observe(document.body, { childList: true, subtree: true });
      logToDOM("DOMContentLoaded 이후 MutationObserver 시작됨");
    });
  }

  // 전역 객체에 함수 노출
  window.EXTENSION_DEBUG_FUNCTIONS = {
    checkAndProcess,
    findInputField,
    pasteAndSend,
    logToDOM,
    checkStorageData,
  };
})();
