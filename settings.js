document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的密钥
  chrome.storage.local.get('deepseekApiKey', (data) => {
    document.getElementById('apiKeyInput').value = data.deepseekApiKey || '';
  });

  // 保存按钮事件
  document.getElementById('saveApiKey').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    chrome.storage.local.set({ deepseekApiKey: apiKey }, () => {
      showStatus('设置已保存！', 'success');
    });
  });
});

function showStatus(message, type='info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-${type}`;
}