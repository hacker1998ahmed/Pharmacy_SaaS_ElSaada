// المبيعات ونقطة البيع - Sales & POS

let cart = [];
let currentCategory = 'all';

// تحميل نقطة البيع
function loadPOS() {
    renderPOSCategories();
    renderPOSProducts(appData.products);
    updateCart();
    
    // البحث في المنتجات
    document.getElementById('posSearch').addEventListener('input', function(e) {
        const search = e.target.value.toLowerCase();
        
        // التحقق من الباركود
        if (search.length >= 4) {
            const product = appData.products.find(p => p.barcode === search);
            if (product) {
                addToCart(product.id);
                document.getElementById('posSearch').value = '';
                return;
            }
        }
        
        filterPOSProducts(search);
    });
    
    // تفريغ السلة
    document.getElementById('clearCart').addEventListener('click', function() {
        cart = [];
        updateCart();
    });
    
    // الخصم
    document.getElementById('discountInput').addEventListener('input', function() {
        updateCart();
    });
    
    // إتمام الشراء
    document.getElementById('checkoutBtn').addEventListener('click', showCheckout);
    document.getElementById('confirmCheckout').addEventListener('click', processCheckout);
}

function renderPOSCategories() {
    const container = document.getElementById('posCategories');
    container.innerHTML = `
        <button class="category-tab active" data-category="all">الكل</button>
        ${appData.categories.map(cat => 
            `<button class="category-tab" data-category="${cat}">${cat}</button>`
        ).join('')}
    `;
    
    container.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            
            if (currentCategory === 'all') {
                renderPOSProducts(appData.products);
            } else {
                renderPOSProducts(appData.products.filter(p => p.category === currentCategory));
            }
        });
    });
}

function renderPOSProducts(products) {
    const container = document.getElementById('posProducts');
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">لا توجد منتجات</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})">
            <i class="fas fa-pills"></i>
            <h4>${product.name}</h4>
            <div class="price">${product.price.toFixed(2)} ر.س</div>
            <small>متوفر: ${product.quantity}</small>
        </div>
    `).join('');
}

function filterPOSProducts(search) {
    let filtered = appData.products.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.barcode.includes(search)
    );
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    renderPOSProducts(filtered);
}

function addToCart(productId) {
    const product = appData.products.find(p => p.id === productId);
    
    if (!product || product.quantity <= 0) {
        showToast('المنتج غير متوفر', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.quantity) {
            existingItem.quantity++;
        } else {
            showToast('الكمية غير متوفرة', 'warning');
        }
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCart();
    showToast('تمت الإضافة للسلة', 'success');
}

function updateCart() {
    const container = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">السلة فارغة</p>';
        document.getElementById('subtotal').textContent = '0.00 ر.س';
        document.getElementById('discount').textContent = '0.00 ر.س';
        document.getElementById('total').textContent = '0.00 ر.س';
        return;
    }
    
    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <strong>${item.name}</strong>
                <br>
                <small>${item.price.toFixed(2)} ر.س</small>
            </div>
            <div class="cart-item-quantity">
                <button onclick="changeQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)">+</button>
            </div>
            <button onclick="removeFromCart(${index})" style="color: var(--danger-color); margin-right: 10px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    calculateTotals();
}

function changeQuantity(index, delta) {
    const item = cart[index];
    const product = appData.products.find(p => p.id === item.id);
    
    item.quantity += delta;
    
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    } else if (item.quantity > product.quantity) {
        item.quantity = product.quantity;
        showToast('الكمية القصوى المتوفرة', 'warning');
    }
    
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountInput').value) || 0;
    const discount = subtotal * (discountPercent / 100);
    const total = subtotal - discount;
    
    document.getElementById('subtotal').textContent = `${subtotal.toFixed(2)} ر.س`;
    document.getElementById('discount').textContent = `${discount.toFixed(2)} ر.س`;
    document.getElementById('total').textContent = `${total.toFixed(2)} ر.س`;
    
    return { subtotal, discount, total };
}

function showCheckout() {
    if (cart.length === 0) {
        showToast('السلة فارغة', 'error');
        return;
    }
    
    populateCheckoutCustomers();
    updateCheckoutSummary();
    
    const totals = calculateTotals();
    document.getElementById('amountPaid').value = totals.total;
    document.getElementById('changeAmount').textContent = '0.00 ر.س';
    
    document.getElementById('amountPaid').addEventListener('input', function() {
        const paid = parseFloat(this.value) || 0;
        const change = paid - totals.total;
        document.getElementById('changeAmount').textContent = `${Math.max(0, change).toFixed(2)} ر.س`;
    });
    
    openModal('checkoutModal');
}

function populateCheckoutCustomers() {
    const select = document.getElementById('checkoutCustomer');
    select.innerHTML = '<option value="">عميل نقدي</option>';
    
    appData.customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        select.appendChild(option);
    });
}

function updateCheckoutSummary() {
    const container = document.getElementById('checkoutSummary');
    const totals = calculateTotals();
    
    container.innerHTML = `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${cart.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: left;"><strong>المجموع الفرعي:</strong></td>
                    <td>${totals.subtotal.toFixed(2)} ر.س</td>
                </tr>
                <tr>
                    <td colspan="3" style="text-align: left;"><strong>الخصم:</strong></td>
                    <td>${totals.discount.toFixed(2)} ر.س</td>
                </tr>
                <tr style="font-size: 18px; font-weight: bold;">
                    <td colspan="3" style="text-align: left;">الإجمالي:</td>
                    <td>${totals.total.toFixed(2)} ر.س</td>
                </tr>
            </tfoot>
        </table>
    `;
}

function processCheckout() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const customerId = document.getElementById('checkoutCustomer').value;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const totals = calculateTotals();
    
    if (amountPaid < totals.total && paymentMethod === 'cash') {
        showToast('المبلغ المدفوع غير كافٍ', 'error');
        return;
    }
    
    // إنشاء الفاتورة
    const invoiceNumber = Date.now().toString().slice(-6);
    const sale = {
        id: Date.now(),
        invoiceNumber: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-SA'),
        items: [...cart],
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        paymentMethod: paymentMethod,
        customerId: customerId || null,
        customerName: customerId ? appData.customers.find(c => c.id == customerId)?.name : 'عميل نقدي'
    };
    
    // تحديث المخزون
    cart.forEach(item => {
        const product = appData.products.find(p => p.id === item.id);
        if (product) {
            product.quantity -= item.quantity;
        }
    });
    
    // تحديث بيانات العميل
    if (customerId) {
        const customer = appData.customers.find(c => c.id == customerId);
        if (customer) {
            customer.visits++;
            customer.totalPurchases += totals.total;
        }
    }
    
    // حفظ البيانات
    appData.sales.push(sale);
    saveData();
    
    // عرض الفاتورة
    showInvoice(sale);
    
    // إعادة تعيين السلة
    cart = [];
    updateCart();
    closeModal();
    
    showToast('تمت العملية بنجاح', 'success');
    loadDashboard();
}

function showInvoice(sale) {
    const container = document.getElementById('invoiceContent');
    
    container.innerHTML = `
        <div class="invoice-header">
            <h2>${appData.settings.pharmacyName}</h2>
            <p>${appData.settings.address}</p>
            <p>هاتف: ${appData.settings.phone}</p>
        </div>
        
        <div class="invoice-details">
            <div>
                <strong>رقم الفاتورة:</strong> #${sale.invoiceNumber}<br>
                <strong>التاريخ:</strong> ${sale.date}<br>
                <strong>الوقت:</strong> ${sale.time}
            </div>
            <div>
                <strong>العميل:</strong> ${sale.customerName}<br>
                <strong>طريقة الدفع:</strong> ${getPaymentMethodName(sale.paymentMethod)}
            </div>
        </div>
        
        <div class="invoice-items">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: var(--bg-color);">
                    <tr>
                        <th style="padding: 10px; text-align: right;">المنتج</th>
                        <th style="padding: 10px; text-align: center;">الكمية</th>
                        <th style="padding: 10px; text-align: left;">السعر</th>
                        <th style="padding: 10px; text-align: left;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items.map(item => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px;">${item.name}</td>
                            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: left;">${item.price.toFixed(2)}</td>
                            <td style="padding: 10px; text-align: left;">${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="invoice-totals">
            <p>المجموع الفرعي: ${sale.subtotal.toFixed(2)} ر.س</p>
            <p>الخصم: ${sale.discount.toFixed(2)} ر.س</p>
            <p style="font-size: 20px; font-weight: bold; margin-top: 10px;">الإجمالي: ${sale.total.toFixed(2)} ر.س</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px; color: var(--text-secondary);">
            شكراً لزيارتكم<br>
            ${appData.settings.pharmacyName}
        </p>
    `;
    
    openModal('invoiceModal');
}

function getPaymentMethodName(method) {
    const names = {
        cash: 'نقدي',
        card: 'بطاقة',
        transfer: 'تحويل بنكي'
    };
    return names[method] || method;
}

// تحميل صفحة المبيعات
function loadSales() {
    renderSalesTable(appData.sales);
    
    document.getElementById('salesSearch').addEventListener('input', function() {
        filterSales();
    });
    
    document.getElementById('salesFrom').addEventListener('change', filterSales);
    document.getElementById('salesTo').addEventListener('change', filterSales);
}

function renderSalesTable(sales) {
    const tbody = document.getElementById('salesTable');
    
    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">لا توجد مبيعات</td></tr>';
        return;
    }
    
    tbody.innerHTML = sales.reverse().map(sale => `
        <tr>
            <td>#${sale.invoiceNumber}</td>
            <td>${sale.date}</td>
            <td>${sale.time}</td>
            <td>${sale.customerName}</td>
            <td>${sale.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
            <td>${sale.total.toFixed(2)} ر.س</td>
            <td>${getPaymentMethodName(sale.paymentMethod)}</td>
            <td>
                <button class="btn-secondary" onclick="viewInvoice('${sale.invoiceNumber}')" style="padding: 5px 10px;">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterSales() {
    const search = document.getElementById('salesSearch').value.toLowerCase();
    const from = document.getElementById('salesFrom').value;
    const to = document.getElementById('salesTo').value;
    
    let filtered = appData.sales.filter(sale => {
        const matchSearch = sale.invoiceNumber.includes(search) ||
                           sale.customerName.toLowerCase().includes(search);
        
        let matchDate = true;
        if (from && sale.date < from) matchDate = false;
        if (to && sale.date > to) matchDate = false;
        
        return matchSearch && matchDate;
    });
    
    renderSalesTable(filtered);
}

function viewInvoice(invoiceNumber) {
    const sale = appData.sales.find(s => s.invoiceNumber === invoiceNumber);
    if (sale) {
        showInvoice(sale);
    }
}
