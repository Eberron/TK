# TK 智能页面总结插件 - 订阅管理API服务器

这是智能页面总结插件的后端API服务器，用于处理订阅管理、支付验证和许可证管理功能。

## 功能特性

- 🔐 许可证密钥验证
- 💳 订阅计划管理
- 📦 订单处理
- 💰 支付状态跟踪
- 🔄 订阅状态查询

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## API 接口文档

### 获取订阅计划

```http
GET /api/plans
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "free": {
      "name": "免费版",
      "price": 0,
      "duration": null,
      "features": ["每日5次总结"]
    },
    "monthly": {
      "name": "月度专业版",
      "price": 19.9,
      "duration": 30,
      "features": ["无限总结", "图片分析", "表格解析"]
    }
  }
}
```

### 创建订单

```http
POST /api/orders
Content-Type: application/json

{
  "planType": "monthly",
  "paymentMethod": "alipay"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "TK1703123456ABC123",
    "planType": "monthly",
    "paymentMethod": "alipay",
    "amount": 19.9,
    "status": "pending",
    "paymentUrl": "https://payment.example.com/pay/TK1703123456ABC123"
  }
}
```

### 查询订单状态

```http
GET /api/orders/{orderId}
```

### 验证许可证

```http
POST /api/license/validate
Content-Type: application/json

{
  "licenseKey": "TK-PRO-ABC123-DEF456"
}
```

**响应示例：**
```json
{
  "success": true,
  "planType": "monthly",
  "expiry": "2024-02-01T00:00:00.000Z",
  "features": ["无限总结", "图片分析", "表格解析"]
}
```

### 获取订阅状态

```http
GET /api/subscription/{licenseKey}
```

## 部署说明

### 1. 环境变量配置

创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=production
DB_CONNECTION_STRING=your_database_url
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

### 2. 生产环境部署

#### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start subscription-api.js --name "tk-subscription-api"

# 查看状态
pm2 status

# 查看日志
pm2 logs tk-subscription-api
```

#### 使用 Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t tk-subscription-api .

# 运行容器
docker run -p 3000:3000 tk-subscription-api
```

### 3. 反向代理配置（Nginx）

```nginx
server {
    listen 80;
    server_name api.yoursite.com;
    
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
    }
}
```

## 数据库集成

当前版本使用内存存储作为演示。生产环境建议集成以下数据库：

- **MongoDB**: 适合文档存储
- **PostgreSQL**: 适合关系型数据
- **Redis**: 适合缓存和会话管理

### MongoDB 集成示例

```javascript
const mongoose = require('mongoose');

// 订阅模型
const subscriptionSchema = new mongoose.Schema({
  licenseKey: { type: String, unique: true, required: true },
  planType: { type: String, required: true },
  expiry: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
```

## 支付集成

### 支付宝集成

```javascript
const AlipaySdk = require('alipay-sdk').default;

const alipaySdk = new AlipaySdk({
  appId: 'your_app_id',
  privateKey: 'your_private_key',
  alipayPublicKey: 'alipay_public_key'
});
```

### 微信支付集成

```javascript
const WechatPay = require('wechatpay-node-v3');

const pay = new WechatPay({
  appid: 'your_app_id',
  mchid: 'your_mch_id',
  publicKey: 'your_public_key',
  privateKey: 'your_private_key'
});
```

## 安全注意事项

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **API 限流**: 实施请求频率限制
3. **输入验证**: 验证所有输入参数
4. **密钥管理**: 安全存储 API 密钥和证书
5. **日志记录**: 记录关键操作和错误

## 监控和日志

建议集成以下工具：

- **日志**: Winston, Morgan
- **监控**: New Relic, DataDog
- **错误追踪**: Sentry
- **性能分析**: Clinic.js

## 许可证

MIT License - 详见 LICENSE 文件

## 支持

如有问题，请联系：
- 邮箱: support@example.com
- 文档: https://docs.example.com
- GitHub: https://github.com/your-repo/tk-extension