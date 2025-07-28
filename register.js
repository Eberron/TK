// 用户注册逻辑
class UserRegistration {
  constructor() {
    this.apiBaseUrl = 'https://api.example.com'; // 替换为实际API地址
    this.countdown = 0;
    this.countdownTimer = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadStoredData();
  }

  bindEvents() {
    const form = document.getElementById('registerForm');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    
    form.addEventListener('submit', (e) => this.handleSubmit(e));
    sendCodeBtn.addEventListener('click', () => this.sendVerificationCode());
    
    // 实时验证
    document.getElementById('email').addEventListener('blur', () => this.validateEmail());
    document.getElementById('password').addEventListener('blur', () => this.validatePassword());
    document.getElementById('confirmPassword').addEventListener('blur', () => this.validateConfirmPassword());
  }

  loadStoredData() {
    // 从本地存储加载已填写的数据
    const email = localStorage.getItem('registerEmail');
    if (email) {
      document.getElementById('email').value = email;
    }
  }

  validateEmail() {
    const email = document.getElementById('email').value;
    const emailError = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
      this.showFieldError('email', '请输入有效的邮箱地址');
      return false;
    }
    
    this.hideFieldError('email');
    localStorage.setItem('registerEmail', email);
    return true;
  }

  validatePassword() {
    const password = document.getElementById('password').value;
    
    if (!password || password.length < 6) {
      this.showFieldError('password', '密码至少需要6位字符');
      return false;
    }
    
    this.hideFieldError('password');
    return true;
  }

  validateConfirmPassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!confirmPassword || password !== confirmPassword) {
      this.showFieldError('confirmPassword', '两次输入的密码不一致');
      return false;
    }
    
    this.hideFieldError('confirmPassword');
    return true;
  }

  validateVerificationCode() {
    const code = document.getElementById('verificationCode').value;
    
    if (!code || code.length !== 6) {
      this.showFieldError('verificationCode', '请输入6位验证码');
      return false;
    }
    
    this.hideFieldError('verificationCode');
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

  async sendVerificationCode() {
    if (!this.validateEmail()) {
      return;
    }

    const email = document.getElementById('email').value;
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    
    try {
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = '发送中...';
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('验证码已发送到您的邮箱', 'success');
        this.startCountdown();
      } else {
        this.showToast(result.message || '发送失败，请重试', 'error');
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      this.showToast('网络错误，请检查网络连接', 'error');
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '发送验证码';
    }
  }

  startCountdown() {
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    this.countdown = 60;
    
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      sendCodeBtn.textContent = `${this.countdown}秒后重发`;
      
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '发送验证码';
      }
    }, 1000);
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    // 验证所有字段
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    const isConfirmPasswordValid = this.validateConfirmPassword();
    const isCodeValid = this.validateVerificationCode();
    
    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isCodeValid) {
      return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    const formData = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      verificationCode: document.getElementById('verificationCode').value
    };
    
    try {
      registerBtn.disabled = true;
      registerBtn.textContent = '注册中...';
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 注册成功，保存用户信息
        await this.saveUserInfo(result.data);
        this.showToast('注册成功！正在跳转...', 'success');
        
        // 清除临时数据
        localStorage.removeItem('registerEmail');
        
        // 跳转到主页面或登录页面
        setTimeout(() => {
          if (chrome && chrome.tabs) {
            chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
            window.close();
          } else {
            window.location.href = 'popup.html';
          }
        }, 1500);
      } else {
        this.showToast(result.message || '注册失败，请重试', 'error');
      }
    } catch (error) {
      console.error('注册失败:', error);
      this.showToast('网络错误，请检查网络连接', 'error');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = '创建账号';
    }
  }

  async saveUserInfo(userData) {
    // 保存用户信息到本地存储和Chrome存储
    const userInfo = {
      userId: userData.userId,
      email: userData.email,
      token: userData.token,
      isPro: false,
      subscriptionPlan: 'free',
      usageCount: 0,
      dailyLimit: 10, // 免费用户每日10次
      lastResetDate: new Date().toDateString(),
      registeredAt: new Date().toISOString()
    };
    
    // 保存到localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    // 如果在Chrome扩展环境中，也保存到chrome.storage
    if (chrome && chrome.storage) {
      await chrome.storage.local.set({
        userInfo,
        isLoggedIn: true,
        usageCount: 0,
        isPro: false
      });
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
  new UserRegistration();
});

// 如果在Chrome扩展环境中，处理扩展特定的逻辑
if (chrome && chrome.runtime) {
  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkRegistrationStatus') {
      const userInfo = localStorage.getItem('userInfo');
      sendResponse({ isRegistered: !!userInfo });
    }
  });
}