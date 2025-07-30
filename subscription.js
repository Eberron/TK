// 订阅计划配置
const SUBSCRIPTION_PLANS = {
  free: {
    name: '免费版',
    price: 0,
    period: '永久免费',
    features: ['每日50次使用限制', '基础文本总结', '图片分析功能', '表格解析功能']
  },
  monthly: {
    name: '专业版月付',
    price: 19,
    period: '每月',
    features: ['无限次使用', '高级AI模型', '优先处理速度', '批量处理功能', '导出功能', '7x24客服支持']
  },
  yearly: {
    name: '专业版年付',
    price: 199,
    period: '每年',
    features: ['无限次使用', '高级AI模型', '优先处理速度', '批量处理功能', '导出功能', '7x24客服支持', '额外功能预览']
  },
  lifetime: {
    name: '终身会员',
    price: 599,
    period: '一次付费，终身使用',
    features: ['所有专业版功能', '终身免费更新', '独家新功能抢先体验', '专属客服通道', '定制化功能']
  }
};

// 支付方式配置
const PAYMENT_METHODS = {
  alipay: { name: '支付宝', icon: '💰' },
  wechat: { name: '微信支付', icon: '💚' },
  card: { name: '银行卡', icon: '💳' }
};

let currentSelectedPlan = null;
let currentSelectedPayment = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentSubscription();
  bindEvents();
});

// 绑定事件
function bindEvents() {
  document.getElementById('activateLicense').addEventListener('click', handleLicenseActivation);
  document.getElementById('proceedPayment').addEventListener('click', handlePayment);
  
  // 点击模态框外部关闭
  document.getElementById('paymentModal').addEventListener('click', (e) => {
    if (e.target.id === 'paymentModal') {
      closePaymentModal();
    }
  });
}

// 加载当前订阅状态
async function loadCurrentSubscription() {
  try {
    const { 
      isPro = false, 
      subscriptionPlan = 'free', 
      subscriptionExpiry = null,
      usageCount = 0 
    } = await chrome.storage.local.get(['isPro', 'subscriptionPlan', 'subscriptionExpiry', 'usageCount']);
    
    if (isPro && subscriptionPlan !== 'free') {
      showCurrentPlan(subscriptionPlan, subscriptionExpiry);
      updatePlanButtons(subscriptionPlan);
    } else {
      showUsageInfo(usageCount);
    }
  } catch (error) {
    console.error('加载订阅状态失败:', error);
  }
}

// 显示当前订阅计划
function showCurrentPlan(planType, expiry) {
  const currentPlanDiv = document.getElementById('currentPlan');
  const planDetailsDiv = document.getElementById('planDetails');
  const plan = SUBSCRIPTION_PLANS[planType];
  
  if (plan) {
    let expiryText = '';
    if (expiry && planType !== 'lifetime') {
      const expiryDate = new Date(expiry);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        expiryText = `<p style="color: #059669;">有效期至: ${expiryDate.toLocaleDateString()} (剩余${daysLeft}天)</p>`;
      } else {
        expiryText = `<p style="color: #dc2626;">已过期，请续费</p>`;
      }
    } else if (planType === 'lifetime') {
      expiryText = `<p style="color: #059669;">终身有效</p>`;
    }
    
    // 安全地创建计划详情
    planDetailsDiv.innerHTML = '';
    
    const planNameP = document.createElement('p');
    const strongEl = document.createElement('strong');
    strongEl.textContent = plan.name;
    planNameP.appendChild(strongEl);
    planNameP.appendChild(document.createTextNode(` - ¥${plan.price} ${plan.period}`));
    planDetailsDiv.appendChild(planNameP);
    
    if (expiryText) {
      const expiryDiv = document.createElement('div');
      expiryDiv.innerHTML = expiryText;
      planDetailsDiv.appendChild(expiryDiv);
    }
    
    const featureP = document.createElement('p');
    featureP.style.cssText = 'color: #64748b; font-size: 14px;';
    featureP.textContent = '享受无限次使用和所有高级功能';
    planDetailsDiv.appendChild(featureP);
    
    currentPlanDiv.style.display = 'block';
  }
}

// 显示使用情况
function showUsageInfo(usageCount) {
  const remaining = Math.max(0, 50 - usageCount);
  const currentPlanDiv = document.getElementById('currentPlan');
  const planDetailsDiv = document.getElementById('planDetails');
  
  // 安全地创建使用情况信息
  planDetailsDiv.innerHTML = '';
  
  const freeVersionP = document.createElement('p');
  const strongEl = document.createElement('strong');
  strongEl.textContent = '免费版';
  freeVersionP.appendChild(strongEl);
  planDetailsDiv.appendChild(freeVersionP);
  
  const remainingP = document.createElement('p');
  remainingP.style.color = remaining > 10 ? '#059669' : '#dc2626';
  remainingP.textContent = `今日剩余使用次数: ${remaining}/50`;
  planDetailsDiv.appendChild(remainingP);
  
  const upgradeP = document.createElement('p');
  upgradeP.style.cssText = 'color: #64748b; font-size: 14px;';
  upgradeP.textContent = '升级专业版享受无限使用';
  planDetailsDiv.appendChild(upgradeP);
  
  currentPlanDiv.style.display = 'block';
}

// 更新计划按钮状态
function updatePlanButtons(currentPlan) {
  const buttons = document.querySelectorAll('.subscribe-btn');
  buttons.forEach((btn, index) => {
    const plans = ['free', 'monthly', 'yearly', 'lifetime'];
    if (plans[index] === currentPlan) {
      btn.textContent = '当前计划';
      btn.disabled = true;
      btn.className = 'subscribe-btn secondary';
    }
  });
}

// 打开支付模态框
function openPaymentModal(planType) {
  currentSelectedPlan = planType;
  const plan = SUBSCRIPTION_PLANS[planType];
  
  // 安全地创建选中计划信息
  const selectedPlanDiv = document.getElementById('selectedPlan');
  selectedPlanDiv.innerHTML = '';
  
  const planContainer = document.createElement('div');
  planContainer.style.cssText = 'background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;';
  
  const h3 = document.createElement('h3');
  h3.style.cssText = 'margin: 0 0 8px 0;';
  h3.textContent = plan.name;
  planContainer.appendChild(h3);
  
  const priceP = document.createElement('p');
  priceP.style.cssText = 'margin: 0; color: #3b82f6; font-size: 18px; font-weight: 600;';
  priceP.textContent = `¥${plan.price} ${plan.period}`;
  planContainer.appendChild(priceP);
  
  selectedPlanDiv.appendChild(planContainer);
  
  // 重置支付方式选择
  document.querySelectorAll('.payment-method').forEach(method => {
    method.classList.remove('selected');
  });
  currentSelectedPayment = null;
  document.getElementById('proceedPayment').disabled = true;
  
  document.getElementById('paymentModal').style.display = 'block';
}

// 关闭支付模态框
function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  currentSelectedPlan = null;
  currentSelectedPayment = null;
}

// 选择支付方式
function selectPaymentMethod(method) {
  // 移除之前的选择
  document.querySelectorAll('.payment-method').forEach(el => {
    el.classList.remove('selected');
  });
  
  // 选择当前方式
  event.target.closest('.payment-method').classList.add('selected');
  currentSelectedPayment = method;
  
  // 启用支付按钮
  document.getElementById('proceedPayment').disabled = false;
}

// 处理支付
async function handlePayment() {
  if (!currentSelectedPlan || !currentSelectedPayment) {
    showToast('请选择支付方式');
    return;
  }
  
  try {
    showToast('正在跳转到支付页面...');
    
    // 生成订单ID
    const orderId = generateOrderId();
    const plan = SUBSCRIPTION_PLANS[currentSelectedPlan];
    
    // 构建支付URL
    const paymentUrl = buildPaymentUrl({
      orderId,
      planType: currentSelectedPlan,
      amount: plan.price,
      paymentMethod: currentSelectedPayment,
      planName: plan.name
    });
    
    // 保存订单信息到本地存储
    await chrome.storage.local.set({
      pendingOrder: {
        orderId,
        planType: currentSelectedPlan,
        amount: plan.price,
        paymentMethod: currentSelectedPayment,
        timestamp: Date.now()
      }
    });
    
    // 打开支付页面
    chrome.tabs.create({ url: paymentUrl });
    
    // 关闭模态框
    closePaymentModal();
    
    // 开始轮询支付状态
    startPaymentStatusPolling(orderId);
    
  } catch (error) {
    console.error('支付处理失败:', error);
    showToast('支付处理失败，请重试');
  }
}

// 生成订单ID
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `TK_${timestamp}_${random}`;
}

// 构建支付URL
function buildPaymentUrl(orderInfo) {
  // 这里应该是实际的支付服务URL
  // 示例使用模拟支付页面
  const baseUrl = 'https://payment.example.com/pay';
  const params = new URLSearchParams({
    order_id: orderInfo.orderId,
    amount: orderInfo.amount,
    product_name: `智能页面总结助手 - ${orderInfo.planName}`,
    payment_method: orderInfo.paymentMethod,
    return_url: chrome.runtime.getURL('payment-success.html'),
    cancel_url: chrome.runtime.getURL('subscription.html')
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// 开始轮询支付状态
function startPaymentStatusPolling(orderId) {
  const pollInterval = setInterval(async () => {
    try {
      const paymentStatus = await checkPaymentStatus(orderId);
      
      if (paymentStatus.status === 'success') {
        clearInterval(pollInterval);
        await handlePaymentSuccess(paymentStatus);
      } else if (paymentStatus.status === 'failed') {
        clearInterval(pollInterval);
        showToast('支付失败，请重试');
      }
      // 继续轮询如果状态是 'pending'
    } catch (error) {
      console.error('检查支付状态失败:', error);
    }
  }, 3000); // 每3秒检查一次
  
  // 10分钟后停止轮询
  setTimeout(() => {
    clearInterval(pollInterval);
  }, 600000);
}

// 检查支付状态
async function checkPaymentStatus(orderId) {
  // 这里应该调用实际的支付状态查询API
  // 示例返回模拟状态
  const response = await fetch(`http://localhost:3000/api/orders/${orderId}`);
  if (response.ok) {
    return await response.json();
  }
  
  // 实际支付状态查询逻辑应在此处实现
  return { status: 'pending' };
}

// 处理支付成功
async function handlePaymentSuccess(paymentInfo) {
  try {
    const { pendingOrder } = await chrome.storage.local.get('pendingOrder');
    
    if (pendingOrder) {
      // 计算订阅到期时间
      let expiryDate = null;
      if (pendingOrder.planType === 'monthly') {
        expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天
      } else if (pendingOrder.planType === 'yearly') {
        expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365天
      }
      // lifetime 不设置到期时间
      
      // 更新订阅状态
      await chrome.storage.local.set({
        isPro: true,
        subscriptionPlan: pendingOrder.planType,
        subscriptionExpiry: expiryDate ? expiryDate.getTime() : null,
        usageCount: 0 // 重置使用次数
      });
      
      // 清除待处理订单
      await chrome.storage.local.remove('pendingOrder');
      
      showToast('🎉 订阅成功！专业版功能已激活');
      
      // 刷新页面显示
      setTimeout(() => {
        location.reload();
      }, 2000);
    }
  } catch (error) {
    console.error('处理支付成功失败:', error);
    showToast('订阅激活失败，请联系客服');
  }
}

// 处理许可证激活
async function handleLicenseActivation() {
  const licenseKey = document.getElementById('licenseKey').value.trim();
  if (!licenseKey) {
    showToast('请输入许可证密钥');
    return;
  }
  
  try {
    showToast('正在验证许可证...');
    
    const isValid = await validateLicenseKey(licenseKey);
    
    if (isValid.success) {
      // 获取当前用户信息
      let userInfo = {};
      if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['userInfo']);
          userInfo = result.userInfo || {};
      } else {
          userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      }
      
      // 使用更安全的存储方式保存订阅信息
      const updatedUserInfo = {
          ...userInfo,
          subscription: {
              planType: isValid.planType || 'lifetime',
              status: 'active',
              expiryDate: isValid.expiry ? new Date(isValid.expiry).toISOString() : null,
              licenseKey: licenseKey
          }
      };
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.set({ userInfo: updatedUserInfo });
      } else {
          localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      }
      
      await chrome.storage.local.set({
        isPro: true,
        subscriptionPlan: isValid.planType || 'lifetime',
        subscriptionExpiry: isValid.expiry || null,
        licenseKey: licenseKey
      });
      
      showToast('🎉 许可证激活成功！');
      
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      showToast('❌ 无效的许可证密钥');
    }
  } catch (error) {
    console.error('许可证验证失败:', error);
    showToast('⚠️ 验证失败，请重试');
  }
}

// 验证许可证密钥
async function validateLicenseKey(licenseKey) {
  try {
    // 使用更安全的存储方式获取用户信息
    let userInfo = {};
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['userInfo']);
        userInfo = result.userInfo || {};
    } else {
        userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    }
    
    // 这里应该调用实际的许可证验证API
    const response = await fetch('http://localhost:3000/api/license/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ licenseKey })
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // 移除模拟验证逻辑以提高安全性
    
    return { success: false };
  } catch (error) {
    console.error('许可证验证请求失败:', error);
    return { success: false };
  }
}

// 显示提示消息
function showToast(message, duration = 3000) {
  // 移除现有的toast
  const existingToast = document.querySelector('.toast-message');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f2937;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);