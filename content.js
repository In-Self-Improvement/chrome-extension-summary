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
