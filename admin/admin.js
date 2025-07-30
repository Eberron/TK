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
document.addEventListener('DOMContentLoaded', async function() {
    await checkAdminAuth();
    loadDashboardStats();
    loadUsers();
});

// 检查管理员权限
async function checkAdminAuth() {
    // 统一使用localStorage存储Token（确保与登录页面一致）
    let adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
        // 重定向到登录页面
        window.location.href = 'login.html?from=admin';
        return;
    }
    
    // 验证token有效性
    try {
        const response = await fetch(`${API_BASE_URL}/admin/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('adminName').textContent = data.data.name || '管理员';
            return; // 验证成功，继续执行
        } else {
            throw new Error(data.message || '验证失败');
        }
    } catch (error) {
        console.error('管理员验证失败:', error);
        
        // 清除无效Token
        localStorage.removeItem('adminToken');
        
        // 重定向到登录页面
        window.location.href = 'login.html?from=admin';
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        // 清除Token
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
        // 显示错误信息
        statsData = {
            totalUsers: 0,
            activeUsers: 0,
            proUsers: 0,
            totalOrders: 0
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
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '加载中...';
    usersTable.appendChild(loadingDiv);
    
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
        // 显示错误信息
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '无法连接到服务器，请检查网络连接';
        usersTable.appendChild(errorDiv);
    });
}

// 渲染用户表格
function renderUsersTable(users) {
    if (users.length === 0) {
        const usersTable = document.getElementById('usersTable');
      usersTable.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = '暂无用户数据';
      usersTable.appendChild(emptyDiv);
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
    
    // 安全地创建用户表格
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['用户ID', '邮箱', '注册时间', '状态', '使用次数', '操作'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    users.forEach(user => {
      const row = document.createElement('tr');
      
      // 用户ID
      const idCell = document.createElement('td');
      idCell.textContent = user.userId.substring(0, 8) + '...';
      row.appendChild(idCell);
      
      // 邮箱
      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;
      row.appendChild(emailCell);
      
      // 注册时间
      const timeCell = document.createElement('td');
      timeCell.textContent = formatDate(user.createdAt);
      row.appendChild(timeCell);
      
      // 状态
      const statusCell = document.createElement('td');
      const statusSpan = document.createElement('span');
      statusSpan.className = `status ${user.isActive ? 'active' : 'inactive'}`;
      statusSpan.textContent = user.isActive ? '正常' : '禁用';
      statusCell.appendChild(statusSpan);
      row.appendChild(statusCell);
      
      // 使用次数
      const usageCell = document.createElement('td');
      usageCell.textContent = user.usageCount || 0;
      row.appendChild(usageCell);
      
      // 操作
      const actionCell = document.createElement('td');
      const toggleBtn = document.createElement('button');
      toggleBtn.className = `btn ${user.isActive ? 'btn-danger' : 'btn-success'}`;
      toggleBtn.textContent = user.isActive ? '禁用' : '启用';
      toggleBtn.onclick = () => toggleUserStatus(user.userId, !user.isActive);
      actionCell.appendChild(toggleBtn);
      row.appendChild(actionCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    usersTable.appendChild(table);
}

// 加载订单数据
function loadOrders() {
    const ordersTable = document.getElementById('ordersTable');
    ordersTable.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '加载中...';
    ordersTable.appendChild(loadingDiv);
    
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
        // 显示错误信息
        const ordersTable = document.getElementById('ordersTable');
        ordersTable.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '无法连接到服务器，请检查网络连接';
        ordersTable.appendChild(errorDiv);
    });
}

// 渲染订单表格
function renderOrdersTable(orders) {
    if (orders.length === 0) {
        const ordersTable = document.getElementById('ordersTable');
      ordersTable.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = '暂无订单数据';
      ordersTable.appendChild(emptyDiv);
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
    
    // 安全地创建订单表格
    const ordersTable = document.getElementById('ordersTable');
    ordersTable.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['订单ID', '用户邮箱', '计划', '金额', '状态', '创建时间', '操作'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    orders.forEach(order => {
      const row = document.createElement('tr');
      
      // 订单ID
      const idCell = document.createElement('td');
      idCell.textContent = order.orderId.substring(0, 12) + '...';
      row.appendChild(idCell);
      
      // 用户邮箱
      const emailCell = document.createElement('td');
      emailCell.textContent = order.userEmail || '未知';
      row.appendChild(emailCell);
      
      // 计划
      const planCell = document.createElement('td');
      planCell.textContent = order.planName;
      row.appendChild(planCell);
      
      // 金额
      const amountCell = document.createElement('td');
      amountCell.textContent = `¥${order.amount}`;
      row.appendChild(amountCell);
      
      // 状态
      const statusCell = document.createElement('td');
      const statusSpan = document.createElement('span');
      statusSpan.className = `status ${order.status}`;
      const statusMap = { pending: '待支付', paid: '已支付', failed: '失败', cancelled: '已取消' };
      statusSpan.textContent = statusMap[order.status] || order.status;
      statusCell.appendChild(statusSpan);
      row.appendChild(statusCell);
      
      // 创建时间
      const timeCell = document.createElement('td');
      timeCell.textContent = formatDate(order.createdAt);
      row.appendChild(timeCell);
      
      // 操作
      const actionCell = document.createElement('td');
      if (order.status === 'pending') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-danger';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = () => cancelOrder(order.orderId);
        actionCell.appendChild(cancelBtn);
      }
      row.appendChild(actionCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    ordersTable.appendChild(table);
}

// 加载许可证数据
function loadLicenses() {
    const licensesTable = document.getElementById('licensesTable');
    licensesTable.innerHTML = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '加载中...';
    licensesTable.appendChild(loadingDiv);
    
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
        // 显示错误信息
        const licensesTable = document.getElementById('licensesTable');
        licensesTable.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = '无法连接到服务器，请检查网络连接';
        licensesTable.appendChild(errorDiv);
    });
}

// 渲染许可证表格
function renderLicensesTable(licenses) {
    if (licenses.length === 0) {
        const licensesTable = document.getElementById('licensesTable');
      licensesTable.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = '暂无许可证数据';
      licensesTable.appendChild(emptyDiv);
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
    
    // 安全地创建许可证表格
    const licensesTable = document.getElementById('licensesTable');
    licensesTable.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['许可证密钥', '计划类型', '用户邮箱', '状态', '激活时间', '到期时间', '操作'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // 创建表体
    const tbody = document.createElement('tbody');
    licenses.forEach(license => {
      const row = document.createElement('tr');
      
      // 许可证密钥（脱敏显示）
      const keyCell = document.createElement('td');
      keyCell.textContent = license.licenseKey.substring(0, 16) + '...';
      row.appendChild(keyCell);
      
      // 计划类型
      const planCell = document.createElement('td');
      planCell.textContent = license.planName;
      row.appendChild(planCell);
      
      // 用户邮箱
      const emailCell = document.createElement('td');
      emailCell.textContent = license.userEmail || '未激活';
      row.appendChild(emailCell);
      
      // 状态
      const statusCell = document.createElement('td');
      const statusSpan = document.createElement('span');
      statusSpan.className = `status ${license.isActive ? 'active' : 'inactive'}`;
      statusSpan.textContent = license.isActive ? '有效' : '已撤销';
      statusCell.appendChild(statusSpan);
      row.appendChild(statusCell);
      
      // 激活时间
      const activatedCell = document.createElement('td');
      activatedCell.textContent = license.activatedAt ? formatDate(license.activatedAt) : '未激活';
      row.appendChild(activatedCell);
      
      // 到期时间
      const expiryCell = document.createElement('td');
      expiryCell.textContent = license.expiryDate ? formatDate(license.expiryDate) : '永久';
      row.appendChild(expiryCell);
      
      // 操作
      const actionCell = document.createElement('td');
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-primary';
      viewBtn.textContent = '查看';
      viewBtn.onclick = () => viewLicense(license.licenseKey);
      actionCell.appendChild(viewBtn);
      
      if (license.isActive) {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-danger';
        revokeBtn.textContent = '撤销';
        revokeBtn.onclick = () => revokeLicense(license.licenseKey);
        actionCell.appendChild(revokeBtn);
      }
      
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
    licensesTable.appendChild(table);
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

// 模拟数据生成函数已移除以提高安全性