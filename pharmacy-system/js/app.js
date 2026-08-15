// التطبيق الرئيسي - Pharmacy Management System

// البيانات الافتراضية
const defaultData = {
    products: [
        {
            id: 1,
            name: 'باراسيتامول 500mg',
            category: 'مسكنات',
            cost: 5.00,
            price: 10.00,
            quantity: 100,
            minStock: 20,
            expiry: '2025-12-31',
            barcode: '1234567890',
            description: 'مسكن للآلام وخافض للحرارة'
        },
        {
            id: 2,
            name: 'أيبوبروفين 400mg',
            category: 'مسكنات',
            cost: 7.00,
            price: 15.00,
            quantity: 80,
            minStock: 20,
            expiry: '2025-11-30',
            barcode: '1234567891',
            description: 'مضاد للالتهابات ومسكن'
        },
        {
            id: 3,
            name: 'فيتامين C 1000mg',
            category: 'فيتامينات',
            cost: 15.00,
            price: 30.00,
            quantity: 50,
            minStock: 15,
            expiry: '2026-06-30',
            barcode: '1234567892',
            description: 'مكمل غذائي من فيتامين سي'
        },
        {
            id: 4,
            name: 'مضاد حيوي أموكسيسيلين',
            category: 'مضادات حيوية',
            cost: 20.00,
            price: 40.00,
            quantity: 60,
            minStock: 15,
            expiry: '2025-08-31',
            barcode: '1234567893',
            description: 'مضاد حيوي واسع الطيف'
        },
        {
            id: 5,
            name: 'شراب كحة',
            category: 'أدوية برد',
            cost: 12.00,
            price: 25.00,
            quantity: 40,
            minStock: 10,
            expiry: '2025-10-31',
            barcode: '1234567894',
            description: 'شراب مهدئ للكحة'
        }
    ],
    customers: [
        {
            id: 1,
            name: 'أحمد محمد',
            phone: '0501234567',
            email: 'ahmed@email.com',
            visits: 5,
            totalPurchases: 250.00,
            registeredAt: '2024-01-15'
        },
        {
            id: 2,
            name: 'فاطمة علي',
            phone: '0502345678',
            email: 'fatima@email.com',
            visits: 3,
            totalPurchases: 180.00,
            registeredAt: '2024-02-20'
        }
    ],
    sales: [],
    users: [
        {
            id: 1,
            username: 'admin',
            password: 'admin123',
            name: 'مدير النظام',
            role: 'admin'
        }
    ],
    settings: {
        pharmacyName: 'صيدلية الشفاء',
        address: 'شارع الملك فهد، الرياض',
        phone: '0112345678'
    },
    categories: ['مسكنات', 'فيتامينات', 'مضادات حيوية', 'أدوية برد', 'أدوية قلب', 'مستلزمات طبية']
};

// تهيئة البيانات
let appData = {};

function initializeData() {
    const stored = localStorage.getItem('pharmacyData');
    if (stored) {
        appData = JSON.parse(stored);
    } else {
        appData = JSON.parse(JSON.stringify(defaultData));
        saveData();
    }
}

function saveData() {
    localStorage.setItem('pharmacyData', JSON.stringify(appData));
}

// تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = appData.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        showMainSystem();
        showToast('تم تسجيل الدخول بنجاح', 'success');
    } else {
        showToast('بيانات الدخول غير صحيحة', 'error');
    }
});

function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        showMainSystem();
    }
}

function showMainSystem() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'flex';
    loadDashboard();
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

document.getElementById('logoutBtn').addEventListener('click', logout);

// التنقل بين الأقسام
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        document.getElementById('pageTitle').textContent = this.querySelector('span').textContent;
        
        // تحميل القسم
        loadSection(section);
    });
});

function loadSection(section) {
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'pos':
            loadPOS();
            break;
        case 'sales':
            loadSales();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'reports':
            loadReports();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// عرض الإشعارات
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// النوافذ المنبثقة
const modalOverlay = document.getElementById('modalOverlay');

function openModal(modalId) {
    document.getElementById(modalId).parentElement.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
});

modalOverlay.addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// تصدير واستيراد البيانات
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('تم تصدير البيانات بنجاح', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                appData = JSON.parse(e.target.result);
                saveData();
                showToast('تم استيراد البيانات بنجاح', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                showToast('ملف البيانات غير صالح', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
        localStorage.removeItem('pharmacyData');
        location.reload();
    }
}

// تهيئة التطبيق
initializeData();
checkAuth();

// تحديث بيانات المستخدم في الواجهة
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (currentUser) {
    document.getElementById('userName').textContent = currentUser.name;
}
