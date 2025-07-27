function extractText() {
    // 获取网页内容并返回
    const text = document.body.innerText;
    return text;
  }
  
  async function extractImages() {
    // 获取页面中的所有图片
    const images = document.querySelectorAll('img');
    const imageData = [];
    
    for (let img of images) {
      try {
        // 跳过太小的图片（可能是装饰性图片）
        if (img.width < 50 || img.height < 50) continue;
        
        // 创建canvas来转换图片为base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 等待图片加载完成
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        
        canvas.width = Math.min(img.width, 800); // 限制最大宽度
        canvas.height = Math.min(img.height, 600); // 限制最大高度
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        
        imageData.push({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          base64: base64
        });
        
        // 限制最多处理5张图片
        if (imageData.length >= 5) break;
      } catch (error) {
        console.log('处理图片时出错:', error);
      }
    }
    
    return imageData;
  }
  
  async function extractContent() {
    const text = extractText();
    const images = await extractImages();
    return { text, images };
  }
  
  // 将内容发送到 popup.js 进行总结
  chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "extractText") {
      const text = extractText();
      sendResponse({ text: text });
    } else if (request.action === "extractContent") {
      try {
        const content = await extractContent();
        sendResponse({ success: true, content: content });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
     }
   });
  