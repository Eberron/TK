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
    
    // 发送消息到content script提取内容
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: includeImages ? 'extractContent' : 'extractText'
    });
    
    if (response && (response.text || response.content)) {
      // 发送消息到popup进行总结
      chrome.runtime.sendMessage({
        action: 'background_summarize',
        content: response.content || { text: response.text, images: [], tables: [] },
        includeImages: includeImages
      });
      
      // 打开popup显示结果
      chrome.action.openPopup();
    }
  } catch (error) {
    console.error('总结失败:', error);
    // 打开popup显示错误
    chrome.action.openPopup();
  }
}

// 处理选中文本总结
async function handleSelectionSummarize(tab, selectionText) {
  try {
    if (!selectionText || selectionText.trim().length < 10) {
      // 文本太短，直接返回
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
    
    // 图片分析模式已切换，状态保存到storage中
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

// Background script functions end here