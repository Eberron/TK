# 🔒 TK插件安全配置指南

## 重要提醒

⚠️ **在部署到生产环境前，请务必完成以下安全配置！**

## 1. 修改默认管理员密码

### 方法一：修改 config.js 文件
```javascript
// 在 config.js 中修改
ADMIN: {
  DEFAULT_USERNAME: 'admin',
  DEFAULT_PASSWORD: 'your_secure_password_123!' // 请设置强密码
}
```

### 方法二：使用环境变量（推荐）
在服务器目录创建 `.env` 文件：
```env
ADMIN_PASSWORD=your_secure_password_123!
JWT_SECRET=your_jwt_secret_key_here
```

## 2. 强密码要求

管理员密码必须满足以下条件：
- 至少8位长度
- 包含大写字母
- 包含小写字母  
- 包含数字
- 包含特殊字符

## 3. API密钥配置

### DeepSeek API密钥
- 用户需要自行申请 DeepSeek API 密钥
- 密钥仅保存在用户本地浏览器中
- 插件不会收集或存储用户的API密钥

### 获取DeepSeek API密钥步骤：
1. 访问 https://platform.deepseek.com
2. 注册并登录账号
3. 进入 "API Keys" 页面
4. 创建新的API密钥
5. 在插件设置中配置密钥

## 4. 服务器安全配置

### 环境变量配置
创建 `server/.env` 文件：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 管理员配置
ADMIN_PASSWORD=your_secure_password_123!
JWT_SECRET=your_super_secret_jwt_key_here

# CORS配置
ALLOWED_ORIGINS=https://your-domain.com,chrome-extension://your-extension-id

# API限流配置
API_RATE_LIMIT=100
STRICT_RATE_LIMIT=10
```

### 安全检查清单

- [ ] 修改默认管理员密码
- [ ] 设置强JWT密钥
- [ ] 配置CORS白名单
- [ ] 启用HTTPS
- [ ] 配置防火墙
- [ ] 设置API限流
- [ ] 定期更新依赖

## 5. 部署前检查

运行安全检查脚本：
```bash
cd server
./deploy-secure.sh
```

## 6. 生产环境建议

### 使用反向代理
```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 防火墙配置
```bash
# 只允许必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # 不直接暴露API端口
```

## 7. 监控和日志

- 启用访问日志记录
- 监控异常登录尝试
- 定期检查安全更新
- 备份重要数据

## 8. 应急响应

如发现安全问题：
1. 立即修改所有密码
2. 撤销可疑的API密钥
3. 检查访问日志
4. 更新到最新版本

---

📚 **更多安全信息请查看：**
- [SECURITY.md](server/SECURITY.md) - 详细安全指南
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
- [SECURITY_FIXES.md](SECURITY_FIXES.md) - 安全修复记录