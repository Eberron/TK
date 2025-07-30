// 邮件服务模块
const nodemailer = require('nodemailer');

// 创建邮件传输器
function createTransporter() {
  // 检查环境变量
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('⚠️  邮件服务配置不完整，将使用模拟模式');
    console.warn('请设置环境变量: SMTP_HOST, SMTP_USER, SMTP_PASS');
    return null;
  }
  
  const transporter = nodemailer.createTransporter({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    // 添加调试选项
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  });
  
  return transporter;
}

// 发送验证码邮件
async function sendVerificationCode(email, code) {
  const transporter = createTransporter();
  
  if (!transporter) {
    // 模拟模式：只在控制台输出
    console.log(`📧 [模拟邮件] 验证码发送到 ${email}: ${code}`);
    console.log(`📧 [开发提示] 请在控制台查看验证码，或配置真实邮件服务`);
    return { success: true, mode: 'simulation' };
  }
  
  const mailOptions = {
    from: process.env.SMTP_FROM || `"智能页面总结" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '智能页面总结 - 邮箱验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">智能页面总结</h1>
          <p style="color: #666; margin: 5px 0 0 0;">邮箱验证码</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
          <h2 style="color: #333; margin: 0 0 15px 0;">您的验证码</h2>
          <div style="font-size: 32px; font-weight: bold; color: #007cff; letter-spacing: 5px; margin: 20px 0;">${code}</div>
          <p style="color: #666; margin: 15px 0 0 0;">验证码有效期为 10 分钟</p>
        </div>
        
        <div style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>如果这不是您的操作，请忽略此邮件。</p>
          <p>为了您的账户安全，请勿将验证码告诉他人。</p>
        </div>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>此邮件由系统自动发送，请勿回复。</p>
        </div>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 验证码邮件发送成功: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return { success: true, mode: 'real', messageId: info.messageId };
  } catch (error) {
    console.error('📧 邮件发送失败:', error);
    // 发送失败时降级到模拟模式
    console.log(`📧 [降级模拟] 验证码发送到 ${email}: ${code}`);
    return { success: true, mode: 'fallback', error: error.message };
  }
}

// 发送重置密码邮件
async function sendPasswordResetEmail(email, resetToken) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log(`📧 [模拟邮件] 密码重置链接发送到 ${email}`);
    console.log(`📧 [重置链接] http://localhost:3000/reset-password?token=${resetToken}`);
    return { success: true, mode: 'simulation' };
  }
  
  const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || `"智能页面总结" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '智能页面总结 - 密码重置',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">智能页面总结</h1>
          <p style="color: #666; margin: 5px 0 0 0;">密码重置</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
          <h2 style="color: #333; margin: 0 0 15px 0;">重置您的密码</h2>
          <p style="color: #666; line-height: 1.6; margin: 15px 0;">我们收到了您的密码重置请求。请点击下面的按钮来重置您的密码：</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #007cff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">重置密码</a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin: 20px 0 0 0;">如果按钮无法点击，请复制以下链接到浏览器：</p>
          <p style="color: #007cff; font-size: 14px; word-break: break-all; margin: 5px 0;">${resetUrl}</p>
          
          <p style="color: #e74c3c; font-size: 14px; margin: 20px 0 0 0;">此链接将在 1 小时后失效。</p>
        </div>
        
        <div style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <p>为了您的账户安全，请勿将此链接分享给他人。</p>
        </div>
        
        <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
          <p>此邮件由系统自动发送，请勿回复。</p>
        </div>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 密码重置邮件发送成功: ${email}`);
    return { success: true, mode: 'real', messageId: info.messageId };
  } catch (error) {
    console.error('📧 密码重置邮件发送失败:', error);
    console.log(`📧 [降级模拟] 密码重置链接发送到 ${email}`);
    console.log(`📧 [重置链接] ${resetUrl}`);
    return { success: true, mode: 'fallback', error: error.message };
  }
}

// 测试邮件配置
async function testEmailConfiguration() {
  const transporter = createTransporter();
  
  if (!transporter) {
    return { success: false, message: '邮件配置不完整' };
  }
  
  try {
    await transporter.verify();
    console.log('📧 邮件服务配置验证成功');
    return { success: true, message: '邮件服务配置正常' };
  } catch (error) {
    console.error('📧 邮件服务配置验证失败:', error);
    return { success: false, message: '邮件服务配置错误', error: error.message };
  }
}

module.exports = {
  sendVerificationCode,
  sendPasswordResetEmail,
  testEmailConfiguration
};