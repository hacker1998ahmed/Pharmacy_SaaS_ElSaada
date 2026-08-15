// إدارة المخزون - Inventory Management

let salesChart = null;
let categoryChart = null;

// تحميل لوحة التحكم
function loadDashboard() {
    // تحديث الإحصائيات
    document.getElementById('totalProducts').textContent = appData.products.length;
    
    const today = new Date().toISOString().split('T')[0];
    const todaySales = appData.sales
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + s.total, 0);
    document.getElementById('todaySales').textContent = `${todaySales.toFixed(2)} ر.س`;
    
    const lowStock = appData.products.filter(p => p.quantity <= p.minStock).length;
    document.getElementById('lowStock').textContent = lowStock;
    
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const expiringSoon = appData.products.filter(p => new Date(p.expiry) <= thirtyDaysLater).length;
    document.getElementById('expiringSoon').textContent = expiringSoon;
    
    // تحديث الإشعارات
    document.getElementById('notifBadge').textContent = lowStock + expiringSoon;
    
    // تحديث الرسم البياني للمبيعات
    updateSalesChart();
    updateCategoryChart();
    
    // تحديث جدول آخر المبيعات
    updateRecentSales();
}

function updateSalesChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    const last6Months = [];
    const salesData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        last6Months.push(date.toLocaleDateString('ar-SA', { month: 'long' }));
        
        const monthSales = appData.sales
            .filter(s => s.date.startsWith(monthKey))
            .reduce((sum, s) => sum + s.total, 0);
        salesData.push(monthSales);
    }
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months,
            datasets: [{
                label: 'المبيعات',
                data: salesData,
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    const categoryCounts = {};
    appData.products.forEach(p => {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryCounts),
            datasets: [{
                data: Object.values(categoryCounts),
                backgroundColor: [
                    '#4F46E5',
                    '#10B981',
                    '#F59E0B',
                    '#EF4444',
                    '#3B82F6',
                    '#8B5CF6'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateRecentSales() {
    const tbody = document.getElementById('recentSalesTable');
    const recentSales = appData.sales.slice(-5).reverse();
    
    if (recentSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد مبيعات بعد</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentSales.map(sale => `
        <tr>
            <td>#${sale.invoiceNumber}</td>
            <td>${sale.date}</td>
            <td>${sale.customerName || 'عميل نقدي'}</td>
            <td>${sale.total.toFixed(2)} ر.س</td>
            <td><span style="color: var(--success-color);">مكتمل</span></td>
        </tr>
    `).join('');
}

// تحميل المخزون
function loadInventory() {
    populateCategories();
    renderInventoryTable(appData.products);
    
    // أحداث البحث والفلترة
    document.getElementById('inventorySearch').addEventListener('input', function() {
        filterInventory();
    });
    
    document.getElementById('categoryFilter').addEventListener('change', function() {
        filterInventory();
    });
    
    document.getElementById('stockFilter').addEventListener('change', function() {
        filterInventory();
    });
    
    // إضافة منتج
    document.getElementById('addProductBtn').addEventListener('click', function() {
        openProductModal();
    });
}

function populateCategories() {
    const selects = ['productCategory', 'categoryFilter'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = id === 'categoryFilter' ? '<option value="">جميع الفئات</option>' : '';
        
        appData.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
        
        if (currentValue) select.value = currentValue;
    });
}

function renderInventoryTable(products) {
    const tbody = document.getElementById('inventoryTable');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">لا توجد منتجات</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const isLowStock = product.quantity <= product.minStock;
        const isExpiring = new Date(product.expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return `
            <tr style="${isLowStock ? 'background: rgba(245, 158, 11, 0.1)' : ''} ${isExpiring && !isLowStock ? 'background: rgba(239, 68, 68, 0.1)' : ''}">
                <td><i class="fas fa-box" style="color: var(--primary-color); font-size: 24px;"></i></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.price.toFixed(2)} ر.س</td>
                <td>${product.quantity} ${isLowStock ? '<i class="fas fa-exclamation-triangle" style="color: var(--warning-color);"></i>' : ''}</td>
                <td>${product.expiry} ${isExpiring ? '<i class="fas fa-calendar-times" style="color: var(--danger-color);"></i>' : ''}</td>
                <td>${product.barcode}</td>
                <td>
                    <button class="btn-secondary" onclick="editProduct(${product.id})" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger" onclick="deleteProduct(${product.id})" style="padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterInventory() {
    const search = document.getElementById('inventorySearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;
    
    let filtered = appData.products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || 
                           p.barcode.includes(search);
        const matchCategory = !category || p.category === category;
        
        let matchStock = true;
        if (stockFilter === 'low') {
            matchStock = p.quantity <= p.minStock;
        } else if (stockFilter === 'expiring') {
            matchStock = new Date(p.expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        return matchSearch && matchCategory && matchStock;
    });
    
    renderInventoryTable(filtered);
}

function openProductModal(product = null) {
    document.getElementById('productModalTitle').textContent = product ? 'تعديل منتج' : 'إضافة منتج جديد';
    document.getElementById('productId').value = product ? product.id : '';
    document.getElementById('productName').value = product ? product.name : '';
    document.getElementById('productCategory').value = product ? product.category : appData.categories[0];
    document.getElementById('productCost').value = product ? product.cost : '';
    document.getElementById('productPrice').value = product ? product.price : '';
    document.getElementById('productQuantity').value = product ? product.quantity : '';
    document.getElementById('productMinStock').value = product ? product.minStock : 10;
    document.getElementById('productExpiry').value = product ? product.expiry : '';
    document.getElementById('productBarcode').value = product ? product.barcode : '';
    document.getElementById('productDescription').value = product ? product.description : '';
    
    openModal('productModal');
}

document.getElementById('productForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const productData = {
        id: productId ? parseInt(productId) : Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        cost: parseFloat(document.getElementById('productCost').value),
        price: parseFloat(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value),
        minStock: parseInt(document.getElementById('productMinStock').value),
        expiry: document.getElementById('productExpiry').value,
        barcode: document.getElementById('productBarcode').value || String(Date.now()),
        description: document.getElementById('productDescription').value
    };
    
    if (productId) {
        const index = appData.products.findIndex(p => p.id == productId);
        appData.products[index] = productData;
        showToast('تم تعديل المنتج بنجاح', 'success');
    } else {
        appData.products.push(productData);
        showToast('تم إضافة المنتج بنجاح', 'success');
    }
    
    saveData();
    closeModal();
    loadInventory();
    loadDashboard();
});

function editProduct(id) {
    const product = appData.products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

function deleteProduct(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        appData.products = appData.products.filter(p => p.id !== id);
        saveData();
        loadInventory();
        loadDashboard();
        showToast('تم حذف المنتج بنجاح', 'success');
    }
}
