// ElSaada Pharmacy - Main Application JavaScript

const API_URL = window.location.origin + '/api';

// State Management
const state = {
  user: null,
  token: localStorage.getItem('token'),
  subscription: null,
  cart: []
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  if (state.token) {
    validateToken();
  }
  
  // Check current page and initialize
  const currentPage = getCurrentPage();
  if (currentPage === 'login' || currentPage === 'register') {
    initAuth();
  } else if (state.user) {
    initDashboard(currentPage);
  }
});

// Get current page name
function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('login.html')) return 'login';
  if (path.includes('register.html')) return 'register';
  if (path.includes('pos.html')) return 'pos';
  if (path.includes('inventory.html')) return 'inventory';
  if (path.includes('reports.html')) return 'reports';
  if (path.includes('settings.html')) return 'settings';
  return 'dashboard';
}

// API Helper Functions
async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.subscriptionExpired) {
        handleSubscriptionExpired();
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth Functions
async function validateToken() {
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    state.subscription = data.subscription;
    saveAuthState();
    
    if (getCurrentPage() !== 'dashboard' && getCurrentPage() !== 'login') {
      initDashboard(getCurrentPage());
    }
  } catch (error) {
    logout();
  }
}

function saveAuthState() {
  localStorage.setItem('token', state.token);
  localStorage.setItem('user', JSON.stringify(state.user));
  localStorage.setItem('subscription', JSON.stringify(state.subscription));
}

function logout() {
  state.token = null;
  state.user = null;
  state.subscription = null;
  localStorage.clear();
  window.location.href = '/login.html';
}

function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        state.token = data.token;
        state.user = data.user;
        state.subscription = data.subscription;
        saveAuthState();

        showNotification('Login successful!', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (error) {
        showNotification(error.message, 'error');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tenantName = document.getElementById('tenantName').value;
      const email = document.getElementById('email').value;
      const username = document.getElementById('regUsername').value;
      const password = document.getElementById('regPassword').value;
      const phone = document.getElementById('phone').value;

      try {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ tenantName, email, username, password, phone })
        });

        showNotification('Registration successful! Please login.', 'success');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
      } catch (error) {
        showNotification(error.message, 'error');
      }
    });
  }
}

// Dashboard Functions
function initDashboard(page) {
  loadUserInfo();
  loadSidebar();
  
  switch(page) {
    case 'dashboard':
      loadDashboardStats();
      break;
    case 'pos':
      initPOS();
      break;
    case 'inventory':
      loadInventory();
      break;
    case 'reports':
      loadReports();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

function loadUserInfo() {
  const userData = localStorage.getItem('user');
  const subData = localStorage.getItem('subscription');
  
  if (userData) {
    state.user = JSON.parse(userData);
    document.getElementById('userName').textContent = state.user.username;
    document.getElementById('userRole').textContent = state.user.role;
    document.getElementById('userAvatar').textContent = state.user.username.charAt(0).toUpperCase();
  }

  if (subData) {
    state.subscription = JSON.parse(subData);
    const planBadge = document.getElementById('planBadge');
    if (planBadge && state.subscription) {
      planBadge.textContent = state.subscription.planType.toUpperCase();
      planBadge.className = `badge ${state.subscription.planType === 'pro' ? 'badge-success' : 'badge-primary'}`;
    }
  }
}

function loadSidebar() {
  const sidebar = document.querySelector('.sidebar-menu');
  if (!sidebar) return;

  const currentPage = getCurrentPage();
  const isAdmin = state.user?.role === 'admin';

  sidebar.innerHTML = `
    <li><a href="/" class="${currentPage === 'dashboard' ? 'active' : ''}">
      <i>📊</i> Dashboard
    </a></li>
    <li><a href="/pos.html" class="${currentPage === 'pos' ? 'active' : ''}">
      <i>🛒</i> POS
    </a></li>
    <li><a href="/inventory.html" class="${currentPage === 'inventory' ? 'active' : ''}">
      <i>💊</i> Inventory
    </a></li>
    ${isAdmin ? `
    <li><a href="/reports.html" class="${currentPage === 'reports' ? 'active' : ''}">
      <i>📈</i> Reports
    </a></li>
    <li><a href="/settings.html" class="${currentPage === 'settings' ? 'active' : ''}">
      <i>⚙️</i> Settings
    </a></li>
    ` : ''}
    <li><a href="#" onclick="logout()">
      <i>🚪</i> Logout
    </a></li>
  `;
}

// Dashboard Stats
async function loadDashboardStats() {
  try {
    const stats = await api('/reports/stats');
    
    document.getElementById('totalProducts').textContent = stats.products.total;
    document.getElementById('lowStock').textContent = stats.products.lowStock;
    document.getElementById('expiringSoon').textContent = stats.products.expiringSoon;
    document.getElementById('todaySales').textContent = stats.sales.today.count;
    document.getElementById('todayRevenue').textContent = formatCurrency(stats.sales.today.revenue);
    document.getElementById('monthRevenue').textContent = formatCurrency(stats.sales.month.revenue);

    // Load alerts
    const alerts = await api('/reports/alerts');
    displayAlerts(alerts);

    // Load recent sales
    const recentSales = await api('/reports/recent-sales?limit=5');
    displayRecentSales(recentSales);

  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
  }
}

function displayAlerts(alerts) {
  const alertsContainer = document.getElementById('alertsContainer');
  if (!alertsContainer) return;

  if (alerts.length === 0) {
    alertsContainer.innerHTML = '<p class="text-center" style="color: var(--text-secondary)">No alerts</p>';
    return;
  }

  alertsContainer.innerHTML = alerts.map(alert => `
    <div class="alert alert-${alert.type.includes('expired') ? 'error' : 'warning'}">
      <span>⚠️</span>
      <span>${alert.message}</span>
    </div>
  `).join('');
}

function displayRecentSales(sales) {
  const container = document.getElementById('recentSalesTable');
  if (!container) return;

  if (sales.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="text-center">No sales yet</td></tr>';
    return;
  }

  container.innerHTML = sales.map(sale => `
    <tr>
      <td>${sale.invoice_number}</td>
      <td>${sale.customer_name || 'Cash Customer'}</td>
      <td>${formatCurrency(sale.total_amount)}</td>
      <td><span class="badge badge-${sale.payment_status === 'paid' ? 'success' : 'warning'}">${sale.payment_status}</span></td>
      <td>${new Date(sale.created_at).toLocaleString()}</td>
    </tr>
  `).join('');
}

// POS Functions
let posProducts = [];

async function initPOS() {
  await loadPOSProducts();
  setupBarcodeScanner();
  setupPOSEvents();
}

async function loadPOSProducts() {
  try {
    posProducts = await api('/products?lowStock=false');
    renderPOSProducts(posProducts);
  } catch (error) {
    showNotification('Failed to load products', 'error');
  }
}

function renderPOSProducts(products) {
  const container = document.getElementById('posProductGrid');
  if (!container) return;

  container.innerHTML = products.map(product => `
    <div class="product-card" onclick="addToCart('${product.id}')">
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatCurrency(product.price)}</div>
      <div class="product-stock">Stock: ${product.stock}</div>
      ${product.barcode ? `<div style="font-size:10px;color:var(--text-secondary)">Barcode: ${product.barcode}</div>` : ''}
    </div>
  `).join('');
}

function setupBarcodeScanner() {
  const barcodeInput = document.getElementById('barcodeInput');
  if (!barcodeInput) return;

  barcodeInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const barcode = barcodeInput.value.trim();
      if (barcode) {
        await scanBarcode(barcode);
        barcodeInput.value = '';
      }
    }
  });

  // Camera scanner with html5-qrcode
  if (typeof Html5QrcodeScanner !== 'undefined') {
    const scanner = new Html5QrcodeScanner(
      "scanner",
      { fps: 10, qrbox: { width: 250, height: 250 } }
    );
    
    scanner.render(async (decodedText) => {
      await scanBarcode(decodedText);
      scanner.clear();
    });
  }
}

async function scanBarcode(barcode) {
  try {
    const product = await api(`/products/barcode/${encodeURIComponent(barcode)}`);
    addToCart(product.id);
    showNotification(`Added: ${product.name}`, 'success');
  } catch (error) {
    showNotification('Product not found', 'error');
  }
}

function setupPOSEvents() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', processCheckout);
  }

  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      state.cart = [];
      renderCart();
    });
  }
}

function addToCart(productId) {
  const product = posProducts.find(p => p.id === productId);
  if (!product) return;

  const existingItem = state.cart.find(item => item.productId === productId);
  
  if (existingItem) {
    if (existingItem.quantity < product.stock) {
      existingItem.quantity++;
    } else {
      showNotification('No more stock available', 'warning');
      return;
    }
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      barcode: product.barcode
    });
  }

  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '<p class="text-center" style="color:var(--text-secondary)">Cart is empty</p>';
    updateCartTotal();
    return;
  }

  container.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <div>
        <div style="font-weight:600">${item.name}</div>
        <div style="font-size:12px;color:var(--text-secondary)">${formatCurrency(item.price)} x ${item.quantity}</div>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn btn-secondary" onclick="updateCartItem(${index}, -1)" style="padding:5px 10px">-</button>
        <span>${item.quantity}</span>
        <button class="btn btn-secondary" onclick="updateCartItem(${index}, 1)" style="padding:5px 10px">+</button>
        <button class="btn btn-danger" onclick="removeFromCart(${index})" style="padding:5px 10px;margin-left:5px">×</button>
      </div>
    </div>
  `).join('');

  updateCartTotal();
}

function updateCartItem(index, change) {
  const item = state.cart[index];
  const product = posProducts.find(p => p.id === item.productId);
  
  const newQuantity = item.quantity + change;
  
  if (newQuantity <= 0) {
    removeFromCart(index);
    return;
  }
  
  if (newQuantity > product.stock) {
    showNotification('No more stock available', 'warning');
    return;
  }
  
  item.quantity = newQuantity;
  renderCart();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function updateCartTotal() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const subtotalEl = document.getElementById('cartSubtotal');
  const taxEl = document.getElementById('cartTax');
  const totalEl = document.getElementById('cartTotal');

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (taxEl) taxEl.textContent = formatCurrency(tax);
  if (totalEl) totalEl.textContent = formatCurrency(total);
}

async function processCheckout() {
  if (state.cart.length === 0) {
    showNotification('Cart is empty', 'warning');
    return;
  }

  const customerName = document.getElementById('customerName')?.value || '';
  const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';

  try {
    const result = await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        items: state.cart,
        customerName,
        paymentMethod
      })
    });

    showNotification('Sale completed!', 'success');
    
    // Print invoice
    printInvoice(result);
    
    // Clear cart and reload products
    state.cart = [];
    renderCart();
    await loadPOSProducts();
    
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function printInvoice(saleResult) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${saleResult.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .invoice { max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>ElSaada Pharmacy</h1>
          <p>Invoice: ${saleResult.invoiceNumber}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
        </div>
        <div class="details">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${state.cart.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.price * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="total">
          <p>Total: ${formatCurrency(saleResult.totalAmount)}</p>
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>ElSaada Pharmacy Management System</p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Inventory Functions
async function loadInventory() {
  await loadProductsTable();
  setupInventoryEvents();
}

async function loadProductsTable() {
  try {
    const products = await api('/products');
    renderProductsTable(products);
  } catch (error) {
    showNotification('Failed to load products', 'error');
  }
}

function renderProductsTable(products) {
  const container = document.getElementById('productsTable');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
    return;
  }

  container.innerHTML = products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.barcode || '-'}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>${product.stock}</td>
      <td>${product.expiry_date || '-'}</td>
      <td>
        <span class="badge ${product.stock <= product.min_stock ? 'badge-danger' : 'badge-success'}">
          ${product.stock <= product.min_stock ? 'Low Stock' : 'In Stock'}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary" onclick="editProduct('${product.id}')" style="padding:5px 10px">Edit</button>
      </td>
    </tr>
  `).join('');
}

function setupInventoryEvents() {
  const addProductBtn = document.getElementById('addProductBtn');
  const productForm = document.getElementById('productForm');
  const searchInput = document.getElementById('productSearch');

  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => openModal('productModal'));
  }

  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProduct();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterProducts(e.target.value);
    });
  }
}

async function saveProduct() {
  const id = document.getElementById('productId')?.value;
  const data = {
    name: document.getElementById('productName').value,
    barcode: document.getElementById('productBarcode').value,
    price: parseFloat(document.getElementById('productPrice').value),
    costPrice: parseFloat(document.getElementById('productCostPrice').value) || null,
    stock: parseInt(document.getElementById('productStock').value) || 0,
    minStock: parseInt(document.getElementById('productMinStock').value) || 5,
    expiryDate: document.getElementById('productExpiryDate').value || null,
    category: document.getElementById('productCategory').value || null
  };

  try {
    if (id) {
      await api(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showNotification('Product updated', 'success');
    } else {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showNotification('Product created', 'success');
    }

    closeModal('productModal');
    loadProductsTable();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function editProduct(id) {
  // Implementation for editing product
  showNotification('Edit functionality - implement as needed', 'warning');
}

function filterProducts(search) {
  const filtered = posProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );
  renderProductsTable(filtered);
}

// Reports Functions
async function loadReports() {
  await loadDashboardStats();
  await loadChart();
}

async function loadChart() {
  try {
    const chartData = await api('/reports/chart-data?days=7');
    renderChart(chartData);
  } catch (error) {
    console.error('Failed to load chart data:', error);
  }
}

function renderChart(data) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;

  // Simple bar chart using canvas
  const canvas = ctx.getContext('2d');
  const width = ctx.width;
  const height = ctx.height;

  canvas.clearRect(0, 0, width, height);

  const maxValue = Math.max(...data.map(d => d.revenue), 1);
  const barWidth = (width - 100) / data.length;
  const chartHeight = height - 50;

  data.forEach((item, index) => {
    const barHeight = (item.revenue / maxValue) * chartHeight;
    const x = 50 + index * barWidth;
    const y = chartHeight - barHeight + 25;

    // Draw bar
    canvas.fillStyle = '#00d4ff';
    canvas.fillRect(x, y, barWidth - 5, barHeight);

    // Draw label
    canvas.fillStyle = '#ffffff';
    canvas.font = '10px Arial';
    canvas.textAlign = 'center';
    canvas.fillText(item.date.slice(5), x + barWidth / 2, height - 5);

    // Draw value
    canvas.fillText(formatCurrency(item.revenue), x + barWidth / 2, y - 5);
  });
}

// Settings Functions
async function loadSettings() {
  await loadSubscriptionInfo();
  await loadEInvoiceSettings();
  setupSettingsEvents();
}

async function loadSubscriptionInfo() {
  try {
    const subscription = await api('/subscription');
    const container = document.getElementById('subscriptionInfo');
    if (!container) return;

    const daysRemaining = subscription.daysRemaining || 0;
    
    container.innerHTML = `
      <div class="stat-card ${subscription.plan_type === 'pro' ? 'success' : ''}">
        <div class="stat-label">Current Plan</div>
        <div class="stat-value">${subscription.plan_type.toUpperCase()}</div>
        <div class="stat-label">Days Remaining: ${daysRemaining}</div>
        <div class="stat-label">Ends: ${new Date(subscription.end_date).toLocaleDateString()}</div>
        ${subscription.plan_type === 'free' ? `
          <button class="btn btn-success mt-1" onclick="upgradeToPro()">Upgrade to Pro</button>
        ` : ''}
      </div>
    `;
  } catch (error) {
    console.error('Failed to load subscription:', error);
  }
}

async function loadEInvoiceSettings() {
  try {
    const credentials = await api('/einvoice/credentials');
    
    if (credentials) {
      document.getElementById('einvoiceClientId').value = credentials.client_id || '';
      document.getElementById('einvoiceTaxNumber').value = credentials.tax_number || '';
    }
  } catch (error) {
    console.error('Failed to load einvoice settings:', error);
  }
}

function setupSettingsEvents() {
  const einvoiceForm = document.getElementById('einvoiceForm');
  if (einvoiceForm) {
    einvoiceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEInvoiceSettings();
    });
  }
}

async function saveEInvoiceSettings() {
  const data = {
    clientId: document.getElementById('einvoiceClientId').value,
    clientSecret: document.getElementById('einvoiceClientSecret').value,
    taxNumber: document.getElementById('einvoiceTaxNumber').value
  };

  try {
    await api('/einvoice/auth', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    showNotification('E-Invoice settings saved', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function upgradeToPro() {
  if (!confirm('Upgrade to Pro plan?')) return;

  try {
    await api('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planType: 'pro', durationMonths: 1 })
    });
    showNotification('Upgraded to Pro!', 'success');
    loadSubscriptionInfo();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Utility Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'warning'}`;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  notification.innerHTML = `<span>${message}</span>`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function handleSubscriptionExpired() {
  showNotification('Your subscription has expired', 'error');
  setTimeout(() => {
    window.location.href = '/settings.html';
  }, 2000);
}

// Export for global access
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.logout = logout;
window.editProduct = editProduct;
window.upgradeToPro = upgradeToPro;
window.openModal = openModal;
window.closeModal = closeModal;
