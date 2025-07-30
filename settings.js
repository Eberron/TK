document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的密钥
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get('deepseekApiKey', (data) => {
      document.getElementById('apiKeyInput').value = data.deepseekApiKey || '';
    });
  } else {
    // 浏览器环境下使用localStorage
    const savedKey = localStorage.getItem('deepseekApiKey');
    document.getElementById('apiKeyInput').value = savedKey || '';
  }

  // 密钥显示切换功能
  document.getElementById('togglePassword').addEventListener('click', () => {
    const input = document.getElementById('apiKeyInput');
    const toggle = document.getElementById('togglePassword');
    
    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = '🙈 隐藏密钥';
    } else {
      input.type = 'password';
      toggle.textContent = '👁️ 显示密钥';
    }
  });

  // 保存按钮事件
  document.getElementById('saveApiKey').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
      showStatus('请输入API密钥！', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('API密钥格式不正确，应以"sk-"开头！', 'error');
      return;
    }
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ deepseekApiKey: apiKey }, () => {
        showStatus('✅ 设置已保存！', 'success');
      });
    } else {
      // 浏览器环境下使用localStorage
      localStorage.setItem('deepseekApiKey', apiKey);
      showStatus('✅ 设置已保存！', 'success');
    }
  });
  
  // 测试API连接
  document.getElementById('testApiKey').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
      showStatus('请先输入API密钥！', 'error');
      return;
    }
    
    showStatus('🔄 正在测试连接...', 'info');
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: '测试连接'
          }],
          max_tokens: 10
        })
      });
      
      if (response.ok) {
        showStatus('✅ API连接测试成功！', 'success');
      } else {
        let errorMessage = '未知错误';
        try {
          const errorData = await response.json();
          errorMessage = errorData && errorData.error && errorData.error.message ? errorData.error.message : `HTTP ${response.status}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}`;
        }
        showStatus(`❌ API测试失败: ${errorMessage}`, 'error');
      }
    } catch (error) {
      showStatus(`❌ 连接失败: ${error.message}`, 'error');
    }
  });
});

function showStatus(message, type='info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-${type}`;
}