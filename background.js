// Background Service Worker for TK智能页面总结助手

// 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(async () => {
  // 获取用户语言设置
  let userLanguage = 'zh-CN';
  try {
    const { userLanguage: savedLang } = await chrome.storage.local.get('userLanguage');
    if (savedLang) {
      userLanguage = savedLang;
    } else {
      // 使用浏览器语言
      const browserLang = chrome.i18n.getUILanguage();
      if (browserLang.startsWith('en')) {
        userLanguage = 'en';
      }
    }
  } catch (error) {
    console.error('获取语言设置失败:', error);
  }
  
  // 根据语言设置菜单文本
  const menuTexts = {
    'zh-CN': {
      summarize: '智能总结此页面',
      summarizeWithImages: '智能总结（包含图片分析）',
      summarizeSelection: '总结选中文本'
    },
    'en': {
      summarize: 'Smart summarize this page',
      summarizeWithImages: 'Smart summarize (with image analysis)',
      summarizeSelection: 'Summarize selected text'
    }
  };
  
  const texts = menuTexts[userLanguage] || menuTexts['zh-CN'];
  
  // 创建主菜单项
  chrome.contextMenus.create({
    id: 'tk-summarize',
    title: texts.summarize,
    contexts: ['page']
  });
  
  // 创建带图片分析的菜单项
  chrome.contextMenus.create({
    id: 'tk-summarize-with-images',
    title: texts.summarizeWithImages,
    contexts: ['page']
  });
  
  // 创建分隔符
  chrome.contextMenus.create({
    id: 'separator1',
    type: 'separator',
    contexts: ['page']
  });
  
  // 创建选中文本总结菜单
  chrome.contextMenus.create({
    id: 'tk-summarize-selection',
    title: texts.summarizeSelection,
    contexts: ['selection']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'tk-summarize':
      handleSummarize(tab, false);
      break;
    case 'tk-summarize-with-images':
      handleSummarize(tab, true);
      break;
    case 'tk-summarize-selection':
      handleSelectionSummarize(tab, info.selectionText);
      break;
  }
});

// 处理快捷键命令
chrome.commands.onCommand.addListener((command, tab) => {
  switch (command) {
    case 'quick_summarize':
      handleSummarize(tab, false);
      break;
    case 'toggle_image_analysis':
      toggleImageAnalysis(tab);
      break;
  }
});

// 处理页面总结
async function handleSummarize(tab, includeImages) {
  try {
    // 检查用户状态
    const userInfo = await getUserInfo();
    if (!userInfo && !await checkGuestUsage()) {
      // 打开popup让用户登录或使用游客模式
      chrome.action.openPopup();
      return;
    }
    
    // 注入内容脚本并提取内容
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: includeImages ? extractContentWithImages : extractTextOnly
    });
    
    if (results && results[0] && results[0].result) {
      // 发送消息到popup进行总结
      chrome.runtime.sendMessage({
        action: 'background_summarize',
        content: results[0].result,
        includeImages: includeImages
      });
      
      // 打开popup显示结果
      chrome.action.openPopup();
    }
  } catch (error) {
    console.error('总结失败:', error);
    // 显示错误通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: '总结失败',
      message: '无法总结当前页面，请稍后重试'
    });
  }
}

// 处理选中文本总结
async function handleSelectionSummarize(tab, selectionText) {
  try {
    if (!selectionText || selectionText.trim().length < 10) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/icon48.png',
        title: '文本太短',
        message: '请选择更多文本进行总结'
      });
      return;
    }
    
    // 检查用户状态
    const userInfo = await getUserInfo();
    if (!userInfo && !await checkGuestUsage()) {
      chrome.action.openPopup();
      return;
    }
    
    // 发送选中文本到popup进行总结
    chrome.runtime.sendMessage({
      action: 'background_summarize',
      content: { text: selectionText, images: [], tables: [] },
      includeImages: false
    });
    
    chrome.action.openPopup();
  } catch (error) {
    console.error('选中文本总结失败:', error);
  }
}

// 切换图片分析模式
async function toggleImageAnalysis(tab) {
  try {
    const { imageAnalysisEnabled = false } = await chrome.storage.local.get('imageAnalysisEnabled');
    const newState = !imageAnalysisEnabled;
    
    await chrome.storage.local.set({ imageAnalysisEnabled: newState });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: '图片分析模式',
      message: newState ? '已启用图片分析' : '已禁用图片分析'
    });
  } catch (error) {
    console.error('切换图片分析模式失败:', error);
  }
}

// 获取用户信息
async function getUserInfo() {
  try {
    const { userInfo } = await chrome.storage.local.get('userInfo');
    return userInfo;
  } catch (error) {
    return null;
  }
}

// 检查游客使用次数
async function checkGuestUsage() {
  try {
    const today = new Date().toDateString();
    const { guestUsage = {} } = await chrome.storage.local.get('guestUsage');
    
    if (guestUsage.date !== today) {
      guestUsage.date = today;
      guestUsage.count = 0;
    }
    
    return guestUsage.count < 3; // 游客每日3次限制
  } catch (error) {
    return false;
  }
}

// 提取文本内容（注入到页面的函数）
function extractTextOnly() {
  return {
    text: document.body.innerText || '',
    images: [],
    tables: []
  };
}

// 提取包含图片的内容（注入到页面的函数）
function extractContentWithImages() {
  // 提取文本
  const text = document.body.innerText || '';
  
  // 提取图片
  const images = [];
  const imgElements = document.querySelectorAll('img');
  
  for (let i = 0; i < Math.min(imgElements.length, 5); i++) {
    const img = imgElements[i];
    if (img.width >= 50 && img.height >= 50) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = Math.min(img.width, 800);
        canvas.height = Math.min(img.height, 600);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        images.push({
          src: img.src,
          alt: img.alt || '',
          base64: canvas.toDataURL('image/jpeg', 0.8)
        });
      } catch (error) {
        console.log('处理图片失败:', error);
      }
    }
  }
  
  // 提取表格
  const tables = [];
  const tableElements = document.querySelectorAll('table');
  
  for (let i = 0; i < Math.min(tableElements.length, 5); i++) {
    const table = tableElements[i];
    const rows = table.querySelectorAll('tr');
    
    if (rows.length >= 2) {
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
                      Array.from(rows).slice(1);
      
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
      
      if (tableInfo.headers.length > 0 && tableInfo.rows.length > 0) {
        tableInfo.summary = `表格包含${tableInfo.headers.length}列，${tableInfo.rows.length}行数据。`;
        tables.push(tableInfo);
      }
    }
  }
  
  return { text, images, tables };
}