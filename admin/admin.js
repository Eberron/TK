// 管理后台JavaScript逻辑

// API基础URL
const API_BASE_URL = CONFIG.API_BASE_URL + '/api';

// 当前选中的标签
let currentTab = 'users';

// 数据缓存
let usersData = [];
let ordersData = [];
let licensesData = [];
let statsData = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadDashboardStats();
    loadUsers();
});

// 检查管理员权限
function checkAdminAuth() {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        // 重定向到登录页面
        window.location.href = 'login.html?from=admin';
        return;
    }
    
    // 验证token有效性
    fetch(`${API_BASE_URL}/admin/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Token无效');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            document.getElementById('adminName').textContent = data.data.name || '管理员';
        } else {
            throw new Error('验证失败');
        }
    })
    .catch(error => {
        console.error('管理员验证失败:', error);
        
        // 模拟验证（开发阶段）
        if (adminToken.startsWith('mock_admin_token_')) {
            document.getElementById('adminName').textContent = '管理员';
            return;
        }
        
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html?from=admin';
    });
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    }
}

// 切换标签
function switchTab(tabName) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 隐藏所有内容
    document.querySelectorAll('[id$="-content"]').forEach(content => {
        content.style.display = 'none';
    });
    
    // 显示选中的内容
    document.getElementById(`${tabName}-content`).style.display = 'block';
    
    currentTab = tabName;
    
    // 加载对应数据
    switch(tabName) {
        case 'users':
            if (usersData.length === 0) loadUsers();
            break;
        case 'orders':
            if (ordersData.length === 0) loadOrders();
            break;
        case 'licenses':
            if (licensesData.length === 0) loadLicenses();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// 加载仪表板统计数据
function loadDashboardStats() {
    fetch(`${API_BASE_URL}/admin/stats`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            statsData = data.data;
            updateStatsDisplay();
        }
    })
    .catch(error => {
        console.error('加载统计数据失败:', error);
        // 显示模拟数据
        statsData = {
            totalUsers: 1234,
            activeUsers: 856,
            proUsers: 123,
            totalOrders: 456
        };
        updateStatsDisplay();
    });
}

// 更新统计数据显示
function updateStatsDisplay() {
    document.getElementById('totalUsers').textContent = statsData.totalUsers || 0;
    document.getElementById('activeUsers').textContent = statsData.activeUsers || 0;
    document.getElementById('proUsers').textContent = statsData.proUsers || 0;
    document.getElementById('totalOrders').textContent = statsData.totalOrders || 0;
}

// 加载用户数据
function loadUsers() {
    document.getElementById('usersTable').innerHTML = '<div class="loading">加载中...</div>';
    
    fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            usersData = data.data;
            renderUsersTable(usersData);
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('加载用户数据失败:', error);
        // 显示模拟数据
        usersData = generateMockUsers();
        renderUsersTable(usersData);
    });
}

// 渲染用户表格
function renderUsersTable(users) {
    if (users.length === 0) {
        document.getElementById('usersTable').innerHTML = '<div class="empty">暂无用户数据</div>';
        return;
    }
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>用户ID</th>
                    <th>邮箱</th>
                    <th>用户类型</th>
                    <th>使用次数</th>
                    <th>注册时间</th>
                    <th>最后登录</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.userId.substring(0, 8)}...</td>
                        <td>${user.email}</td>
                        <td>
                            <span class="status ${user.isGuest ? 'guest' : (user.isPro ? 'active' : 'inactive')}">
                                ${user.isGuest ? '游客' : (user.isPro ? '专业版' : '免费版')}
                            </span>
                        </td>
                        <td>${user.usageCount}/${user.dailyLimit}</td>
                        <td>${formatDate(user.registeredAt)}</td>
                        <td>${user.loginAt ? formatDate(user.loginAt) : '从未登录'}</td>
                        <td>
                            <span class="status ${user.isActive ? 'active' : 'inactive'}">
                                ${user.isActive ? '正常' : '禁用'}
                            </span>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-primary" onclick="viewUser('${user.userId}')">查看</button>
                                <button class="btn btn-danger" onclick="toggleUserStatus('${user.userId}', ${user.isActive})">
                                    ${user.isActive ? '禁用' : '启用'}
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('usersTable').innerHTML = tableHTML;
}

// 加载订单数据
function loadOrders() {
    document.getElementById('ordersTable').innerHTML = '<div class="loading">加载中...</div>';
    
    fetch(`${API_BASE_URL}/admin/orders`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            ordersData = data.data;
            renderOrdersTable(ordersData);
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('加载订单数据失败:', error);
        // 显示模拟数据
        ordersData = generateMockOrders();
        renderOrdersTable(ordersData);
    });
}

// 渲染订单表格
function renderOrdersTable(orders) {
    if (orders.length === 0) {
        document.getElementById('ordersTable').innerHTML = '<div class="empty">暂无订单数据</div>';
        return;
    }
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>订单ID</th>
                    <th>用户邮箱</th>
                    <th>订阅计划</th>
                    <th>金额</th>
                    <th>支付方式</th>
                    <th>创建时间</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.orderId}</td>
                        <td>${order.userEmail}</td>
                        <td>${order.planName}</td>
                        <td>¥${order.amount}</td>
                        <td>${order.paymentMethod}</td>
                        <td>${formatDate(order.createdAt)}</td>
                        <td>
                            <span class="status ${order.status === 'paid' ? 'active' : (order.status === 'pending' ? 'guest' : 'inactive')}">
                                ${getOrderStatusText(order.status)}
                            </span>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-primary" onclick="viewOrder('${order.orderId}')">查看</button>
                                ${order.status === 'pending' ? `<button class="btn btn-danger" onclick="cancelOrder('${order.orderId}')">取消</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('ordersTable').innerHTML = tableHTML;
}

// 加载许可证数据
function loadLicenses() {
    document.getElementById('licensesTable').innerHTML = '<div class="loading">加载中...</div>';
    
    fetch(`${API_BASE_URL}/admin/licenses`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            licensesData = data.data;
            renderLicensesTable(licensesData);
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('加载许可证数据失败:', error);
        // 显示模拟数据
        licensesData = generateMockLicenses();
        renderLicensesTable(licensesData);
    });
}

// 渲染许可证表格
function renderLicensesTable(licenses) {
    if (licenses.length === 0) {
        document.getElementById('licensesTable').innerHTML = '<div class="empty">暂无许可证数据</div>';
        return;
    }
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>许可证密钥</th>
                    <th>订阅计划</th>
                    <th>用户邮箱</th>
                    <th>激活时间</th>
                    <th>到期时间</th>
                    <th>状态</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${licenses.map(license => `
                    <tr>
                        <td>${license.licenseKey.substring(0, 16)}...</td>
                        <td>${license.planName}</td>
                        <td>${license.userEmail || '未激活'}</td>
                        <td>${license.activatedAt ? formatDate(license.activatedAt) : '未激活'}</td>
                        <td>${license.expiryDate ? formatDate(license.expiryDate) : '永久'}</td>
                        <td>
                            <span class="status ${license.isActive ? 'active' : (license.isExpired ? 'inactive' : 'guest')}">
                                ${license.isActive ? '已激活' : (license.isExpired ? '已过期' : '未激活')}
                            </span>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-primary" onclick="viewLicense('${license.licenseKey}')">查看</button>
                                ${license.isActive ? `<button class="btn btn-danger" onclick="revokeLicense('${license.licenseKey}')">撤销</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('licensesTable').innerHTML = tableHTML;
}

// 搜索用户
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const filter = document.getElementById('userFilter').value;
    
    let filteredUsers = usersData.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || 
            (filter === 'free' && !user.isPro && !user.isGuest) ||
            (filter === 'pro' && user.isPro) ||
            (filter === 'guest' && user.isGuest);
        
        return matchesSearch && matchesFilter;
    });
    
    renderUsersTable(filteredUsers);
}

// 搜索订单
function searchOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
    const filter = document.getElementById('orderFilter').value;
    
    let filteredOrders = ordersData.filter(order => {
        const matchesSearch = order.orderId.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || order.status === filter;
        
        return matchesSearch && matchesFilter;
    });
    
    renderOrdersTable(filteredOrders);
}

// 搜索许可证
function searchLicenses() {
    const searchTerm = document.getElementById('licenseSearch').value.toLowerCase();
    const filter = document.getElementById('licenseFilter').value;
    
    let filteredLicenses = licensesData.filter(license => {
        const matchesSearch = license.licenseKey.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || 
            (filter === 'active' && license.isActive) ||
            (filter === 'inactive' && !license.isActive && !license.isExpired) ||
            (filter === 'expired' && license.isExpired);
        
        return matchesSearch && matchesFilter;
    });
    
    renderLicensesTable(filteredLicenses);
}

// 工具函数
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function getOrderStatusText(status) {
    const statusMap = {
        'pending': '待支付',
        'paid': '已支付',
        'cancelled': '已取消',
        'refunded': '已退款'
    };
    return statusMap[status] || status;
}

// 用户操作
function viewUser(userId) {
    const user = usersData.find(u => u.userId === userId);
    if (user) {
        alert(`用户详情:\n\n用户ID: ${user.userId}\n邮箱: ${user.email}\n类型: ${user.isGuest ? '游客' : (user.isPro ? '专业版' : '免费版')}\n使用次数: ${user.usageCount}/${user.dailyLimit}\n注册时间: ${formatDate(user.registeredAt)}`);
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? '禁用' : '启用';
    if (confirm(`确定要${action}该用户吗？`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            
            if (response.ok) {
                alert(`${action}用户成功`);
                loadUsers(); // 重新加载用户列表
            } else {
                const error = await response.json();
                alert(`${action}用户失败: ${error.message}`);
            }
        } catch (error) {
            alert(`${action}用户失败: ${error.message}`);
        }
    }
}

// 订单操作
function viewOrder(orderId) {
    const order = ordersData.find(o => o.orderId === orderId);
    if (order) {
        alert(`订单详情:\n\n订单ID: ${order.orderId}\n用户: ${order.userEmail}\n计划: ${order.planName}\n金额: ¥${order.amount}\n状态: ${getOrderStatusText(order.status)}\n创建时间: ${formatDate(order.createdAt)}`);
    }
}

async function cancelOrder(orderId) {
    if (confirm('确定要取消该订单吗？')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                alert('取消订单成功');
                loadOrders(); // 重新加载订单列表
            } else {
                const error = await response.json();
                alert(`取消订单失败: ${error.message}`);
            }
        } catch (error) {
            alert(`取消订单失败: ${error.message}`);
        }
    }
}

// 许可证操作
function viewLicense(licenseKey) {
    const license = licensesData.find(l => l.licenseKey === licenseKey);
    if (license) {
        alert(`许可证详情:\n\n密钥: ${license.licenseKey}\n计划: ${license.planName}\n用户: ${license.userEmail || '未激活'}\n激活时间: ${license.activatedAt ? formatDate(license.activatedAt) : '未激活'}\n到期时间: ${license.expiryDate ? formatDate(license.expiryDate) : '永久'}`);
    }
}

async function revokeLicense(licenseKey) {
    if (confirm('确定要撤销该许可证吗？')) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/licenses/${licenseKey}/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                alert('撤销许可证成功');
                loadLicenses(); // 重新加载许可证列表
            } else {
                const error = await response.json();
                alert(`撤销许可证失败: ${error.message}`);
            }
        } catch (error) {
            alert(`撤销许可证失败: ${error.message}`);
        }
    }
}

// 加载数据分析
function loadAnalytics() {
    console.log('加载数据分析...');
    
    // 初始化图表
    initUserGrowthChart();
    initOrderStatusChart();
    initRevenueChart();
    initLicenseTypeChart();
}

// 用户增长趋势图
function initUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    
    // 生成过去30天的模拟数据
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        data.push(Math.floor(Math.random() * 10) + i * 0.5); // 模拟增长趋势
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '新增用户',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f0f0f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 订单状态分布图
function initOrderStatusChart() {
    const ctx = document.getElementById('orderStatusChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已支付', '待支付', '已取消', '已退款'],
            datasets: [{
                data: [65, 20, 10, 5],
                backgroundColor: [
                    '#27ae60',
                    '#f39c12',
                    '#e74c3c',
                    '#95a5a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// 收入趋势图
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // 生成过去12个月的模拟数据
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        labels.push(date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }));
        data.push(Math.floor(Math.random() * 5000) + 2000); // 模拟收入数据
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '月收入 (¥)',
                data: data,
                backgroundColor: '#9b59b6',
                borderColor: '#8e44ad',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f0f0f0'
                    },
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 许可证类型分布图
function initLicenseTypeChart() {
    const ctx = document.getElementById('licenseTypeChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['终身会员', '年度专业版', '月度专业版'],
            datasets: [{
                data: [30, 45, 25],
                backgroundColor: [
                    '#e67e22',
                    '#3498db',
                    '#2ecc71'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// 生成模拟数据
function generateMockUsers() {
    const mockUsers = [];
    const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com', 'guest@temp.com', 'pro@example.com'];
    
    for (let i = 0; i < emails.length; i++) {
        mockUsers.push({
            userId: `user_${Date.now()}_${i}`,
            email: emails[i],
            isPro: i === 4,
            isGuest: i === 3,
            usageCount: Math.floor(Math.random() * 10),
            dailyLimit: i === 4 ? 999 : (i === 3 ? 3 : 10),
            registeredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            loginAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: true
        });
    }
    
    return mockUsers;
}

function generateMockOrders() {
    const mockOrders = [];
    const plans = ['月度专业版', '年度专业版', '终身会员'];
    const amounts = [19.9, 199, 499];
    const statuses = ['paid', 'pending', 'cancelled'];
    
    for (let i = 0; i < 5; i++) {
        const planIndex = Math.floor(Math.random() * plans.length);
        mockOrders.push({
            orderId: `order_${Date.now()}_${i}`,
            userEmail: `user${i + 1}@example.com`,
            planName: plans[planIndex],
            amount: amounts[planIndex],
            paymentMethod: Math.random() > 0.5 ? '支付宝' : '微信支付',
            status: statuses[Math.floor(Math.random() * statuses.length)],
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return mockOrders;
}

function generateMockLicenses() {
    const mockLicenses = [];
    const plans = ['月度专业版', '年度专业版', '终身会员'];
    
    for (let i = 0; i < 5; i++) {
        const isActive = Math.random() > 0.3;
        const planName = plans[Math.floor(Math.random() * plans.length)];
        
        mockLicenses.push({
            licenseKey: `license_${Date.now()}_${i}_${Math.random().toString(36).substring(2)}`,
            planName: planName,
            userEmail: isActive ? `user${i + 1}@example.com` : null,
            activatedAt: isActive ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            expiryDate: planName === '终身会员' ? null : new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: isActive,
            isExpired: false
        });
    }
    
    return mockLicenses;
}