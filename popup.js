document.addEventListener('DOMContentLoaded', async () => {
    // 初始化状态
    const { usageCount = 0, isPro = false } = await chrome.storage.local.get(['usageCount', 'isPro']);
    updateUIState(usageCount, isPro);
  
    // 事件绑定
    document.getElementById('summarizeBtn').addEventListener('click', handleSummarize);
    document.getElementById('activateLicense').addEventListener('click', handleLicenseActivation);
  });
  
  async function updateUIState(usageCount, isPro) {
    const remaining = 50 - usageCount;
    document.getElementById('usage').textContent = isPro 
      ? "专业版用户 · 无限使用" 
      : `剩余免费次数：${remaining}/50`;
    
    document.getElementById('proPrompt').style.display = 
      (!isPro && remaining <= 0) ? 'block' : 'none';
    
    document.getElementById('summarizeBtn').disabled = 
      (!isPro && remaining <= 0);
  }
  
  async function handleLicenseActivation() {
    const licenseKey = document.getElementById('licenseKey').value;
    if (!licenseKey) return;
  
    try {
      // 这里需要接入实际的许可证验证API
      const isValid = await validateLicenseKey(licenseKey);
      
      if (isValid) {
        await chrome.storage.local.set({ isPro: true });
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
  
  async function handleSummarize() {
    try {
      setLoading(true);
      
      // 检查使用限制
      const { usageCount = 0, isPro = false } = await chrome.storage.local.get(['usageCount', 'isPro']);
      if (!isPro && usageCount >= 50) return;
  
      // 获取页面内容
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const includeImages = document.getElementById('includeImages').checked;
      
      let content;
      if (includeImages) {
        // 获取文本和图片内容
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            return new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "extractContent" }, (response) => {
                resolve(response);
              });
            });
          }
        });
        
        if (result.result.success) {
          content = result.result.content;
        } else {
          throw new Error(result.result.error || '获取内容失败');
        }
      } else {
        // 只获取文本内容
        const [contentResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText.trim()
        });
        content = { text: contentResult.result, images: [] };
      }
  
      // 生成总结
      const summary = await generateSummary(content);
      document.getElementById('result').innerHTML = summary;
  
      // 更新使用次数
      if (!isPro) {
        await chrome.storage.local.set({ usageCount: usageCount + 1 });
        updateUIState(usageCount + 1, false);
      }
    } catch (error) {
      showToast(`⚠️ 错误：${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  
  async function generateSummary(content) {
    const { deepseekApiKey } = await chrome.storage.local.get('deepseekApiKey');
    
    let messages;
    let model = "deepseek-chat";
    
    if (typeof content === 'string') {
      // 兼容旧的纯文本模式
      messages = [{
        role: "user",
        content: `请用简洁的中文总结以下内容，保留关键数据和结论：\n\n${content.slice(0, 12000)}`
      }];
    } else {
      // 新的多模态模式
      const { text, images } = content;
      
      if (images && images.length > 0) {
        // 使用支持视觉的模型
        model = "deepseek-vl-chat";
        
        const messageContent = [
          {
            type: "text",
            text: `请分析以下网页内容并生成简洁的中文总结。如果有图片，请描述图片内容并结合文本进行综合分析：\n\n文本内容：\n${text.slice(0, 8000)}`
          }
        ];
        
        // 添加图片（最多3张以避免token过多）
        for (let i = 0; i < Math.min(images.length, 3); i++) {
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
        // 只有文本，使用普通模型
        messages = [{
          role: "user",
          content: `请用简洁的中文总结以下内容，保留关键数据和结论：\n\n${text.slice(0, 12000)}`
        }];
      }
    }
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
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
  async function generateSummary(content) {
    try {
      console.log("[DEBUG] 原始内容长度:", content.length);
      
      const { deepseekApiKey } = await chrome.storage.local.get('deepseekApiKey');
      console.log("[DEBUG] API Key:", deepseekApiKey?.slice(0, 5) + "****"); // 显示前5位
  
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{
            role: "user",
            content: `请用简洁的中文总结以下内容：\n${content.slice(0, 12000)}`
          }],
          temperature: 0.7
        })
      });
  
      console.log("[DEBUG] API响应状态:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[ERROR] API错误详情:", errorData);
        throw new Error(`API错误: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("[DEBUG] 完整响应数据:", data);
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error("[ERROR] 生成总结失败:", error);
      throw error; // 保持错误冒泡
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    // ...原有初始化代码不变...
  });
  
  async function handleSummarize() {
    try {
      setLoading(true);
      console.log("[1/4] 开始生成流程...");
      
      // 检查使用限制
      const { usageCount = 0, isPro = false } = await chrome.storage.local.get(['usageCount', 'isPro']);
      console.log("[2/4] 当前使用次数:", usageCount, "专业版状态:", isPro);
      
      if (!isPro && usageCount >= 50) return;
  
      // 获取页面内容
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log("[3/4] 当前标签页:", tab.url);
      
      const [contentResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.body.innerText.trim()
      });
      
      // 生成总结
      console.log("[4/4] 开始API调用...");
      const summary = await generateSummary(contentResult.result);
      
      document.getElementById('result').textContent = summary;
      console.log("[SUCCESS] 总结生成完成");
  
      // 更新使用次数
      if (!isPro) {
        await chrome.storage.local.set({ usageCount: usageCount + 1 });
        updateUIState(usageCount + 1, false);
      }
    } catch (error) {
      console.error("[FATAL] 全局捕获错误:", error);
      showToast(`生成失败: ${error.message}`);
    } finally {
      setLoading(false);
      console.log("[STATUS] 加载状态已重置");
    }
  }
  
  // ...其余函数保持不变...