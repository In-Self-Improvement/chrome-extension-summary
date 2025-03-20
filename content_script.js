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

      // ChatGPT의 입력 필드: 실제 contenteditable div 찾기
      inputField = document.querySelector(
        'div[contenteditable="true"].ProseMirror#prompt-textarea'
      );

      if (!inputField) {
        // 백업 선택자 시도
        inputField = document.querySelector(
          'div#prompt-textarea[contenteditable="true"]'
        );
      }

      if (!inputField) {
        // 다른 방식으로 시도
        inputField = document.querySelector(
          '.ProseMirror[contenteditable="true"]'
        );
      }

      // 전송 버튼 찾기
      sendButton = document.querySelector('button[data-testid="send-button"]');

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
          // contenteditable div의 경우 (ChatGPT의 새 UI)
          // 기존 내용 지우기
          inputField.innerHTML = "";

          // 텍스트 내용을 단락으로 분할
          const paragraphs = markdownContent.split("\n\n");

          // 각 단락을 개별 p 요소로 삽입
          paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
              const p = document.createElement("p");
              p.textContent = paragraph;
              inputField.appendChild(p);
            }
          });

          // 필요한 이벤트 발생시키기
          inputField.dispatchEvent(new Event("input", { bubbles: true }));
          inputField.dispatchEvent(new Event("change", { bubbles: true }));

          console.log("텍스트 입력 완료 (DIV contenteditable - ProseMirror)");

          // 자동 포커스
          inputField.focus();
          console.log("입력 필드에 포커스되었습니다.");

          // 전송 버튼 클릭
          if (sendButton) {
            console.log("전송 버튼을 찾았습니다. 클릭을 시도합니다.");

            // 버튼이 활성화될 때까지 약간 대기 (텍스트 입력 후 버튼이 활성화되는 시간 고려)
            setTimeout(() => {
              try {
                // 버튼이 disabled가 아닌지 확인
                if (!sendButton.disabled) {
                  sendButton.click();
                  console.log("전송 버튼을 클릭했습니다.");
                } else {
                  console.log("전송 버튼이 비활성화 상태입니다.");
                }

                // 사용 후 storage에서 삭제
                chrome.storage.local.remove("markdownToAI", function () {
                  console.log("markdownToAI가 storage에서 삭제되었습니다.");
                });
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
  }
})();
