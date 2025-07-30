document.addEventListener('DOMContentLoaded', async function() {
    // 初始化多语言支持
    await initLanguage();
    updateUILanguage();
    
    await initializeUser();
    await checkFirstTimeUser();
    
    // 清理过期缓存
    cleanExpiredCache();
    
    document.getElementById('summarizeBtn').addEventListener('click', handleSummarize);
    document.getElementById('activateLicense').addEventListener('click', handleLicenseActivation);
    
    // 管理订阅按钮事件绑定
    const manageSubBtn = document.getElementById('manageSubscriptionBtn');
    if (manageSubBtn) {
      console.log('找到管理订阅按钮，绑定事件');
      manageSubBtn.addEventListener('click', openSubscriptionPage);
    } else {
      console.warn('未找到管理订阅按钮');
    }
    
    // 添加历史记录按钮事件
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', showHistory);
    }
    
    // 添加语言切换事件
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      // 获取当前语言设置
      try {
        const { userLanguage } = await chrome.storage.local.get('userLanguage');
        languageSelect.value = userLanguage || 'zh-CN';
      } catch (error) {
        languageSelect.value = 'zh-CN';
      }
      
      languageSelect.addEventListener('change', async (e) => {
        await setLanguage(e.target.value);
      });
    }
    
    // 监听来自background script的消息
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'background_summarize') {
          handleBackgroundSummarize(message.content, message.includeImages);
        }
      });
    }
  });
  
  // 检查是否为首次使用用户
  async function checkFirstTimeUser() {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return;
      }
      
      const { hasSeenPrivacyNotice } = await chrome.storage.local.get('hasSeenPrivacyNotice');
      
      if (!hasSeenPrivacyNotice) {
        showPrivacyNotice();
      }
    } catch (error) {
      console.error('检查隐私提示状态失败:', error);
    }
  }
  
  // 显示隐私提示
  function showPrivacyNotice() {
    const overlay = document.createElement('div');
    overlay.className = 'privacy-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'privacy-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 25px;
      max-width: 400px;
      margin: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      text-align: center;
    `;
    
    // 安全地创建隐私通知模态框
    modal.innerHTML = '';
    
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'margin-bottom: 20px;';
    
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'font-size: 24px; margin-bottom: 10px;';
    iconDiv.textContent = '🔒';
    
    const h3 = document.createElement('h3');
    h3.style.cssText = 'margin: 0 0 15px 0; color: #2c3e50;';
    h3.textContent = '隐私保护承诺';
    
    const p = document.createElement('p');
    p.style.cssText = 'margin: 0 0 15px 0; color: #555; line-height: 1.5;';
    p.textContent = 'TK智能总结插件承诺：';
    
    const ul = document.createElement('ul');
    ul.style.cssText = 'text-align: left; color: #666; margin: 0 0 20px 0; padding-left: 20px;';
    
    const promises = [
      '✅ 完全免费使用',
      '✅ 不存储用户数据',
      '✅ 仅对页面内容总结',
      '✅ 严格保护隐私'
    ];
    
    promises.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });
    
    contentDiv.appendChild(iconDiv);
    contentDiv.appendChild(h3);
    contentDiv.appendChild(p);
    contentDiv.appendChild(ul);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 10px; justify-content: center;';
    
    const viewPrivacyBtn = document.createElement('button');
    viewPrivacyBtn.id = 'viewPrivacyBtn';
    viewPrivacyBtn.style.cssText = `
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    viewPrivacyBtn.textContent = '查看详情';
    
    const acceptPrivacyBtn = document.createElement('button');
    acceptPrivacyBtn.id = 'acceptPrivacyBtn';
    acceptPrivacyBtn.style.cssText = `
      background: #27ae60;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    acceptPrivacyBtn.textContent = '我知道了';
    
    buttonsDiv.appendChild(viewPrivacyBtn);
    buttonsDiv.appendChild(acceptPrivacyBtn);
    
    modal.appendChild(contentDiv);
    modal.appendChild(buttonsDiv);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 绑定事件
    document.getElementById('viewPrivacyBtn').addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('privacy.html')
      });
    });
    
    document.getElementById('acceptPrivacyBtn').addEventListener('click', async () => {
      await chrome.storage.local.set({ hasSeenPrivacyNotice: true });
      overlay.remove();
    });
  }
  
  // 初始化用户状态
  async function initializeUser() {
    try {
      // 检查用户登录状态
      const userInfo = await getUserInfo();
      
      if (!userInfo) {
        // 用户未登录，显示登录/注册选项
        showAuthOptions();
        return;
      }
      
      // 验证用户信息的有效性
      if (!userInfo.userId || (!userInfo.token && !userInfo.isGuest)) {
        // 用户信息无效，清除并显示登录选项
        await clearUserInfo();
        showAuthOptions();
        return;
      }
      
      // 重置每日使用次数（如果是新的一天）
      const today = new Date().toDateString();
      if (userInfo.lastResetDate !== today) {
        userInfo.usageCount = 0;
        userInfo.lastResetDate = today;
        await saveUserInfo(userInfo);
      }
      
      // 隐藏认证选项（如果存在）
      const authSection = document.querySelector('.auth-section');
      if (authSection) {
        authSection.remove();
      }
      
      // 更新UI状态
      updateUIState(userInfo.usageCount, userInfo.isPro, userInfo);
      
    } catch (error) {
      console.error('初始化用户状态失败:', error);
      // 降级到原有逻辑
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const { usageCount = 0, isPro = false } = await chrome.storage.local.get(['usageCount', 'isPro']);
          updateUIState(usageCount, isPro);
        } else {
          // 非扩展环境，显示登录选项
          showAuthOptions();
        }
      } catch (fallbackError) {
        console.error('降级逻辑也失败:', fallbackError);
        showAuthOptions();
      }
    }
  }
  
  // 清除用户信息
  async function clearUserInfo() {
    try {
      // 清除Chrome存储
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['userInfo', 'usageCount', 'isPro']);
      } else {
        // 非扩展环境才清除localStorage
        localStorage.removeItem('userInfo');
      }
    } catch (error) {
      console.error('清除用户信息失败:', error);
    }
  }
  
  // 获取用户信息
  async function getUserInfo() {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // 优先从Chrome存储获取
        const { userInfo } = await chrome.storage.local.get('userInfo');
        if (userInfo) {
          return userInfo;
        }
      } else {
        // 非扩展环境才从localStorage获取
        const localUserInfo = localStorage.getItem('userInfo');
        if (localUserInfo) {
          return JSON.parse(localUserInfo);
        }
      }
      
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }
  
  // 保存用户信息
  async function saveUserInfo(userInfo) {
    try {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // 保存到Chrome存储
        await chrome.storage.local.set({ userInfo });
      } else {
        // 非扩展环境才使用localStorage
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  }
  
  // 显示认证选项
  function showAuthOptions() {
    const container = document.querySelector('.container');
    
    // 检查是否已存在认证选项，如果存在则先移除
    const existingAuthSection = document.querySelector('.auth-section');
    if (existingAuthSection) {
      existingAuthSection.remove();
    }
    
    const authSection = document.createElement('div');
    authSection.className = 'auth-section';
    // 安全地创建认证选项
    authSection.innerHTML = '';
    const authPrompt = document.createElement('div');
    authPrompt.className = 'auth-prompt';
    
    const h3 = document.createElement('h3');
    h3.textContent = '🔐 登录或注册';
    
    const p = document.createElement('p');
    p.textContent = '登录后享受每日10次免费智能总结';
    
    const authButtons = document.createElement('div');
    authButtons.className = 'auth-buttons';
    
    const loginBtn = document.createElement('button');
    loginBtn.id = 'loginBtn';
    loginBtn.className = 'auth-btn login-btn';
    loginBtn.textContent = '登录';
    
    const registerBtn = document.createElement('button');
    registerBtn.id = 'registerBtn';
    registerBtn.className = 'auth-btn register-btn';
    registerBtn.textContent = '注册';
    
    authButtons.appendChild(loginBtn);
    authButtons.appendChild(registerBtn);
    
    const guestOption = document.createElement('div');
    guestOption.className = 'guest-option';
    
    const guestBtn = document.createElement('button');
    guestBtn.id = 'guestBtn';
    guestBtn.className = 'guest-btn';
    guestBtn.textContent = '游客模式（每日3次）';
    
    guestOption.appendChild(guestBtn);
    
    authPrompt.appendChild(h3);
    authPrompt.appendChild(p);
    authPrompt.appendChild(authButtons);
    authPrompt.appendChild(guestOption);
    authSection.appendChild(authPrompt);
    
    // 插入到总结按钮之前
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn && summarizeBtn.parentNode === container) {
      container.insertBefore(authSection, summarizeBtn);
    } else {
      // 如果找不到summarizeBtn或它不是container的子元素，则追加到container末尾
      container.appendChild(authSection);
    }
    
    // 绑定事件
    document.getElementById('loginBtn').addEventListener('click', openLoginPage);
    document.getElementById('registerBtn').addEventListener('click', openRegisterPage);
    document.getElementById('guestBtn').addEventListener('click', useGuestMode);
    
    // 隐藏专业版提示
    const proPrompt = document.getElementById('proPrompt');
    if (proPrompt) {
      proPrompt.style.display = 'none';
    }
  }
  
  // 打开登录页面
  function openLoginPage() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('login.html')
      });
    } else {
      // 在非扩展环境中，直接打开页面
      window.open('login.html', '_blank');
    }
  }
  
  // 打开注册页面
  function openRegisterPage() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('register.html')
      });
    } else {
      // 在非扩展环境中，直接打开页面
      window.open('register.html', '_blank');
    }
  }
  
  // 使用游客模式
  async function useGuestMode() {
    const guestInfo = {
      userId: 'guest_' + Date.now(),
      email: null,
      token: null,
      isPro: false,
      subscriptionPlan: 'guest',
      usageCount: 0,
      dailyLimit: 3, // 游客模式每日3次
      lastResetDate: new Date().toDateString(),
      isGuest: true
    };
    
    await saveUserInfo(guestInfo);
    
    // 移除认证选项
    const authSection = document.querySelector('.auth-section');
    if (authSection) {
      authSection.remove();
    }
    
    // 显示专业版提示
    const proPrompt = document.getElementById('proPrompt');
    if (proPrompt) {
      proPrompt.style.display = 'block';
    }
    
    updateUIState(0, false, guestInfo);
    showToast('已切换到游客模式，每日可使用3次', 'success');
  }
  
  // 打开订阅管理页面
  function openSubscriptionPage() {
    console.log('openSubscriptionPage 被调用');
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
        console.log('使用 Chrome API 打开订阅页面');
        chrome.tabs.create({
          url: chrome.runtime.getURL('subscription.html')
        });
      } else {
        console.log('使用 window.open 打开订阅页面');
        // 在非扩展环境中，直接打开页面
        window.open('subscription.html', '_blank');
      }
    } catch (error) {
      console.error('打开订阅页面失败:', error);
      showToast('打开订阅页面失败，请重试');
    }
  }
  
  async function updateUIState(usageCount, isPro, userInfo = null) {
    // 根据用户类型设置每日限制
    let dailyLimit = 10; // 默认注册用户10次
    let userType = '注册用户';
    
    if (userInfo) {
      if (userInfo.isGuest) {
        dailyLimit = 3;
        userType = '游客模式';
      } else if (userInfo.subscriptionPlan === 'free') {
        dailyLimit = 10;
        userType = '免费版';
      } else {
        dailyLimit = userInfo.dailyLimit || 10;
      }
    } else {
      // 兼容旧版本，未登录用户默认10次
      dailyLimit = 10;
      userType = '未登录';
    }
    
    const remaining = Math.max(0, dailyLimit - usageCount);
    document.getElementById('usage').textContent = isPro 
      ? "专业版用户 · 无限使用" 
      : `剩余免费次数：${remaining}/${dailyLimit}`;
    
    document.getElementById('proPrompt').style.display = 
      (!isPro && remaining <= 0) ? 'block' : 'none';
    
    document.getElementById('summarizeBtn').disabled = 
      (!isPro && remaining <= 0);
      
    // 如果是游客模式，显示注册提示
    if (userInfo && userInfo.isGuest) {
      updateGuestPrompt(remaining);
    }
  }
  
  // 更新游客模式提示
  function updateGuestPrompt(remaining) {
    const proPrompt = document.getElementById('proPrompt');
    if (proPrompt && remaining <= 1) {
      // 安全地创建游客升级提示内容
      proPrompt.innerHTML = '';
      const guestUpgradeDiv = document.createElement('div');
      guestUpgradeDiv.className = 'guest-upgrade-prompt';
      
      const p1 = document.createElement('p');
      p1.textContent = '🎯 游客模式次数即将用完';
      
      const p2 = document.createElement('p');
      p2.textContent = '注册账号立即获得每日10次免费总结！';
      
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'quick-auth-buttons';
      
      const quickRegisterBtn = document.createElement('button');
      quickRegisterBtn.id = 'quickRegisterBtn';
      quickRegisterBtn.className = 'quick-auth-btn';
      quickRegisterBtn.textContent = '立即注册';
      
      const quickLoginBtn = document.createElement('button');
      quickLoginBtn.id = 'quickLoginBtn';
      quickLoginBtn.className = 'quick-auth-btn';
      quickLoginBtn.textContent = '已有账号';
      
      buttonsDiv.appendChild(quickRegisterBtn);
      buttonsDiv.appendChild(quickLoginBtn);
      guestUpgradeDiv.appendChild(p1);
      guestUpgradeDiv.appendChild(p2);
      guestUpgradeDiv.appendChild(buttonsDiv);
      proPrompt.appendChild(guestUpgradeDiv);
      
      // 绑定快速注册/登录按钮
      document.getElementById('quickRegisterBtn')?.addEventListener('click', openRegisterPage);
      document.getElementById('quickLoginBtn')?.addEventListener('click', openLoginPage);
    }
  }
  
  async function handleLicenseActivation() {
    const licenseKey = document.getElementById('licenseKey').value;
    if (!licenseKey) return;
  
    try {
      const isValid = await validateLicenseKey(licenseKey);
      
      if (isValid.success) {
        await chrome.storage.local.set({ 
          isPro: true,
          subscriptionPlan: isValid.planType || 'lifetime',
          subscriptionExpiry: isValid.expiry || null,
          licenseKey: licenseKey
        });
        const { usageCount = 0 } = await chrome.storage.local.get('usageCount');
        updateUIState(usageCount, true);
        showToast('🎉 专业版已激活！');
      } else {
        showToast('❌ 无效的许可证密钥');
      }
    } catch (error) {
      showToast('⚠️ 激活失败，请重试');
    }
  }
  
  // 验证许可证密钥
  async function validateLicenseKey(licenseKey) {
    try {
      // 调用许可证验证API
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/license/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ licenseKey })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // 移除模拟验证逻辑以提高安全性
      
      return { success: false };
    } catch (error) {
      console.error('许可证验证请求失败:', error);
      return { success: false };
    }
  }
  
  async function handleSummarize() {
    try {
      setLoading(true);
      
      // 获取页面内容
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        showToast('无法在此页面使用总结功能');
        return;
      }

      // 获取用户信息
      const userInfo = await getUserInfo();
      
      if (!userInfo) {
        showToast('请先登录或选择游客模式');
        return;
      }
      
      // 检查使用次数限制
      if (!userInfo.isPro) {
        const dailyLimit = userInfo.isGuest ? 3 : (userInfo.dailyLimit || 10);
        
        if (userInfo.usageCount >= dailyLimit) {
          if (userInfo.isGuest) {
            showToast('游客模式次数已用完，请注册账号获得每日10次免费总结');
          } else {
            showToast('今日免费次数已用完，请升级到专业版或明日再试');
          }
          return;
        }
      }

      const includeImages = document.getElementById('includeImages').checked;
      
      let content;
      if (includeImages) {
        // 获取文本和图片内容
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "extractContent" }, resolve);
        });
        
        if (response && response.success) {
          content = response.content;
        } else {
          throw new Error(response?.error || '获取内容失败');
        }
      } else {
        // 只获取文本内容
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "extractTextOnly" }, resolve);
        });
        
        if (response && response.success) {
          content = { text: response.content, images: [] };
        } else {
          throw new Error(response?.error || '获取文本内容失败');
        }
      }

      // 生成总结
      const summary = await generateSummary(content);
      document.getElementById('result').textContent = summary;
      
      // 保存到历史记录
      await saveToHistory({
        content: typeof content === 'string' ? content : content.text,
        summary: summary,
        timestamp: Date.now(),
        includeImages: includeImages
      });

      // 更新使用次数（仅非专业版用户）
      if (!userInfo.isPro) {
        userInfo.usageCount += 1;
        await saveUserInfo(userInfo);
        updateUIState(userInfo.usageCount, userInfo.isPro, userInfo);
      }
      
      // 根据用户类型显示不同的成功消息
      if (userInfo.isGuest) {
        const remaining = 3 - userInfo.usageCount;
        showToast(`总结完成！游客模式还剩${remaining}次`);
      } else if (!userInfo.isPro) {
        const dailyLimit = userInfo.dailyLimit || 10;
        const remaining = dailyLimit - userInfo.usageCount;
        showToast(`总结完成！今日还剩${remaining}次`);
      } else {
        showToast('总结完成！');
      }
    } catch (error) {
      showToast(`⚠️ 错误：${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function generateSummary(content) {
    // 简单的内容缓存机制 - 使用安全的哈希方法
    const contentStr = JSON.stringify(content);
    let contentHash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      contentHash = ((contentHash << 5) - contentHash) + char;
      contentHash = contentHash & contentHash; // 转换为32位整数
    }
    const cacheKey = `summary_cache_${Math.abs(contentHash).toString(36)}`;
    
    // 检查缓存（仅在chrome扩展环境中）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const { [cacheKey]: cachedSummary } = await chrome.storage.local.get(cacheKey);
        if (cachedSummary && cachedSummary.timestamp > Date.now() - 3600000) { // 1小时缓存
          return cachedSummary.summary;
        }
      } catch (error) {
        console.log('缓存读取失败:', error);
      }
    }
    
    const { deepseekApiKey } = await chrome.storage.local.get('deepseekApiKey');
    
    // 检查API密钥是否已配置
    if (!deepseekApiKey || deepseekApiKey.trim() === '') {
      throw new Error('请先配置DeepSeek API密钥！\n\n📖 配置步骤：\n1. 点击下方"API设置"按钮\n2. 按照页面教程获取API密钥\n3. 输入密钥并保存\n\n💡 DeepSeek提供免费额度，足够日常使用');
    }
    
    let messages;
    let model = "deepseek-chat";
    
    if (typeof content === 'string') {
      // 兼容旧的纯文本模式
      messages = [{
          role: "user",
          content: `请用简洁的中文总结以下内容，保留关键数据和结论：\n\n${content.slice(0, 6000)}`
        }];
    } else {
      // 新的多模态模式
      const { text, images, tables } = content;
      
      // 构建提示文本 - 减少内容长度以提高速度
      let promptText = `请分析以下网页内容并生成简洁的中文总结：\n\n文本内容：\n${text.slice(0, 5000)}`;
      
      // 添加表格信息
      if (tables && tables.length > 0) {
        promptText += `\n\n表格数据：\n`;
        tables.forEach((table, index) => {
          promptText += `表格${index + 1}: ${table.summary}\n`;
          if (table.headers.length > 0 && table.rows.length > 0) {
            promptText += `表头: ${table.headers.join(' | ')}\n`;
            // 只显示前2行数据作为示例，减少处理量
            const sampleRows = table.rows.slice(0, 2);
            sampleRows.forEach(row => {
              promptText += `${row.join(' | ')}\n`;
            });
            if (table.rows.length > 2) {
              promptText += `...（共${table.rows.length}行数据）\n`;
            }
          }
          promptText += `\n`;
        });
      }
      
      if (images && images.length > 0) {
        // 使用支持视觉的模型
        model = "deepseek-vl-chat";
        
        const messageContent = [
          {
            type: "text",
            text: promptText + `\n\n请结合图片内容进行综合分析。`
          }
        ];
        
        // 添加图片（最多2张以提高处理速度）
        for (let i = 0; i < Math.min(images.length, 2); i++) {
          const img = images[i];
          messageContent.push({
            type: "image_url",
            image_url: {
              url: img.base64
            }
          });
        }
        
        messages = [{
          role: "user",
          content: messageContent
        }];
      } else {
        // 只有文本和表格，使用普通模型
        messages = [{
          role: "user",
          content: promptText
        }];
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3, // 降低随机性，提高响应速度
        max_tokens: 800,  // 减少token数量，加快生成速度
        stream: false     // 确保非流式响应
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  
    if (!response.ok) {
      let errorMessage = '未知错误';
      try {
        const errorData = await response.json();
        errorMessage = errorData && errorData.error && errorData.error.message ? errorData.error.message : `HTTP ${response.status}`;
      } catch (parseError) {
        errorMessage = `HTTP ${response.status}`;
      }
      throw new Error(`API请求失败: ${response.status} - ${errorMessage}`);
    }
    
    const data = await response.json();
    const summary = data.choices[0].message.content;
    
    // 保存到缓存（仅在chrome扩展环境中）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.set({
          [cacheKey]: {
            summary: summary,
            timestamp: Date.now()
          }
        });
      } catch (error) {
        console.log('缓存保存失败:', error);
      }
    }
    
    return summary;
  }
  
  // 清理过期缓存
  async function cleanExpiredCache() {
    // 检查chrome API是否可用
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return;
    }
    
    try {
      const storage = await chrome.storage.local.get();
      const expiredKeys = [];
      
      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith('summary_cache_') && value.timestamp < Date.now() - 3600000) {
          expiredKeys.push(key);
        }
      }
      
      if (expiredKeys.length > 0) {
        await chrome.storage.local.remove(expiredKeys);
      }
    } catch (error) {
      console.log('缓存清理失败:', error);
    }
  }
  
  // 辅助函数
  function setLoading(state) {
    const btn = document.getElementById('summarizeBtn');
    btn.disabled = state;
    btn.textContent = state ? '生成中...' : '生成总结';
  }
  
  function showToast(message, duration=3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), duration);
  }

// 处理来自background script的总结请求
async function handleBackgroundSummarize(content, includeImages) {
  try {
    setLoading(true);
    
    // 获取用户信息
    const userInfo = await getUserInfo();
    
    if (!userInfo) {
      showToast('请先登录或选择游客模式');
      return;
    }
    
    // 检查使用次数限制
    if (!userInfo.isPro) {
      const dailyLimit = userInfo.isGuest ? 3 : (userInfo.dailyLimit || 10);
      
      if (userInfo.usageCount >= dailyLimit) {
        if (userInfo.isGuest) {
          showToast('游客模式次数已用完，请注册账号获得每日10次免费总结');
        } else {
          showToast('今日免费次数已用完，请升级到专业版或明日再试');
        }
        return;
      }
    }
    
    // 生成总结
    const summary = await generateSummary(content);
    document.getElementById('result').textContent = summary;
    
    // 保存到历史记录
    await saveToHistory({
      content: content.text || content,
      summary: summary,
      timestamp: Date.now(),
      includeImages: includeImages
    });
    
    // 更新使用次数（仅非专业版用户）
    if (!userInfo.isPro) {
      userInfo.usageCount += 1;
      await saveUserInfo(userInfo);
      updateUIState(userInfo.usageCount, userInfo.isPro, userInfo);
    }
    
    // 根据用户类型显示不同的成功消息
    if (userInfo.isGuest) {
      const remaining = 3 - userInfo.usageCount;
      showToast(`总结完成！游客模式还剩${remaining}次`);
    } else if (!userInfo.isPro) {
      const dailyLimit = userInfo.dailyLimit || 10;
      const remaining = dailyLimit - userInfo.usageCount;
      showToast(`总结完成！今日还剩${remaining}次`);
    } else {
      showToast('总结完成！');
    }
  } catch (error) {
    showToast(`⚠️ 错误：${error.message}`);
  } finally {
    setLoading(false);
  }
}

// 保存到历史记录
async function saveToHistory(record) {
  try {
    const { summaryHistory = [] } = await chrome.storage.local.get('summaryHistory');
    
    // 添加新记录到开头
    summaryHistory.unshift(record);
    
    // 限制历史记录数量（最多保存50条）
    if (summaryHistory.length > 50) {
      summaryHistory.splice(50);
    }
    
    await chrome.storage.local.set({ summaryHistory });
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

// 显示历史记录
async function showHistory() {
  try {
    const { summaryHistory = [] } = await chrome.storage.local.get('summaryHistory');
    
    if (summaryHistory.length === 0) {
      showToast('暂无历史记录');
      return;
    }
    
    // 创建历史记录弹窗
    const overlay = document.createElement('div');
    overlay.className = 'history-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 25px;
      max-width: 600px;
      max-height: 80vh;
      margin: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      overflow-y: auto;
    `;
    
    let historyHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #2c3e50;">📚 历史记录</h3>
        <div>
          <button id="exportHistoryBtn" style="
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 10px;
          ">导出</button>
          <button id="clearHistoryBtn" style="
            background: #e74c3c;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 10px;
          ">清空</button>
          <button id="closeHistoryBtn" style="
            background: #95a5a6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
          ">关闭</button>
        </div>
      </div>
      <div class="history-list">
    `;
    
    summaryHistory.forEach((record, index) => {
      const date = new Date(record.timestamp).toLocaleString('zh-CN');
      const contentPreview = (record.content || '').substring(0, 100) + '...';
      const summaryPreview = (record.summary || '').substring(0, 150) + '...';
      
      historyHTML += `
        <div class="history-item" style="
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          background: #f9f9f9;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 12px; color: #666;">${date}</span>
            <span style="font-size: 12px; color: #3498db;">${record.includeImages ? '📷 含图片' : '📝 纯文本'}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #2c3e50;">原文：</strong>
            <p style="margin: 5px 0; font-size: 13px; color: #555;">${contentPreview}</p>
          </div>
          <div>
            <strong style="color: #27ae60;">总结：</strong>
            <p style="margin: 5px 0; font-size: 13px; color: #333;">${summaryPreview}</p>
          </div>
          <div style="margin-top: 10px;">
            <button onclick="copyToClipboard('${record.summary.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}')" style="
              background: #27ae60;
              color: white;
              border: none;
              padding: 4px 8px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
              margin-right: 5px;
            ">复制总结</button>
            <button onclick="deleteHistoryItem(${index})" style="
              background: #e74c3c;
              color: white;
              border: none;
              padding: 4px 8px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
            ">删除</button>
          </div>
        </div>
      `;
    });
    
    historyHTML += '</div>';
    
    // 使用构建好的HTML内容
    modal.innerHTML = historyHTML;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 绑定事件
    document.getElementById('closeHistoryBtn').addEventListener('click', () => {
      overlay.remove();
    });
    
    document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
      if (confirm('确定要清空所有历史记录吗？')) {
        await chrome.storage.local.set({ summaryHistory: [] });
        overlay.remove();
        showToast('历史记录已清空');
      }
    });
    
    document.getElementById('exportHistoryBtn').addEventListener('click', () => {
      exportHistory(summaryHistory);
    });
    
    // 点击背景关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
  } catch (error) {
    console.error('显示历史记录失败:', error);
    showToast('显示历史记录失败');
  }
}

// 导出历史记录
function exportHistory(history) {
  try {
    const exportData = {
      exportTime: new Date().toISOString(),
      totalRecords: history.length,
      records: history.map(record => ({
        date: new Date(record.timestamp).toLocaleString('zh-CN'),
        content: record.content,
        summary: record.summary,
        includeImages: record.includeImages
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `TK总结历史记录_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('历史记录已导出');
  } catch (error) {
    console.error('导出失败:', error);
    showToast('导出失败');
  }
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    showToast('复制失败');
  });
}

// 删除历史记录项
async function deleteHistoryItem(index) {
  try {
    const { summaryHistory = [] } = await chrome.storage.local.get('summaryHistory');
    summaryHistory.splice(index, 1);
    await chrome.storage.local.set({ summaryHistory });
    
    // 重新显示历史记录
    document.querySelector('.history-overlay')?.remove();
    showHistory();
    showToast('记录已删除');
  } catch (error) {
    console.error('删除记录失败:', error);
    showToast('删除失败');
  }
}

  // 注意：主要的DOMContentLoaded事件监听器已在文件开头定义