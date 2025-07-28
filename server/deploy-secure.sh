#!/bin/bash
# TK插件API安全部署脚本

echo "🔒 TK插件API安全部署脚本"
echo "================================"

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js版本: $node_version"
else
    echo "❌ 未安装Node.js，请先安装Node.js v16+"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装完成"

# 创建环境变量文件
echo "⚙️  配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 已创建.env文件，请编辑以下配置："
    echo "   - ADMIN_PASSWORD: 设置安全的管理员密码"
    echo "   - ALLOWED_ORIGINS: 设置允许的域名"
    echo "   - JWT_SECRET: 设置JWT密钥"
    echo ""
    echo "⚠️  请立即编辑.env文件并设置安全配置！"
    echo "   nano .env"
else
    echo "✅ .env文件已存在"
fi

# 安全检查
echo "🔍 执行安全检查..."
security_issues=0

# 检查管理员密码
if grep -q "ADMIN_PASSWORD=your_secure_admin_password_here" .env 2>/dev/null; then
    echo "❌ 管理员密码仍为默认值，请修改！"
    security_issues=$((security_issues + 1))
fi

# 检查JWT密钥
if grep -q "JWT_SECRET=your_jwt_secret_key_here" .env 2>/dev/null; then
    echo "❌ JWT密钥仍为默认值，请修改！"
    security_issues=$((security_issues + 1))
fi

# 检查CORS配置
if grep -q "ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com" .env 2>/dev/null; then
    echo "⚠️  CORS配置仍为示例值，建议修改为实际域名"
fi

if [ $security_issues -gt 0 ]; then
    echo ""
    echo "❌ 发现 $security_issues 个安全问题，请修复后再启动服务器"
    echo "   编辑命令: nano .env"
    exit 1
fi

echo "✅ 安全检查通过"

# 创建启动脚本
echo "📝 创建启动脚本..."
cat > start-secure.sh << 'EOF'
#!/bin/bash
# 安全启动脚本

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 设置生产环境
export NODE_ENV=production

# 启动服务器
echo "🚀 启动TK插件API服务器..."
echo "📍 端口: ${PORT:-3000}"
echo "🔒 安全模式: 已启用"
echo "⏰ $(date)"
echo ""

node subscription-api.js
EOF

chmod +x start-secure.sh
echo "✅ 启动脚本已创建: start-secure.sh"

# 创建系统服务文件（可选）
echo "📋 创建系统服务配置..."
cat > tk-api.service << EOF
[Unit]
Description=TK Plugin API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
EnvironmentFile=$(pwd)/.env
ExecStart=/usr/bin/node subscription-api.js
Restart=always
RestartSec=10

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(pwd)

[Install]
WantedBy=multi-user.target
EOF

echo "✅ 系统服务配置已创建: tk-api.service"
echo "   安装命令: sudo cp tk-api.service /etc/systemd/system/"
echo "   启用命令: sudo systemctl enable tk-api"
echo "   启动命令: sudo systemctl start tk-api"

echo ""
echo "🎉 安全部署配置完成！"
echo "================================"
echo "📖 下一步操作："
echo "1. 编辑.env文件设置安全配置: nano .env"
echo "2. 启动服务器: ./start-secure.sh"
echo "3. 配置反向代理和SSL证书"
echo "4. 设置防火墙规则"
echo "5. 定期检查安全更新"
echo ""
echo "📚 详细安全指南请查看: SECURITY.md"
echo "🔧 部署检查清单请查看: ../DEPLOYMENT_CHECKLIST.md"