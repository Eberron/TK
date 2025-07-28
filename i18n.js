// 国际化语言配置
const I18N = {
  // 中文（默认）
  'zh-CN': {
    appName: '智能页面总结助手',
    appDescription: '完全免费的智能页面总结工具，不存储用户数据，严格保护隐私',
    
    // 主界面
    app_name: '智能页面总结',
    smartSummary: '智能页面总结',
    free_service: '🎉 完全免费服务',
    freeService: '🎉 完全免费服务',
    privacy_protection: '不存储数据 · 隐私保护',
    privacyProtection: '不存储数据 · 隐私保护',
    include_images: '包含图片分析',
    includeImages: '包含图片分析',
    generate_summary: '生成总结',
    generateSummary: '生成总结',
    generating: '生成中...',
    history: '📚 历史记录',
    historyRecords: '📚 历史记录',
    
    // 用户状态
    remainingUsage: '剩余免费次数：{remaining}/{total}',
    proUser: '专业版用户 · 无限使用',
    guestMode: '游客模式',
    freeVersion: '免费版',
    notLoggedIn: '未登录',
    
    // 认证相关
    loginOrRegister: '🔐 登录或注册',
    loginPrompt: '登录后享受每日10次免费智能总结',
    login: '登录',
    register: '注册',
    guestModeBtn: '游客模式（每日3次）',
    
    // 专业版提示
    upgrade_pro_unlimited: '🎉 升级专业版解锁无限使用！',
    upgradePrompt: '🎉 升级专业版解锁无限使用！',
    manage_subscription: '管理订阅',
    manageSubscription: '管理订阅',
    upgrade_now: '立即升级',
    upgradeNow: '立即升级',
    enter_license_key: '输入许可证密钥',
    licenseKeyPlaceholder: '输入许可证密钥',
    activate: '激活',
    
    // 历史记录
    historyTitle: '📚 历史记录',
    export: '导出',
    clear: '清空',
    close: '关闭',
    originalText: '原文：',
    summary: '总结：',
    copySummary: '复制总结',
    delete: '删除',
    withImages: '📷 含图片',
    textOnly: '📝 纯文本',
    
    // 消息提示
    loginFirst: '请先登录或选择游客模式',
    guestLimitReached: '游客模式次数已用完，请注册账号获得每日10次免费总结',
    dailyLimitReached: '今日免费次数已用完，请升级到专业版或明日再试',
    summaryComplete: '总结完成！',
    guestRemaining: '总结完成！游客模式还剩{remaining}次',
    dailyRemaining: '总结完成！今日还剩{remaining}次',
    cannotSummarizeThisPage: '无法在此页面使用总结功能',
    noHistory: '暂无历史记录',
    historyCleared: '历史记录已清空',
    historyExported: '历史记录已导出',
    copiedToClipboard: '已复制到剪贴板',
    copyFailed: '复制失败',
    recordDeleted: '记录已删除',
    deleteFailed: '删除失败',
    exportFailed: '导出失败',
    confirmClearHistory: '确定要清空所有历史记录吗？',
    
    // 快捷键
    quickSummarize: '快速总结当前页面',
    toggleImageAnalysis: '切换图片分析模式',
    
    // 右键菜单
    contextMenuSummarize: '智能总结此页面',
    contextMenuSummarizeWithImages: '智能总结（包含图片分析）',
    contextMenuSummarizeSelection: '总结选中文本',
    
    // 通知
    summaryFailed: '总结失败',
    cannotSummarizeRetry: '无法总结当前页面，请稍后重试',
    textTooShort: '文本太短',
    selectMoreText: '请选择更多文本进行总结',
    imageAnalysisEnabled: '已启用图片分析',
    imageAnalysisDisabled: '已禁用图片分析',
    imageAnalysisMode: '图片分析模式',
    
    // 隐私提示
    privacyPromise: '隐私保护承诺',
    privacyContent: 'TK智能总结插件承诺：',
    privacyPoints: [
      '✅ 完全免费使用',
      '✅ 不存储用户数据',
      '✅ 仅对页面内容总结',
      '✅ 严格保护隐私'
    ],
    viewDetails: '查看详情',
    iKnow: '我知道了',
    
    // 游客升级提示
    guestUpgradePrompt: '🎯 游客模式次数即将用完',
    registerPrompt: '注册账号立即获得每日10次免费总结！',
    registerNow: '立即注册',
    alreadyHaveAccount: '已有账号',
    
    // 页脚
    privacy_policy: '隐私政策',
    privacyPolicy: '隐私政策',
    apiSettings: 'API',
    
    // 错误信息
    error: '⚠️ 错误：{message}',
    apiRequestFailed: 'API请求失败: {status} - {message}',
    unknownError: '未知错误'
  },
  
  // 英文
  'en': {
    appName: 'Smart Page Summarizer',
    appDescription: 'Completely free intelligent page summarization tool that does not store user data and strictly protects privacy',
    
    // Main interface
    app_name: 'Smart Page Summary',
    smartSummary: 'Smart Page Summary',
    free_service: '🎉 Completely Free Service',
    freeService: '🎉 Completely Free Service',
    privacy_protection: 'No Data Storage · Privacy Protected',
    privacyProtection: 'No Data Storage · Privacy Protected',
    include_images: 'Include Image Analysis',
    includeImages: 'Include Image Analysis',
    generate_summary: 'Generate Summary',
    generateSummary: 'Generate Summary',
    generating: 'Generating...',
    history: '📚 History',
    historyRecords: '📚 History',
    
    // User status
    remainingUsage: 'Remaining free uses: {remaining}/{total}',
    proUser: 'Pro User · Unlimited',
    guestMode: 'Guest Mode',
    freeVersion: 'Free Version',
    notLoggedIn: 'Not Logged In',
    
    // Authentication
    loginOrRegister: '🔐 Login or Register',
    loginPrompt: 'Login to enjoy 10 free smart summaries daily',
    login: 'Login',
    register: 'Register',
    guestModeBtn: 'Guest Mode (3 times daily)',
    
    // Pro upgrade
    upgrade_pro_unlimited: '🎉 Upgrade to Pro for unlimited usage!',
    upgradePrompt: '🎉 Upgrade to Pro for unlimited usage!',
    manage_subscription: 'Manage Subscription',
    manageSubscription: 'Manage Subscription',
    upgrade_now: 'Upgrade Now',
    upgradeNow: 'Upgrade Now',
    enter_license_key: 'Enter license key',
    licenseKeyPlaceholder: 'Enter license key',
    activate: 'Activate',
    
    // History
    historyTitle: '📚 History Records',
    export: 'Export',
    clear: 'Clear',
    close: 'Close',
    originalText: 'Original:',
    summary: 'Summary:',
    copySummary: 'Copy Summary',
    delete: 'Delete',
    withImages: '📷 With Images',
    textOnly: '📝 Text Only',
    
    // Messages
    loginFirst: 'Please login first or choose guest mode',
    guestLimitReached: 'Guest mode limit reached, please register for 10 free daily summaries',
    dailyLimitReached: 'Daily free limit reached, please upgrade to Pro or try again tomorrow',
    summaryComplete: 'Summary completed!',
    guestRemaining: 'Summary completed! {remaining} uses left in guest mode',
    dailyRemaining: 'Summary completed! {remaining} uses left today',
    cannotSummarizeThisPage: 'Cannot summarize this page',
    noHistory: 'No history records',
    historyCleared: 'History cleared',
    historyExported: 'History exported',
    copiedToClipboard: 'Copied to clipboard',
    copyFailed: 'Copy failed',
    recordDeleted: 'Record deleted',
    deleteFailed: 'Delete failed',
    exportFailed: 'Export failed',
    confirmClearHistory: 'Are you sure you want to clear all history records?',
    
    // Shortcuts
    quickSummarize: 'Quick summarize current page',
    toggleImageAnalysis: 'Toggle image analysis mode',
    
    // Context menu
    contextMenuSummarize: 'Smart summarize this page',
    contextMenuSummarizeWithImages: 'Smart summarize (with image analysis)',
    contextMenuSummarizeSelection: 'Summarize selected text',
    
    // Notifications
    summaryFailed: 'Summary failed',
    cannotSummarizeRetry: 'Cannot summarize current page, please try again later',
    textTooShort: 'Text too short',
    selectMoreText: 'Please select more text to summarize',
    imageAnalysisEnabled: 'Image analysis enabled',
    imageAnalysisDisabled: 'Image analysis disabled',
    imageAnalysisMode: 'Image Analysis Mode',
    
    // Privacy notice
    privacyPromise: 'Privacy Protection Promise',
    privacyContent: 'TK Smart Summarizer promises:',
    privacyPoints: [
      '✅ Completely free to use',
      '✅ No user data storage',
      '✅ Only summarizes page content',
      '✅ Strict privacy protection'
    ],
    viewDetails: 'View Details',
    iKnow: 'I Know',
    
    // Guest upgrade
    guestUpgradePrompt: '🎯 Guest mode uses almost exhausted',
    registerPrompt: 'Register now to get 10 free daily summaries!',
    registerNow: 'Register Now',
    alreadyHaveAccount: 'Already Have Account',
    
    // Footer
    privacy_policy: 'Privacy Policy',
    privacyPolicy: 'Privacy Policy',
    apiSettings: 'API',
    
    // Errors
    error: '⚠️ Error: {message}',
    apiRequestFailed: 'API request failed: {status} - {message}',
    unknownError: 'Unknown error'
  }
};

// 当前语言
let currentLanguage = 'zh-CN';

// 获取浏览器语言
function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  if (lang.startsWith('zh')) {
    return 'zh-CN';
  } else if (lang.startsWith('en')) {
    return 'en';
  }
  return 'zh-CN'; // 默认中文
}

// 初始化语言
async function initLanguage() {
  try {
    // 从存储中获取用户设置的语言
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const { userLanguage } = await chrome.storage.local.get('userLanguage');
      if (userLanguage && I18N[userLanguage]) {
        currentLanguage = userLanguage;
        return;
      }
    }
    
    // 使用浏览器语言
    currentLanguage = getBrowserLanguage();
  } catch (error) {
    console.error('初始化语言失败:', error);
    currentLanguage = 'zh-CN';
  }
}

// 获取翻译文本
function t(key, params = {}) {
  const translations = I18N[currentLanguage] || I18N['zh-CN'];
  let text = translations[key] || key;
  
  // 替换参数
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });
  
  return text;
}

// 设置语言
async function setLanguage(lang) {
  if (I18N[lang]) {
    currentLanguage = lang;
    
    // 保存到存储
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ userLanguage: lang });
      }
    } catch (error) {
      console.error('保存语言设置失败:', error);
    }
    
    // 更新界面
    updateUILanguage();
  }
}

// 更新界面语言
function updateUILanguage() {
  // 更新页面标题
  document.title = t('appName');
  
  // 更新所有带有data-i18n属性的元素
  const elementsWithI18n = document.querySelectorAll('[data-i18n]');
  elementsWithI18n.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });
  
  // 更新所有带有data-i18n-placeholder属性的元素
  const elementsWithPlaceholder = document.querySelectorAll('[data-i18n-placeholder]');
  elementsWithPlaceholder.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      element.placeholder = t(key);
    }
  });
}

// 获取支持的语言列表
function getSupportedLanguages() {
  return Object.keys(I18N).map(code => ({
    code,
    name: code === 'zh-CN' ? '中文' : 'English'
  }));
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, setLanguage, initLanguage, updateUILanguage, getSupportedLanguages };
}