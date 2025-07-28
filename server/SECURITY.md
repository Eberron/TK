# TK插件API安全配置指南

## 🔒 安全特性

### 已实施的安全措施

#### 1. **CORS安全配置**
- ✅ 限制允许访问的域名白名单
- ✅ 支持Chrome扩展访问
- ✅ 启用凭据传递控制

#### 2. **API频率限制**
- ✅ 全局API限制：15分钟内最多100次请求
- ✅ 敏感操作限制：15分钟内最多10次请求
- ✅ 自动清理和错误响应

#### 3. **身份验证安全**
- ✅ Token过期机制（用户24小时，管理员12小时）
- ✅ 自动清理过期Token
- ✅ 改进的密码哈希算法（PBKDF2）
- ✅ 密码强度验证

#### 4. **权限控制**
- ✅ 管理员权限验证
- ✅ 用户状态检查
- ✅ Token有效性验证

#### 5. **数据保护**
- ✅ 敏感信息不返回客户端
- ✅ 密码安全存储
- ✅ 环境变量管理敏感配置

## 🚀 部署前安全检查清单

### 必须完成的安全配置

- [ ] **修改默认管理员密码**
  ```bash
  # 设置环境变量
  export ADMIN_PASSWORD="your_secure_password_123!"
  ```

- [ ] **配置CORS白名单**
  ```javascript
  // 在 .env 文件中设置
  ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com
  ```

- [ ] **启用HTTPS**
  - 配置SSL证书
  - 强制HTTPS重定向
  - 设置安全头

- [ ] **配置防火墙**
  ```bash
  # 只允许必要端口
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw deny 3000/tcp  # 不直接暴露API端口
  ```

- [ ] **设置反向代理**
  ```nginx
  # Nginx配置示例
  server {
      listen 443 ssl;
      server_name api.your-domain.com;
      
      # SSL配置
      ssl_certificate /path/to/cert.pem;
      ssl_certificate_key /path/to/key.pem;
      
      # 安全头
      add_header X-Frame-Options DENY;
      add_header X-Content-Type-Options nosniff;
      add_header X-XSS-Protection "1; mode=block";
      add_header Strict-Transport-Security "max-age=31536000";
      
      location /api/ {
          proxy_pass http://localhost:3000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

## ⚠️ 安全注意事项

### 生产环境必须避免的配置

1. **不要使用默认密码**
   - 管理员密码必须修改
   - 使用强密码（至少12位，包含大小写字母、数字、特殊字符）

2. **不要暴露敏感信息**
   - 不在日志中记录密码
   - 不在错误信息中泄露系统信息
   - 不在客户端返回验证码

3. **不要忽略更新**
   - 定期更新依赖包
   - 监控安全漏洞
   - 及时应用安全补丁

### 推荐的额外安全措施

1. **监控和日志**
   ```javascript
   // 添加访问日志
   app.use((req, res, next) => {
     console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
     next();
   });
   ```

2. **IP白名单（可选）**
   ```javascript
   // 管理员接口IP限制
   const adminIpWhitelist = ['192.168.1.100', '10.0.0.50'];
   app.use('/api/admin/', (req, res, next) => {
     if (!adminIpWhitelist.includes(req.ip)) {
       return res.status(403).json({ success: false, message: 'IP不在白名单中' });
     }
     next();
   });
   ```

3. **请求签名验证**
   ```javascript
   // 为重要操作添加签名验证
   function verifySignature(req, res, next) {
     const signature = req.headers['x-signature'];
     const payload = JSON.stringify(req.body);
     const expectedSignature = crypto.createHmac('sha256', process.env.API_SECRET)
       .update(payload).digest('hex');
     
     if (signature !== expectedSignature) {
       return res.status(401).json({ success: false, message: '签名验证失败' });
     }
     next();
   }
   ```

## 🔍 安全测试

### 基本安全测试命令

```bash
# 测试CORS配置
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3000/api/auth/login

# 测试频率限制
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/auth/send-verification \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com"}'
done

# 测试Token过期
curl -X POST http://localhost:3000/api/auth/verify-token \
     -H "Content-Type: application/json" \
     -d '{"token":"invalid_token"}'
```

## 📞 安全事件响应

### 发现安全问题时的处理步骤

1. **立即响应**
   - 记录事件详情
   - 评估影响范围
   - 必要时临时关闭服务

2. **调查分析**
   - 检查访问日志
   - 分析攻击模式
   - 确定受影响数据

3. **修复和恢复**
   - 修复安全漏洞
   - 更新安全配置
   - 重置受影响的凭据

4. **后续改进**
   - 更新安全策略
   - 加强监控措施
   - 进行安全培训

---

**重要提醒**: 安全是一个持续的过程，需要定期审查和更新安全措施。建议每月进行一次安全检查，每季度进行一次全面的安全审计。