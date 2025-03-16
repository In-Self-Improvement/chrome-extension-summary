document.addEventListener("DOMContentLoaded", function () {
  const convertBtn = document.getElementById("convert-btn");
  const copyBtn = document.getElementById("copy-btn");
  const markdownOutput = document.getElementById("markdown-output");
  const statusDiv = document.getElementById("status");

  // 현재 페이지 변환 버튼 클릭 이벤트
  convertBtn.addEventListener("click", function () {
    statusDiv.textContent = "변환 중...";
    markdownOutput.value = ""; // 이전 결과 초기화

    // 먼저 스크립트 삽입 요청
    chrome.runtime.sendMessage(
      { action: "injectTurndown" },
      function (response) {
        if (chrome.runtime.lastError) {
          console.error("스크립트 삽입 오류:", chrome.runtime.lastError);
          statusDiv.textContent =
            "스크립트 삽입 실패: " + chrome.runtime.lastError.message;
          statusDiv.className = "error";
          return;
        }

        if (!response || !response.success) {
          statusDiv.textContent =
            "스크립트 삽입 실패: " + (response?.error || "알 수 없는 오류");
          statusDiv.className = "error";
          return;
        }

        // 스크립트 삽입 성공 후 변환 요청
        setTimeout(() => {
          chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
              if (!tabs || tabs.length === 0) {
                statusDiv.textContent = "활성화된 탭을 찾을 수 없습니다.";
                statusDiv.className = "error";
                return;
              }

              try {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: "convert" },
                  function (response) {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "메시지 전송 오류:",
                        chrome.runtime.lastError
                      );
                      statusDiv.textContent =
                        "변환 실패: " + chrome.runtime.lastError.message;
                      statusDiv.className = "error";
                      return;
                    }

                    if (response && response.markdown) {
                      markdownOutput.value = response.markdown;
                      statusDiv.textContent = "변환 완료!";
                      statusDiv.className = "";
                    } else if (response && response.error) {
                      console.error("변환 오류:", response.error);
                      statusDiv.textContent = "변환 실패: " + response.error;
                      statusDiv.className = "error";
                    } else {
                      statusDiv.textContent = "변환 실패. 다시 시도해주세요.";
                      statusDiv.className = "error";
                    }
                  }
                );
              } catch (error) {
                console.error("예외 발생:", error);
                statusDiv.textContent = "오류 발생: " + error.message;
                statusDiv.className = "error";
              }
            }
          );
        }, 500); // 스크립트가 로드될 시간을 주기 위해 약간의 지연 추가
      }
    );
  });

  // 복사 버튼 클릭 이벤트
  copyBtn.addEventListener("click", function () {
    if (!markdownOutput.value) {
      statusDiv.textContent = "복사할 내용이 없습니다.";
      statusDiv.className = "error";
      return;
    }

    markdownOutput.select();
    document.execCommand("copy");
    statusDiv.textContent = "클립보드에 복사되었습니다!";
    statusDiv.className = "";

    // 2초 후 상태 메시지 지우기
    setTimeout(function () {
      statusDiv.textContent = "";
    }, 2000);
  });
});
