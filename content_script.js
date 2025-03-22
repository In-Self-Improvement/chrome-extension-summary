// ChatGPT 페이지에서 텍스트를 자동으로 붙여넣는 스크립트
(function () {
  console.log("AI 채팅 자동 입력 스크립트가 로드되었습니다.");

  // 현재 호스트 확인
  const host = window.location.host;
  console.log("현재 호스트:", host);

  // 페이지가 완전히 로드된 후 실행
  if (document.readyState === "complete") {
    console.log("페이지가 이미 로드됨");
    setTimeout(getDataAndFillInput, 1500); // 1.5초 후 실행
  } else {
    console.log("페이지 로드 대기 중...");
    window.addEventListener("load", function () {
      setTimeout(getDataAndFillInput, 1500); // 1.5초 후 실행
    });
  }

  // chrome.storage.local에서 데이터를 가져와 입력 필드에 삽입
  function getDataAndFillInput() {
    console.log("데이터 가져오기 시도 중...");
    chrome.storage.local.get(["markdownToAI"], function (result) {
      const markdownContent = result.markdownToAI;

      if (!markdownContent) {
        console.log("입력할 Markdown 콘텐츠가 없습니다.");
        return;
      }

      console.log("마크다운 콘텐츠를 받았습니다. 입력 시도를 시작합니다.");
      attemptToInsertText(markdownContent);
    });
  }

  // 페이지 로드 후 입력 필드 찾기 및 텍스트 삽입 시도
  function attemptToInsertText(markdownContent) {
    let inputField = null;
    let sendButton = null;
    let maxAttempts = 20;
    let attemptCount = 0;

    const interval = setInterval(function () {
      attemptCount++;
      console.log(`입력 필드 찾기 시도 ${attemptCount}/${maxAttempts}`);

      // ChatGPT의 입력 필드: 다양한 선택자 시도
      // 최신 ChatGPT UI에 맞는 선택자
      inputField = document.querySelector(
        'div[role="textbox"][contenteditable="true"]'
      );

      if (!inputField) {
        // 백업 선택자 시도
        inputField = document.querySelector("div#prompt-textarea");
      }

      if (!inputField) {
        // 다른 방식으로 시도
        inputField = document.querySelector(
          '.ProseMirror[contenteditable="true"]'
        );
      }

      // 전송 버튼 찾기
      sendButton = document.querySelector('button[data-testid="send-button"]');
      if (!sendButton) {
        sendButton = document.querySelector('button[aria-label="전송"]');
      }
      if (!sendButton) {
        sendButton = document.querySelector('button[aria-label="Send"]');
      }

      if (inputField) {
        console.log("입력 필드를 찾았습니다:", inputField);
      }

      if (sendButton) {
        console.log("전송 버튼을 찾았습니다:", sendButton);
      }

      if (inputField) {
        console.log("입력 필드를 찾았습니다. 입력을 시도합니다.");
        clearInterval(interval);

        try {
          // React 환경에서는 직접 DOM 조작이 아닌 User Input을 시뮬레이션하는 방법 사용

          // 1. 클립보드를 통한 붙여넣기 시도
          try {
            // 클립보드에 텍스트 복사 (배경 스크립트에서 처리할 수도 있지만 여기서 직접 시도)
            navigator.clipboard
              .writeText(markdownContent)
              .then(() => {
                console.log("클립보드에 텍스트가 복사되었습니다");

                // 입력 필드에 포커스
                inputField.focus();

                // 키보드 입력 이벤트 시뮬레이션
                const pasteEvent = new KeyboardEvent("keydown", {
                  key: "v",
                  code: "KeyV",
                  ctrlKey: true, // macOS에서는 metaKey: true 필요할 수 있음
                  bubbles: true,
                });

                // Ctrl+V 이벤트 발생
                inputField.dispatchEvent(pasteEvent);

                // 백업: 프로그래밍 방식으로 텍스트 설정 시도
                setTimeout(() => {
                  // 첫 번째 시도가 실패했을 경우 대체 방법
                  if (!inputField.textContent) {
                    simulateTyping(inputField, markdownContent);
                  }

                  // 입력 완료 후 전송 버튼 클릭 시도
                  tryClickSendButton();
                }, 500);
              })
              .catch((err) => {
                console.error("클립보드 복사 실패:", err);
                // 클립보드 복사가 실패하면 직접 텍스트 입력 시도
                simulateTyping(inputField, markdownContent);
                tryClickSendButton();
              });
          } catch (err) {
            console.error("클립보드 API 사용 실패:", err);
            // 클립보드 API가 실패하면 직접 텍스트 입력 시도
            simulateTyping(inputField, markdownContent);
            tryClickSendButton();
          }
        } catch (error) {
          console.error("텍스트 입력 오류:", error);
          // storage에서 삭제
          chrome.storage.local.remove("markdownToAI", function () {
            console.log(
              "오류 발생으로 markdownToAI가 storage에서 삭제되었습니다."
            );
          });
        }
      } else if (attemptCount >= maxAttempts) {
        console.log("입력 필드를 찾을 수 없었습니다. 최대 시도 횟수 초과.");
        clearInterval(interval);

        // 최대 시도 횟수 초과 시 storage 삭제
        chrome.storage.local.remove("markdownToAI", function () {
          console.log(
            "최대 시도 횟수 초과로 markdownToAI가 storage에서 삭제되었습니다."
          );
        });
      }
    }, 1000); // 1초마다 시도

    // 문자 타이핑을 시뮬레이션하는 함수
    function simulateTyping(element, text) {
      console.log("직접 텍스트 입력 시도...");

      // contenteditable에 텍스트 직접 설정 (React가 관리하는 상태와 차이가 발생할 수 있음)
      if (element.innerHTML !== text) {
        // 텍스트에서 줄바꿈을 <br>로 변환
        const formattedText = text.replace(/\n/g, "<br>");
        element.innerHTML = formattedText;

        // React에게 변경 알림
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("텍스트 입력 완료");
      }
    }

    // 전송 버튼 클릭 시도 함수
    function tryClickSendButton() {
      if (sendButton) {
        console.log("전송 버튼 클릭 시도...");

        // 버튼 활성화 대기
        setTimeout(() => {
          try {
            if (!sendButton.disabled) {
              // React 이벤트 핸들러 활성화를 위한 다양한 시도

              // 1. 표준 클릭 이벤트
              sendButton.click();

              // 2. 마우스 이벤트 시뮬레이션 (1번이 작동하지 않을 경우)
              setTimeout(() => {
                sendButton.dispatchEvent(
                  new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                  })
                );

                console.log("전송 버튼 클릭 완료");

                // 사용 후 storage에서 삭제
                chrome.storage.local.remove("markdownToAI", function () {
                  console.log("markdownToAI가 storage에서 삭제되었습니다.");
                });
              }, 100);
            } else {
              console.log("전송 버튼이 비활성화 상태입니다.");
            }
          } catch (error) {
            console.error("전송 버튼 클릭 오류:", error);
          }
        }, 1000);
      } else {
        console.log("전송 버튼을 찾지 못했습니다.");
        // storage에서 삭제
        chrome.storage.local.remove("markdownToAI", function () {
          console.log("markdownToAI가 storage에서 삭제되었습니다.");
        });
      }
    }
  }
})();
