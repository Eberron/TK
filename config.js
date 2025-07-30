// TK插件配置文件
const CONFIG = {
  // API服务器地址
  API_BASE_URL: 'http://localhost:3000',
  
  // 开发模式标志
  DEV_MODE: true,
  
  // DeepSeek API配置
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
  
  // 用户类型配置
  USER_TYPES: {
    GUEST: 'guest',
    FREE: 'free', 
    PRO: 'pro'
  },
  
  // 使用限制配置
  USAGE_LIMITS: {
    GUEST_DAILY: 3,
    FREE_DAILY: 10,
    PRO_DAILY: 999
  },
  
  // 订阅计划配置
  PLANS: {
    monthly: { name: '月度专业版', price: 19.9 },
    yearly: { name: '年度专业版', price: 199 },
    lifetime: { name: '终身会员', price: 599 }
  },
  
  // 管理后台配置
  ADMIN: {
    DEFAULT_USERNAME: 'admin',
    DEFAULT_PASSWORD: 'AdminPass123!@#'
  }
};

// 根据环境自动调整配置
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  CONFIG.API_BASE_URL = 'https://your-production-api.com';
  CONFIG.DEV_MODE = false;
}

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}