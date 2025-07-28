// 用户登录逻辑
class UserLogin {
  constructor() {
    this.apiBaseUrl = 'https://api.example.com'; // 替换为实际API地址
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStoredData();
    this.checkAutoLogin();
  }

  bindEvents() {
    const form = document.getElementById('loginForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const wechatLogin = document.getElementById('wechatLogin');
    const qqLogin = document.getElementById('qqLogin');
    
    form.addEventListener('submit', (e) => this.handleSubmit(e));
    forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
    wechatLogin.addEventListener('click', () => this.handleSocialLogin('wechat'));
    qqLogin.addEventListener('click', () => this.handleSocialLogin('qq'));
    
    // 实时验证
    document.getElementById('email').addEventListener('blur', () => this.validateEmail());
    document.getElementById('password').addEventListener('blur', () => this.validatePassword());
  }

  loadStoredData() {
    // 从本地存储加载记住的邮箱
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (rememberedEmail && rememberMe) {
      document.getElementById('email').value = rememberedEmail;
      document.getElementById('rememberMe').checked = true;
    }
  }

  async checkAutoLogin() {
    // 检查是否有有效的登录状态
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user.token) {
          // 验证token是否仍然有效
          const isValid = await this.validateToken(user.token);
          if (isValid) {
            this.showToast('检测到已登录状态，正在跳转...', 'success');
            setTimeout(() => {
              this.redirectToMain();
            }, 1000);
            return;
          }
        }
      }
    } catch (error) {
      console.error('自动登录检查失败:', error);
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Token验证失败:', error);
      return false;
    }
  }

  validateEmail() {
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
      this.showFieldError('email', '请输入有效的邮箱地址');
      return false;
    }
    
    this.hideFieldError('email');
    return true;
  }

  validatePassword() {
    const password = document.getElementById('password').value;
    
    if (!password) {
      this.showFieldError('password', '密码不能为空');
      return false;
    }
    
    this.hideFieldError('password');
    return true;
  }

  showFieldError(fieldName, message) {
    const errorElement = document.getElementById(fieldName + 'Error');
    const inputElement = document.getElementById(fieldName);
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    inputElement.style.borderColor = '#ef4444';
  }

  hideFieldError(fieldName) {
    const errorElement = document.getElementById(fieldName + 'Error');
    const inputElement = document.getElementById(fieldName);
    
    errorElement.style.display = 'none';
    inputElement.style.borderColor = '#e1e5e9';
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    // 验证所有字段
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
      loginBtn.disabled = true;
      loginBtn.textContent = '登录中...';
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 登录成功，保存用户信息
        await this.saveUserInfo(result.data, rememberMe);
        this.showToast('登录成功！正在跳转...', 'success');
        
        setTimeout(() => {
          this.redirectToMain();
        }, 1500);
      } else {
        this.showToast(result.message || '登录失败，请检查邮箱和密码', 'error');
      }
    } catch (error) {
      console.error('登录失败:', error);
      this.showToast('网络错误，请检查网络连接', 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    }
  }

  async saveUserInfo(userData, rememberMe) {
    // 重置每日使用次数（如果是新的一天）
    const today = new Date().toDateString();
    const lastResetDate = userData.lastResetDate || today;
    const usageCount = lastResetDate === today ? (userData.usageCount || 0) : 0;
    
    const userInfo = {
      userId: userData.userId,
      email: userData.email,
      token: userData.token,
      isPro: userData.isPro || false,
      subscriptionPlan: userData.subscriptionPlan || 'free',
      usageCount: usageCount,
      dailyLimit: userData.isPro ? -1 : 10, // 专业版无限制，免费版10次
      lastResetDate: today,
      loginAt: new Date().toISOString()
    };
    
    // 保存到localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    // 处理记住我功能
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', userData.email);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
    }
    
    // 如果在Chrome扩展环境中，也保存到chrome.storage
    if (chrome && chrome.storage) {
      await chrome.storage.local.set({
        userInfo,
        isLoggedIn: true,
        usageCount: usageCount,
        isPro: userData.isPro || false
      });
    }
  }

  handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    if (!email) {
      this.showToast('请先输入邮箱地址', 'error');
      return;
    }
    
    if (!this.validateEmail()) {
      return;
    }
    
    // 发送重置密码邮件
    this.sendResetPasswordEmail(email);
  }

  async sendResetPasswordEmail(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('重置密码邮件已发送，请查收', 'success');
      } else {
        this.showToast(result.message || '发送失败，请重试', 'error');
      }
    } catch (error) {
      console.error('发送重置密码邮件失败:', error);
      this.showToast('网络错误，请检查网络连接', 'error');
    }
  }

  async handleSocialLogin(provider) {
    try {
      this.showToast(`正在跳转到${provider === 'wechat' ? '微信' : 'QQ'}登录...`, 'success');
      
      // 构建第三方登录URL
      const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
      const loginUrl = `${this.apiBaseUrl}/api/auth/${provider}?redirect_uri=${redirectUri}`;
      
      // 打开新窗口进行第三方登录
      const popup = window.open(
        loginUrl,
        'socialLogin',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // 监听登录结果
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // 检查是否登录成功
          this.checkSocialLoginResult();
        }
      }, 1000);
      
    } catch (error) {
      console.error('第三方登录失败:', error);
      this.showToast('登录失败，请重试', 'error');
    }
  }

  async checkSocialLoginResult() {
    // 检查是否有新的用户信息
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user.token && user.loginAt) {
          const loginTime = new Date(user.loginAt).getTime();
          const now = new Date().getTime();
          
          // 如果是最近1分钟内的登录，认为是第三方登录成功
          if (now - loginTime < 60000) {
            this.showToast('登录成功！正在跳转...', 'success');
            setTimeout(() => {
              this.redirectToMain();
            }, 1500);
            return;
          }
        }
      }
    } catch (error) {
      console.error('检查第三方登录结果失败:', error);
    }
  }

  redirectToMain() {
    if (chrome && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      window.close();
    } else {
      window.location.href = 'popup.html';
    }
  }

  showToast(message, type = 'success') {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    // 3秒后隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new UserLogin();
});

// 如果在Chrome扩展环境中，处理扩展特定的逻辑
if (chrome && chrome.runtime) {
  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkLoginStatus') {
      const userInfo = localStorage.getItem('userInfo');
      sendResponse({ isLoggedIn: !!userInfo });
    }
  });
}