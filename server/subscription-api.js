// 订阅管理API服务器示例
// 使用 Node.js + Express 实现

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const app = express();

// CORS配置 - 限制允许的源域名
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'chrome-extension://*', // Chrome扩展
      'moz-extension://*',    // Firefox扩展
      'https://localhost:*',  // 本地开发
      'http://localhost:*',   // 本地开发
      'https://127.0.0.1:*',  // 本地开发
      'http://127.0.0.1:*'    // 本地开发
    ];
    
    // 如果没有origin（如直接访问HTML文件、Postman等工具），允许访问
    if (!origin) {
      return callback(null, true);
    }
    
    // 检查origin是否在允许列表中
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// API频率限制配置
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 严格的API频率限制（用于敏感操作）
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP最多10次请求
  message: {
    success: false,
    message: '操作过于频繁，请稍后再试'
  }
});

// 中间件
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter); // 对所有API应用频率限制

// 静态文件服务 - 提供HTML文件访问
const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// 模拟数据库
const subscriptions = new Map();
const licenses = new Map();
const orders = new Map();
const users = new Map(); // userId -> userInfo
const usersByEmail = new Map(); // email -> userId
const verificationCodes = new Map(); // email -> { code, expiry, attempts }
const userTokens = new Map(); // token -> { userId, expiry }
const adminTokens = new Map(); // token -> { username, expiry }

// 密码强度验证函数
function validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, message: '密码长度至少8位' };
    }
    
    if (!hasUpperCase) {
        return { valid: false, message: '密码必须包含大写字母' };
    }
    
    if (!hasLowerCase) {
        return { valid: false, message: '密码必须包含小写字母' };
    }
    
    if (!hasNumbers) {
        return { valid: false, message: '密码必须包含数字' };
    }
    
    if (!hasSpecialChar) {
        return { valid: false, message: '密码必须包含特殊字符' };
    }
    
    // 检查常见弱密码
    const weakPasswords = ['password', '12345678', 'admin123', 'qwerty123'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
        return { valid: false, message: '密码过于简单，请使用更复杂的密码' };
    }
    
    return { valid: true };
}

// 强制检查默认密码
const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
const passwordValidation = validatePasswordStrength(defaultPassword);
if (!passwordValidation.valid) {
    console.error('⚠️  警告：管理员密码不符合安全要求:', passwordValidation.message);
    console.error('请设置环境变量 ADMIN_PASSWORD 为强密码');
    process.exit(1);
}

// 管理员账户（实际部署时应该从数据库读取）
const adminAccounts = new Map([
    ['admin', {
        username: 'admin',
        password: hashPassword(defaultPassword),
        name: '系统管理员',
        role: 'admin',
        createdAt: new Date().toISOString()
    }]
]);

// 订阅计划配置
const PLANS = {
  free: { name: '免费版', price: 0, duration: null, features: ['每日5次总结'] },
  monthly: { name: '月度专业版', price: 19.9, duration: 30, features: ['无限总结', '图片分析', '表格解析'] },
  yearly: { name: '年度专业版', price: 199, duration: 365, features: ['无限总结', '图片分析', '表格解析', '优先支持'] },
  lifetime: { name: '终身会员', price: 599, duration: null, features: ['无限总结', '图片分析', '表格解析', '优先支持', '新功能抢先体验'] }
};

// 支付方式配置
const PAYMENT_METHODS = {
  alipay: { name: '支付宝', enabled: true },
  wechat: { name: '微信支付', enabled: true },
  card: { name: '银行卡', enabled: false }
};

// 生成订单ID
function generateOrderId() {
  return 'TK' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 生成许可证密钥
function generateLicenseKey(planType) {
  const prefix = 'TK-PRO-';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}${timestamp}-${random}`;
}

// API路由

// 获取订阅计划
app.get('/api/plans', (req, res) => {
  res.json({
    success: true,
    data: PLANS
  });
});

// 获取支付方式
app.get('/api/payment-methods', (req, res) => {
  res.json({
    success: true,
    data: PAYMENT_METHODS
  });
});

// 创建订单
app.post('/api/orders', (req, res) => {
  const { planType, paymentMethod } = req.body;
  
  if (!PLANS[planType]) {
    return res.status(400).json({
      success: false,
      message: '无效的订阅计划'
    });
  }
  
  if (!PAYMENT_METHODS[paymentMethod] || !PAYMENT_METHODS[paymentMethod].enabled) {
    return res.status(400).json({
      success: false,
      message: '不支持的支付方式'
    });
  }
  
  const orderId = generateOrderId();
  const order = {
    id: orderId,
    planType,
    paymentMethod,
    amount: PLANS[planType].price,
    status: 'pending',
    createdAt: new Date().toISOString(),
    paymentUrl: `https://payment.example.com/pay/${orderId}`
  };
  
  orders.set(orderId, order);
  
  res.json({
    success: true,
    data: order
  });
});

// 查询订单状态
app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.get(orderId);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: '订单不存在'
    });
  }
  
  // 模拟支付状态变化（实际应用中由支付回调更新）
  if (order.status === 'pending' && Math.random() > 0.3) {
    order.status = 'paid';
    order.paidAt = new Date().toISOString();
    
    // 生成许可证
    if (order.status === 'paid') {
      const licenseKey = generateLicenseKey(order.planType);
      const expiryDate = PLANS[order.planType].duration 
        ? new Date(Date.now() + PLANS[order.planType].duration * 24 * 60 * 60 * 1000)
        : null;
      
      const license = {
        key: licenseKey,
        planType: order.planType,
        orderId: order.id,
        expiry: expiryDate ? expiryDate.toISOString() : null,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      licenses.set(licenseKey, license);
      order.licenseKey = licenseKey;
    }
  }
  
  res.json({
    success: true,
    data: order
  });
});

// 验证许可证
app.post('/api/license/validate', (req, res) => {
  const { licenseKey } = req.body;
  
  if (!licenseKey) {
    return res.status(400).json({
      success: false,
      message: '许可证密钥不能为空'
    });
  }
  
  const license = licenses.get(licenseKey);
  
  if (!license) {
    return res.json({
      success: false,
      message: '无效的许可证密钥'
    });
  }
  
  // 检查是否过期
  if (license.expiry && new Date(license.expiry) < new Date()) {
    return res.json({
      success: false,
      message: '许可证已过期'
    });
  }
  
  if (!license.isActive) {
    return res.json({
      success: false,
      message: '许可证已被禁用'
    });
  }
  
  res.json({
    success: true,
    planType: license.planType,
    expiry: license.expiry,
    features: PLANS[license.planType].features
  });
});

// 获取用户订阅状态
app.get('/api/subscription/:licenseKey', (req, res) => {
  const { licenseKey } = req.params;
  const license = licenses.get(licenseKey);
  
  if (!license) {
    return res.status(404).json({
      success: false,
      message: '许可证不存在'
    });
  }
  
  const plan = PLANS[license.planType];
  const daysRemaining = license.expiry 
    ? Math.max(0, Math.ceil((new Date(license.expiry) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  
  res.json({
    success: true,
    data: {
      licenseKey,
      planType: license.planType,
      planName: plan.name,
      features: plan.features,
      expiry: license.expiry,
      daysRemaining,
      isActive: license.isActive
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 工具函数
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 改进的密码哈希函数 - 使用更安全的算法
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 验证密码
function verifyPassword(password, hashedPassword) {
  if (!hashedPassword.includes(':')) {
    // 兼容旧的哈希格式
    return crypto.createHash('sha256').update(password + 'salt').digest('hex') === hashedPassword;
  }
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Token过期验证
function isTokenValid(tokenData) {
  if (!tokenData || !tokenData.expiry) return false;
  return Date.now() < tokenData.expiry;
}

// 创建带过期时间的Token数据
function createTokenData(id, expiryHours = 24) {
  return {
    [typeof id === 'string' && id.includes('@') ? 'username' : 'userId']: id,
    expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
  };
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

// 清理过期Token
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of userTokens.entries()) {
    if (data.expiry && now > data.expiry) {
      userTokens.delete(token);
    }
  }
  for (const [token, data] of adminTokens.entries()) {
    if (data.expiry && now > data.expiry) {
      adminTokens.delete(token);
    }
  }
}

// 定期清理过期Token（每小时执行一次）
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// 用户认证相关API

// 发送邮箱验证码
app.post('/api/auth/send-verification', strictLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }
    
    // 检查发送频率限制
    const existing = verificationCodes.get(email);
    if (existing && Date.now() - existing.sentAt < 60000) {
      return res.status(429).json({
        success: false,
        message: '验证码发送过于频繁，请稍后再试'
      });
    }
    
    const code = generateVerificationCode();
    const expiry = Date.now() + 10 * 60 * 1000; // 10分钟有效期
    
    verificationCodes.set(email, {
      code,
      expiry,
      attempts: 0,
      sentAt: Date.now()
    });
    
    // 尝试发送真实邮件，失败时降级到模拟模式
    try {
      // 检查是否配置了邮件服务
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        const mailOptions = {
          from: process.env.SMTP_FROM || `"智能页面总结" <${process.env.SMTP_USER}>`,
          to: email,
          subject: '智能页面总结 - 邮箱验证码',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; text-align: center;">智能页面总结</h1>
              <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
                <h2 style="color: #333;">您的验证码</h2>
                <div style="font-size: 32px; font-weight: bold; color: #007cff; letter-spacing: 5px; margin: 20px 0;">${code}</div>
                <p style="color: #666;">验证码有效期为 10 分钟</p>
              </div>
              <p style="color: #999; text-align: center;">如果这不是您的操作，请忽略此邮件。</p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`📧 验证码邮件发送成功: ${email}`);
        res.json({ success: true, message: '验证码已发送到您的邮箱' });
      } else {
        // 邮件配置不完整，使用模拟模式
        console.log(`📧 [模拟模式] 验证码发送到 ${email}: ${code}`);
        console.log(`📧 [开发提示] 请在控制台查看验证码，或配置邮件服务环境变量`);
        res.json({ success: true, message: '验证码已发送（开发模式：请查看控制台）', devMode: true, code: code });
      }
    } catch (error) {
      console.error('📧 邮件发送失败，降级到模拟模式:', error);
      console.log(`📧 [降级模拟] 验证码发送到 ${email}: ${code}`);
      res.json({ success: true, message: '验证码已发送（模拟模式：请查看控制台）', devMode: true, code: code });
    }
    
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '发送验证码失败，请重试'
    });
  }
});

// 用户注册
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, verificationCode } = req.body;
    
    // 验证输入
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }
    
    if (!password || !validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少6位'
      });
    }
    
    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: '请输入验证码'
      });
    }
    
    // 检查用户是否已存在
    if (usersByEmail.has(email)) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
    }
    
    // 验证验证码
    const codeInfo = verificationCodes.get(email);
    if (!codeInfo) {
      return res.status(400).json({
        success: false,
        message: '请先获取验证码'
      });
    }
    
    if (Date.now() > codeInfo.expiry) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新获取'
      });
    }
    
    if (codeInfo.attempts >= 3) {
      verificationCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: '验证码尝试次数过多，请重新获取'
      });
    }
    
    if (codeInfo.code !== verificationCode) {
      codeInfo.attempts++;
      return res.status(400).json({
        success: false,
        message: '验证码错误'
      });
    }
    
    // 创建用户
    const userId = generateId();
    const token = generateToken();
    const hashedPassword = hashPassword(password);
    
    const userInfo = {
      userId,
      email,
      password: hashedPassword,
      isPro: false,
      subscriptionPlan: 'free',
      usageCount: 0,
      dailyLimit: 10,
      lastResetDate: new Date().toDateString(),
      registeredAt: new Date().toISOString(),
      isGuest: false,
      isActive: true // 默认激活状态
    };
    
    // 保存用户信息
    users.set(userId, userInfo);
    usersByEmail.set(email, userId);
    userTokens.set(token, createTokenData(userId, 24)); // 24小时过期
    
    // 清除验证码
    verificationCodes.delete(email);
    
    // 返回用户信息（不包含密码）
    const { password: _, ...safeUserInfo } = userInfo;
    
    res.json({
      success: true,
      message: '注册成功',
      data: {
        ...safeUserInfo,
        token
      }
    });
    
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请重试'
    });
  }
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证输入
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的邮箱地址'
      });
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入密码'
      });
    }
    
    // 查找用户
    const userId = usersByEmail.get(email);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    const userInfo = users.get(userId);
    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证密码
    if (!verifyPassword(password, userInfo.password)) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }
    
    // 检查用户状态
    if (userInfo.isActive === false) {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用，请联系管理员'
      });
    }
    
    // 重置每日使用次数（如果是新的一天）
    const today = new Date().toDateString();
    if (userInfo.lastResetDate !== today) {
      userInfo.usageCount = 0;
      userInfo.lastResetDate = today;
    }
    
    // 生成新的token（24小时过期）
    const token = generateToken();
    userTokens.set(token, createTokenData(userId, 24));
    
    // 更新登录时间
    userInfo.loginAt = new Date().toISOString();
    
    // 返回用户信息（不包含密码）
    const { password: _, ...safeUserInfo } = userInfo;
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        ...safeUserInfo,
        token
      }
    });
    
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请重试'
    });
  }
});

// 验证token
app.post('/api/auth/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token不能为空'
      });
    }
    
    const tokenData = userTokens.get(token);
    if (!tokenData || !isTokenValid(tokenData)) {
      userTokens.delete(token); // 清理无效token
      return res.status(401).json({
        success: false,
        message: 'Token无效或已过期'
      });
    }
    
    const userInfo = users.get(tokenData.userId);
    if (!userInfo) {
      userTokens.delete(token); // 清理无效token
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查用户状态
    if (userInfo.isActive === false) {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用，请联系管理员'
      });
    }
    
    // 重置每日使用次数（如果是新的一天）
    const today = new Date().toDateString();
    if (userInfo.lastResetDate !== today) {
      userInfo.usageCount = 0;
      userInfo.lastResetDate = today;
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...safeUserInfo } = userInfo;
    
    res.json({
      success: true,
      data: safeUserInfo
    });
    
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(500).json({
      success: false,
      message: 'Token验证失败'
    });
  }
});

// 管理员登录
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }
    
    const admin = adminAccounts.get(username);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    if (!verifyPassword(password, admin.password)) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 生成管理员token（12小时过期）
    const token = generateToken();
    adminTokens.set(token, createTokenData(username, 12));
    
    // 返回管理员信息（不包含密码）
    const { password: _, ...safeAdminInfo } = admin;
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        ...safeAdminInfo,
        token
      }
    });
    
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请重试'
    });
  }
});

// 验证管理员token
app.post('/api/admin/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token不能为空'
      });
    }
    
    const tokenData = adminTokens.get(token);
    if (!tokenData || !isTokenValid(tokenData)) {
      adminTokens.delete(token); // 清理无效token
      return res.status(401).json({
        success: false,
        message: 'Token无效或已过期'
      });
    }
    
    const admin = adminAccounts.get(tokenData.username);
    if (!admin) {
      adminTokens.delete(token); // 清理无效token
      return res.status(401).json({
        success: false,
        message: '管理员不存在'
      });
    }
    
    // 返回管理员信息（不包含密码）
    const { password: _, ...safeAdminInfo } = admin;
    
    res.json({
      success: true,
      data: safeAdminInfo
    });
    
  } catch (error) {
    console.error('管理员Token验证失败:', error);
    res.status(500).json({
      success: false,
      message: 'Token验证失败'
    });
  }
});

// 获取系统统计数据（管理员专用）
app.get('/api/admin/stats', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    // 统计数据
    const totalUsers = users.size;
    const totalOrders = orders.size;
    const totalLicenses = licenses.size;
    
    // 统计订单状态
    const orderStats = {
      pending: 0,
      paid: 0,
      failed: 0
    };
    
    for (const order of orders.values()) {
      orderStats[order.status] = (orderStats[order.status] || 0) + 1;
    }
    
    // 统计订阅计划
    const planStats = {};
    for (const license of licenses.values()) {
      planStats[license.planType] = (planStats[license.planType] || 0) + 1;
    }
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalLicenses,
        orderStats,
        planStats
      }
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 获取用户列表（管理员专用）
app.get('/api/admin/users', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const tokenData = adminTokens.get(token);
    if (!tokenData || !isTokenValid(tokenData)) {
      adminTokens.delete(token);
      return res.status(401).json({
        success: false,
        message: '管理员Token无效或已过期'
      });
    }
    
    const userList = Array.from(users.values()).map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    res.json({
      success: true,
      data: userList
    });
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 获取订单列表（管理员专用）
app.get('/api/admin/orders', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const orderList = Array.from(orders.values());
    
    res.json({
      success: true,
      data: orderList
    });
    
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

// 获取许可证列表（管理员专用）
app.get('/api/admin/licenses', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const licenseList = Array.from(licenses.values());
    
    res.json({
      success: true,
      data: licenseList
    });
    
  } catch (error) {
    console.error('获取许可证列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取许可证列表失败'
    });
  }
});

// 切换用户状态（管理员专用）
app.post('/api/admin/users/:userId/toggle', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    user.isActive = isActive;
    
    res.json({
      success: true,
      message: `用户状态已${isActive ? '启用' : '禁用'}`
    });
  } catch (error) {
    console.error('切换用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '切换用户状态失败'
    });
  }
});

// 取消订单（管理员专用）
app.post('/api/admin/orders/:orderId/cancel', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { orderId } = req.params;
    
    const order = orders.get(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: '订单已取消'
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      message: '取消订单失败'
    });
  }
});

// 撤销许可证（管理员专用）
app.post('/api/admin/licenses/:licenseKey/revoke', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !adminTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    
    const { licenseKey } = req.params;
    
    const license = licenses.get(licenseKey);
    if (!license) {
      return res.status(404).json({
        success: false,
        message: '许可证不存在'
      });
    }
    
    license.isActive = false;
    license.revokedAt = new Date().toISOString();
    
    res.json({
      success: true,
      message: '许可证已撤销'
    });
  } catch (error) {
    console.error('撤销许可证失败:', error);
    res.status(500).json({
      success: false,
      message: '撤销许可证失败'
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`订阅API服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log('\n可用的API接口:');
  console.log('- POST /api/auth/send-verification - 发送邮箱验证码');
  console.log('- POST /api/auth/register - 用户注册');
  console.log('- POST /api/auth/login - 用户登录');
  console.log('- POST /api/auth/verify-token - 验证Token');
  console.log('- POST /api/admin/login - 管理员登录');
  console.log('- POST /api/admin/verify - 验证管理员Token');
  console.log('- GET /api/admin/licenses - 获取许可证列表');
  console.log('- GET /api/admin/stats - 获取系统统计数据');
  console.log('- GET /api/admin/users - 获取用户列表');
  console.log('- GET /api/admin/orders - 获取订单列表');
  console.log('- GET /api/plans - 获取订阅计划');
  console.log('- POST /api/orders - 创建订单');
  console.log('- GET /api/orders/:orderId - 查询订单状态');
  console.log('- POST /api/license/validate - 验证许可证');
  console.log('- GET /api/subscription/:licenseKey - 获取用户订阅状态');
});

module.exports = app;