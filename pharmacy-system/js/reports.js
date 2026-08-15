// التقارير وإدارة العملاء - Reports & Customers

// تحميل صفحة العملاء
function loadCustomers() {
    renderCustomersTable(appData.customers);
    
    document.getElementById('customerSearch').addEventListener('input', function() {
        const search = this.value.toLowerCase();
        const filtered = appData.customers.filter(c => 
            c.name.toLowerCase().includes(search) ||
            c.phone.includes(search) ||
            (c.email && c.email.toLowerCase().includes(search))
        );
        renderCustomersTable(filtered);
    });
    
    document.getElementById('addCustomerBtn').addEventListener('click', function() {
        openCustomerModal();
    });
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTable');
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد عملاء</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.visits}</td>
            <td>${customer.totalPurchases.toFixed(2)} ر.س</td>
            <td>${customer.registeredAt}</td>
            <td>
                <button class="btn-secondary" onclick="editCustomer(${customer.id})" style="padding: 5px 10px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="viewCustomerHistory(${customer.id})" style="padding: 5px 10px;">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openCustomerModal(customer = null) {
    document.getElementById('customerModalTitle').textContent = customer ? 'تعديل عميل' : 'إضافة عميل جديد';
    document.getElementById('customerId').value = customer ? customer.id : '';
    document.getElementById('customerName').value = customer ? customer.name : '';
    document.getElementById('customerPhone').value = customer ? customer.phone : '';
    document.getElementById('customerEmail').value = customer ? customer.email || '' : '';
    document.getElementById('customerAddress').value = customer ? customer.address || '' : '';
    
    openModal('customerModal');
}

document.getElementById('customerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('customerId').value;
    const customerData = {
        id: customerId ? parseInt(customerId) : Date.now(),
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        email: document.getElementById('customerEmail').value,
        address: document.getElementById('customerAddress').value,
        visits: customerId ? appData.customers.find(c => c.id == customerId)?.visits : 0,
        totalPurchases: customerId ? appData.customers.find(c => c.id == customerId)?.totalPurchases : 0,
        registeredAt: customerId ? appData.customers.find(c => c.id == customerId)?.registeredAt : new Date().toISOString().split('T')[0]
    };
    
    if (customerId) {
        const index = appData.customers.findIndex(c => c.id == customerId);
        appData.customers[index] = customerData;
        showToast('تم تعديل العميل بنجاح', 'success');
    } else {
        appData.customers.push(customerData);
        showToast('تم إضافة العميل بنجاح', 'success');
    }
    
    saveData();
    closeModal();
    loadCustomers();
});

function editCustomer(id) {
    const customer = appData.customers.find(c => c.id === id);
    if (customer) {
        openCustomerModal(customer);
    }
}

function viewCustomerHistory(customerId) {
    const customer = appData.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    const customerSales = appData.sales.filter(s => s.customerId == customerId);
    
    let historyHTML = `
        <div style="padding: 20px;">
            <h3>سجل مشتريات: ${customer.name}</h3>
            <p>الهاتف: ${customer.phone}</p>
            <p>إجمالي الزيارات: ${customer.visits}</p>
            <p>إجمالي المشتريات: ${customer.totalPurchases.toFixed(2)} ر.س</p>
            
            <table style="width: 100%; margin-top: 20px;">
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>التاريخ</th>
                        <th>الإجمالي</th>
                        <th>طريقة الدفع</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (customerSales.length === 0) {
        historyHTML += '<tr><td colspan="4" style="text-align: center;">لا توجد مشتريات سابقة</td></tr>';
    } else {
        historyHTML += customerSales.map(sale => `
            <tr>
                <td>#${sale.invoiceNumber}</td>
                <td>${sale.date}</td>
                <td>${sale.total.toFixed(2)} ر.س</td>
                <td>${getPaymentMethodName(sale.paymentMethod)}</td>
            </tr>
        `).join('');
    }
    
    historyHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('invoiceContent').innerHTML = historyHTML;
    openModal('invoiceModal');
}

// تحميل صفحة التقارير
function loadReports() {
    // لا شيء خاص للتحميل
}

function generateReport(type) {
    const container = document.getElementById('reportResult');
    let reportHTML = '';
    
    switch(type) {
        case 'daily':
            reportHTML = generateDailyReport();
            break;
        case 'monthly':
            reportHTML = generateMonthlyReport();
            break;
        case 'inventory':
            reportHTML = generateInventoryReport();
            break;
        case 'profit':
            reportHTML = generateProfitReport();
            break;
    }
    
    container.innerHTML = reportHTML;
    container.scrollIntoView({ behavior: 'smooth' });
}

function generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = appData.sales.filter(s => s.date === today);
    
    const totalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = todaySales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    
    return `
        <div class="report-result" style="background: var(--card-bg); padding: 30px; border-radius: var(--radius-lg); margin-top: 20px;">
            <h2 style="margin-bottom: 20px; color: var(--primary-color);">
                <i class="fas fa-file-alt"></i> التقرير اليومي
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 30px;">تاريخ التقرير: ${today}</p>
            
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalRevenue.toFixed(2)} ر.س</h3>
                        <p>إجمالي المبيعات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${todaySales.length}</h3>
                        <p>عدد الفواتير</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalItems}</h3>
                        <p>عدد المنتجات</p>
                    </div>
                </div>
            </div>
            
            <h3>تفاصيل المبيعات</h3>
            <table style="width: 100%; margin-top: 15px;">
                <thead>
                    <tr>
                        <th>رقم الفاتورة</th>
                        <th>الوقت</th>
                        <th>العميل</th>
                        <th>المنتجات</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${todaySales.length === 0 
                        ? '<tr><td colspan="5" style="text-align: center;">لا توجد مبيعات اليوم</td></tr>'
                        : todaySales.map(sale => `
                            <tr>
                                <td>#${sale.invoiceNumber}</td>
                                <td>${sale.time}</td>
                                <td>${sale.customerName}</td>
                                <td>${sale.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                                <td>${sale.total.toFixed(2)} ر.س</td>
                            </tr>
                        `).join('')
                    }
                </tbody>
            </table>
            
            <button class="btn-primary" onclick="window.print()" style="margin-top: 20px;">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
    `;
}

function generateMonthlyReport() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthSales = appData.sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    
    const totalRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = monthSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // تجميع المبيعات حسب الأسبوع
    const weeklyData = [0, 0, 0, 0];
    monthSales.forEach(sale => {
        const weekIndex = Math.floor(new Date(sale.date).getDate() / 7);
        weeklyData[Math.min(weekIndex, 3)] += sale.total;
    });
    
    return `
        <div class="report-result" style="background: var(--card-bg); padding: 30px; border-radius: var(--radius-lg); margin-top: 20px;">
            <h2 style="margin-bottom: 20px; color: var(--primary-color);">
                <i class="fas fa-chart-bar"></i> التقرير الشهري
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 30px;">
                ${currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
            </p>
            
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalRevenue.toFixed(2)} ر.س</h3>
                        <p>إجمالي المبيعات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalOrders}</h3>
                        <p>عدد الفواتير</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${avgOrderValue.toFixed(2)} ر.س</h3>
                        <p>متوسط قيمة الفاتورة</p>
                    </div>
                </div>
            </div>
            
            <h3>المبيعات الأسبوعية</h3>
            <div style="display: flex; gap: 10px; margin-top: 15px; align-items: flex-end; height: 200px;">
                ${weeklyData.map((value, index) => {
                    const maxHeight = Math.max(...weeklyData) || 1;
                    const height = (value / maxHeight) * 150;
                    return `
                        <div style="flex: 1; text-align: center;">
                            <div style="height: ${height}px; background: var(--primary-color); border-radius: 8px 8px 0 0; margin: 0 auto; max-width: 60px;"></div>
                            <p style="margin-top: 10px; font-size: 12px;">الأسبوع ${index + 1}</p>
                            <p style="font-size: 11px; color: var(--text-secondary);">${value.toFixed(0)}</p>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <button class="btn-primary" onclick="window.print()" style="margin-top: 20px;">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
    `;
}

function generateInventoryReport() {
    const lowStock = appData.products.filter(p => p.quantity <= p.minStock);
    const expiringSoon = appData.products.filter(p => 
        new Date(p.expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    
    const totalProducts = appData.products.length;
    const totalQuantity = appData.products.reduce((sum, p) => sum + p.quantity, 0);
    const inventoryValue = appData.products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    
    return `
        <div class="report-result" style="background: var(--card-bg); padding: 30px; border-radius: var(--radius-lg); margin-top: 20px;">
            <h2 style="margin-bottom: 20px; color: var(--primary-color);">
                <i class="fas fa-boxes"></i> تقرير المخزون
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 30px;">حالة المخزون الحالية</p>
            
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalProducts}</h3>
                        <p>عدد المنتجات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalQuantity}</h3>
                        <p>إجمالي الكميات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${inventoryValue.toFixed(2)} ر.س</h3>
                        <p>قيمة المخزون</p>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h3 style="color: var(--warning-color);">
                        <i class="fas fa-exclamation-triangle"></i> منتجات منخفضة المخزون (${lowStock.length})
                    </h3>
                    <table style="width: 100%; margin-top: 15px;">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>الكمية</th>
                                <th>الحد الأدنى</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lowStock.length === 0 
                                ? '<tr><td colspan="3" style="text-align: center;">لا يوجد منتجات منخفضة</td></tr>'
                                : lowStock.map(p => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td style="color: var(--warning-color);">${p.quantity}</td>
                                        <td>${p.minStock}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
                
                <div>
                    <h3 style="color: var(--danger-color);">
                        <i class="fas fa-calendar-times"></i> منتجات قاربت على الانتهاء (${expiringSoon.length})
                    </h3>
                    <table style="width: 100%; margin-top: 15px;">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>تاريخ الانتهاء</th>
                                <th>الكمية</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expiringSoon.length === 0 
                                ? '<tr><td colspan="3" style="text-align: center;">لا يوجد منتجات منتهية قريباً</td></tr>'
                                : expiringSoon.map(p => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td style="color: var(--danger-color);">${p.expiry}</td>
                                        <td>${p.quantity}</td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <button class="btn-primary" onclick="window.print()" style="margin-top: 20px;">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
    `;
}

function generateProfitReport() {
    const totalRevenue = appData.sales.reduce((sum, s) => sum + s.total, 0);
    const totalCost = appData.sales.reduce((sum, s) => {
        return sum + s.items.reduce((itemSum, item) => {
            return itemSum + (item.cost * item.quantity);
        }, 0);
    }, 0);
    
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // الربح حسب الفئة
    const categoryProfits = {};
    appData.categories.forEach(cat => {
        const categorySales = appData.sales.filter(s => 
            s.items.some(i => i.category === cat)
        );
        
        const revenue = categorySales.reduce((sum, s) => {
            const categoryItems = s.items.filter(i => i.category === cat);
            return sum + categoryItems.reduce((iSum, i) => iSum + (i.price * i.quantity), 0);
        }, 0);
        
        const cost = categorySales.reduce((sum, s) => {
            const categoryItems = s.items.filter(i => i.category === cat);
            return sum + categoryItems.reduce((iSum, i) => iSum + (i.cost * i.quantity), 0);
        }, 0);
        
        categoryProfits[cat] = { revenue, cost, profit: revenue - cost };
    });
    
    return `
        <div class="report-result" style="background: var(--card-bg); padding: 30px; border-radius: var(--radius-lg); margin-top: 20px;">
            <h2 style="margin-bottom: 20px; color: var(--primary-color);">
                <i class="fas fa-coins"></i> تقرير الأرباح
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 30px;">تحليل الأرباح والخسائر</p>
            
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalRevenue.toFixed(2)} ر.س</h3>
                        <p>إجمالي الإيرادات</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalCost.toFixed(2)} ر.س</h3>
                        <p>إجمالي التكاليف</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${grossProfit.toFixed(2)} ر.س</h3>
                        <p>صافي الربح</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${profitMargin.toFixed(1)}%</h3>
                        <p>هامش الربح</p>
                    </div>
                </div>
            </div>
            
            <h3>الأرباح حسب الفئة</h3>
            <table style="width: 100%; margin-top: 15px;">
                <thead>
                    <tr>
                        <th>الفئة</th>
                        <th>الإيرادات</th>
                        <th>التكاليف</th>
                        <th>الربح</th>
                        <th>هامش الربح</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(categoryProfits).map(([cat, data]) => {
                        const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                        return `
                            <tr>
                                <td>${cat}</td>
                                <td>${data.revenue.toFixed(2)}</td>
                                <td>${data.cost.toFixed(2)}</td>
                                <td style="color: ${data.profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">
                                    ${data.profit.toFixed(2)}
                                </td>
                                <td>${margin.toFixed(1)}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <button class="btn-primary" onclick="window.print()" style="margin-top: 20px;">
                <i class="fas fa-print"></i> طباعة التقرير
            </button>
        </div>
    `;
}

// تحميل الإعدادات
function loadSettings() {
    document.getElementById('pharmacyName').value = appData.settings.pharmacyName;
    document.getElementById('pharmacyAddress').value = appData.settings.address;
    document.getElementById('pharmacyPhone').value = appData.settings.phone;
    
    renderUsersList();
}

document.getElementById('pharmacySettings').addEventListener('submit', function(e) {
    e.preventDefault();
    
    appData.settings.pharmacyName = document.getElementById('pharmacyName').value;
    appData.settings.address = document.getElementById('pharmacyAddress').value;
    appData.settings.phone = document.getElementById('pharmacyPhone').value;
    
    saveData();
    showToast('تم حفظ الإعدادات بنجاح', 'success');
});

function renderUsersList() {
    const container = document.getElementById('usersList');
    
    container.innerHTML = appData.users.map(user => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid var(--border-color); border-radius: var(--radius); margin-bottom: 10px;">
            <div>
                <strong>${user.name}</strong><br>
                <small style="color: var(--text-secondary);">${user.username} - ${user.role === 'admin' ? 'مدير' : 'مستخدم'}</small>
            </div>
            ${user.username !== 'admin' ? `
                <button class="btn-danger" onclick="deleteUser(${user.id})" style="padding: 5px 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

document.getElementById('addUserBtn').addEventListener('click', function() {
    const username = prompt('اسم المستخدم:');
    if (!username) return;
    
    const password = prompt('كلمة المرور:');
    if (!password) return;
    
    const name = prompt('الاسم الكامل:');
    if (!name) return;
    
    appData.users.push({
        id: Date.now(),
        username,
        password,
        name,
        role: 'user'
    });
    
    saveData();
    renderUsersList();
    showToast('تم إضافة المستخدم بنجاح', 'success');
});

function deleteUser(id) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        appData.users = appData.users.filter(u => u.id !== id);
        saveData();
        renderUsersList();
        showToast('تم حذف المستخدم بنجاح', 'success');
    }
}
