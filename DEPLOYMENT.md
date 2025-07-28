# 智能页面总结插件 - 部署指南

本指南将帮助您完整部署智能页面总结插件的订阅和付费系统。

## 系统架构

```
智能页面总结插件订阅系统
├── Chrome插件前端
│   ├── popup.html/js - 主界面
│   ├── register.html/js - 用户注册
│   ├── login.html/js - 用户登录
│   ├── subscription.html/js - 订阅管理
│   └── payment-success.html - 支付成功页
├── API服务器 (Node.js + Express)
│   ├── 用户认证系统
│   │   ├── 邮箱验证码
│   │   ├── 用户注册
│   │   ├── 用户登录
│   │   └── Token验证
│   ├── 订阅计划管理
│   ├── 订单处理
│   ├── 许可证验证
│   └── 支付回调处理
├── 数据库 (MongoDB)
│   ├── 用户信息
│   ├── 验证码记录
│   ├── 用户Token
│   ├── 订单记录
│   └── 许可证数据
├── 邮件服务
│   └── 验证码发送
└── 支付网关
    ├── 支付宝
    └── 微信支付
```

## 部署步骤

### 1. 准备环境

#### 系统要求
- Node.js 14.0+ 
- npm 或 yarn
- 数据库（MongoDB/PostgreSQL/MySQL）
- SSL证书（生产环境必需）

#### 服务器要求
- CPU: 1核心以上
- 内存: 512MB以上
- 存储: 10GB以上
- 带宽: 1Mbps以上

### 2. 部署API服务器

#### 2.1 克隆项目
```bash
git clone <your-repo-url>
cd TK/server
```

#### 2.2 安装依赖
```bash
npm install
```

#### 2.3 配置环境变量
创建 `.env` 文件：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DB_TYPE=mongodb
DB_CONNECTION_STRING=mongodb://localhost:27017/tk_subscription

# JWT密钥
JWT_SECRET=your_super_secret_jwt_key_here

# 邮件服务配置（用于发送验证码和许可证）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=智能页面总结 <your_email@gmail.com>

# 支付配置
# 支付宝
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_alipay_private_key
ALIPAY_PUBLIC_KEY=alipay_public_key

# 微信支付
WECHAT_APP_ID=your_wechat_app_id
WECHAT_MCH_ID=your_merchant_id
WECHAT_API_KEY=your_api_key
WECHAT_CERT_PATH=/path/to/cert.pem
WECHAT_KEY_PATH=/path/to/key.pem

# 安全配置
PASSWORD_SALT=your_password_salt
API_SECRET=your_api_secret_key

# 其他配置
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://api.your-domain.com
```

#### 2.4 启动服务器
```bash
# 开发环境
npm run dev

# 生产环境
npm start

# 使用PM2（推荐）
npm install -g pm2
pm2 start subscription-api.js --name "tk-api"
```

### 3. 配置数据库

#### 3.1 MongoDB 配置
```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

#### 3.2 数据库模型
```javascript
// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  licenseKey: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  planType: {
    type: String,
    enum: ['free', 'monthly', 'yearly', 'lifetime'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  orderId: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['alipay', 'wechat', 'card']
  },
  amount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
```

### 4. 邮件服务集成

#### 4.1 安装邮件依赖

```bash
npm install nodemailer
```

#### 4.2 邮件服务配置

```javascript
// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 发送验证码邮件
async function sendVerificationCode(email, code) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: '智能页面总结 - 邮箱验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>邮箱验证码</h2>
        <p>您的验证码是：<strong style="font-size: 24px; color: #007cff;">${code}</strong></p>
        <p>验证码有效期为10分钟，请及时使用。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationCode };
```

#### 4.3 Gmail 配置说明

1. 启用两步验证
2. 生成应用专用密码
3. 在环境变量中使用应用密码

### 5. 配置支付网关

#### 5.1 支付宝配置
```javascript
// services/alipay.js
const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;

class AlipayService {
  constructor() {
    this.alipaySdk = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
      gateway: 'https://openapi.alipay.com/gateway.do',
      timeout: 5000,
      camelCase: true
    });
  }

  async createOrder(orderData) {
    const formData = new AlipayFormData();
    formData.setMethod('get');
    formData.addField('returnUrl', `${process.env.FRONTEND_URL}/payment-success`);
    formData.addField('bizContent', {
      outTradeNo: orderData.orderId,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount: orderData.amount,
      subject: orderData.subject,
      body: orderData.description
    });

    const result = await this.alipaySdk.exec(
      'alipay.trade.page.pay',
      {},
      { formData }
    );

    return result;
  }

  verifyCallback(params) {
    return this.alipaySdk.checkNotifySign(params);
  }
}

module.exports = AlipayService;
```

#### 4.2 微信支付配置
```javascript
// services/wechat.js
const WechatPay = require('wechatpay-node-v3');
const fs = require('fs');

class WechatPayService {
  constructor() {
    this.pay = new WechatPay({
      appid: process.env.WECHAT_APP_ID,
      mchid: process.env.WECHAT_MCH_ID,
      publicKey: fs.readFileSync(process.env.WECHAT_CERT_PATH),
      privateKey: fs.readFileSync(process.env.WECHAT_KEY_PATH)
    });
  }

  async createOrder(orderData) {
    const params = {
      description: orderData.subject,
      out_trade_no: orderData.orderId,
      amount: {
        total: Math.round(orderData.amount * 100) // 转换为分
      },
      notify_url: `${process.env.API_BASE_URL}/api/payment/wechat/notify`
    };

    const result = await this.pay.transactions_native(params);
    return result;
  }

  verifyCallback(signature, body) {
    return this.pay.verifySign(signature, body);
  }
}

module.exports = WechatPayService;
```

### 5. 配置Web服务器

#### 5.1 Nginx 配置
```nginx
# /etc/nginx/sites-available/tk-api
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
    }

    # API 限流
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... 其他配置
    }
}

# 限流配置
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

#### 5.2 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/tk-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 配置SSL证书

#### 6.1 使用 Let's Encrypt
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. 部署Chrome插件

#### 7.1 更新API端点
在插件代码中更新API基础URL：
```javascript
// popup.js 和 subscription.js 中
const API_BASE_URL = 'https://api.your-domain.com';
```

#### 7.2 打包插件
```bash
# 创建发布版本
zip -r tk-extension-v2.4.zip . -x "server/*" "*.git*" "node_modules/*" "*.md"
```

#### 7.3 发布到Chrome Web Store
1. 访问 [Chrome开发者控制台](https://chrome.google.com/webstore/devconsole/)
2. 上传插件包
3. 填写插件信息
4. 提交审核

### 8. 监控和维护

#### 8.1 日志监控
```bash
# PM2 日志
pm2 logs tk-api

# 系统日志
sudo journalctl -u nginx -f
```

#### 8.2 性能监控
```javascript
// 集成监控工具
const newrelic = require('newrelic');
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'your-sentry-dsn'
});
```

#### 8.3 备份策略
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/tk-subscription"

# 数据库备份
mongodump --uri="$DB_CONNECTION_STRING" --out="$BACKUP_DIR/db_$DATE"

# 代码备份
tar -czf "$BACKUP_DIR/code_$DATE.tar.gz" /path/to/your/app

# 清理旧备份（保留30天）
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 9. 安全检查清单

- [ ] 使用HTTPS加密所有通信
- [ ] 实施API限流和防护
- [ ] 验证所有输入参数
- [ ] 安全存储敏感信息（使用环境变量）
- [ ] 定期更新依赖包
- [ ] 实施日志记录和监控
- [ ] 配置防火墙规则
- [ ] 定期备份数据
- [ ] 实施错误处理和恢复机制

### 10. 故障排除

#### 常见问题

**Q: API服务器无法启动**
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
echo $NODE_ENV

# 查看详细错误
npm start 2>&1 | tee error.log
```

**Q: 支付回调失败**
```bash
# 检查webhook URL是否可访问
curl -X POST https://api.your-domain.com/api/payment/alipay/notify

# 检查SSL证书
openssl s_client -connect api.your-domain.com:443
```

**Q: 数据库连接失败**
```bash
# 测试数据库连接
mongo $DB_CONNECTION_STRING

# 检查防火墙
sudo ufw status
```

## 技术支持

如需技术支持，请联系：
- 邮箱: tech-support@your-domain.com
- 文档: https://docs.your-domain.com
- GitHub Issues: https://github.com/your-repo/issues

---

**注意**: 本指南提供了完整的部署流程，但在生产环境中部署前，请确保充分测试所有功能，并根据实际需求调整配置。