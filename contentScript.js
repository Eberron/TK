function extractText() {
    // 获取网页内容并返回
    const text = document.body.innerText;
    return text;
  }
  
  // 将文本发送到 popup.js 进行总结
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "extractText") {
      const text = extractText();
      sendResponse({ text: text });
    }
  });
  