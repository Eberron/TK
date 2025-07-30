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
  
  function extractTables() {
    // 获取页面中的所有表格
    const tables = document.querySelectorAll('table');
    const tableData = [];
    
    for (let table of tables) {
      try {
        // 跳过太小的表格（可能是布局表格）
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;
        
        const tableInfo = {
          headers: [],
          rows: [],
          summary: ''
        };
        
        // 提取表头
        const headerRow = table.querySelector('thead tr') || rows[0];
        const headerCells = headerRow.querySelectorAll('th, td');
        headerCells.forEach(cell => {
          tableInfo.headers.push(cell.innerText.trim());
        });
        
        // 提取数据行
        const dataRows = table.querySelectorAll('tbody tr').length > 0 ? 
                        table.querySelectorAll('tbody tr') : 
                        Array.from(rows).slice(table.querySelector('thead') ? 0 : 1);
        
        dataRows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          const rowData = [];
          cells.forEach(cell => {
            rowData.push(cell.innerText.trim());
          });
          if (rowData.some(cell => cell.length > 0)) {
            tableInfo.rows.push(rowData);
          }
        });
        
        // 生成表格摘要
        if (tableInfo.headers.length > 0 && tableInfo.rows.length > 0) {
          tableInfo.summary = `表格包含${tableInfo.headers.length}列，${tableInfo.rows.length}行数据。列标题：${tableInfo.headers.join('、')}。`;
          tableData.push(tableInfo);
        }
        
        // 限制最多处理5个表格
        if (tableData.length >= 5) break;
      } catch (error) {
        console.log('处理表格时出错:', error);
      }
    }
    
    return tableData;
  }
  
  async function extractContent() {
    const text = extractText();
    const images = await extractImages();
    const tables = extractTables();
    return { text, images, tables };
  }
  
  // 监听来自background和popup的消息
  chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "extractText") {
      const text = extractText();
      sendResponse({ text: text });
      return true;
    } else if (request.action === "extractTextOnly") {
      try {
        const text = extractText();
        sendResponse({ success: true, content: text });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    } else if (request.action === "extractContent") {
      try {
        const content = await extractContent();
        sendResponse({ success: true, content: content });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  });
  