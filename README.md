# 🏥 ElSaada Pharmacy Management System

A complete, production-ready SaaS Pharmacy Management System with Egyptian E-Invoice integration.

## ✨ Features

### Core Features
- **Multi-tenant SaaS Architecture** - Each pharmacy is isolated
- **Authentication & Authorization** - JWT-based with Admin/Cashier roles
- **Subscription System** - Free/Pro plans with trial periods
- **Product Management** - Full inventory with barcode support
- **POS System** - Point of Sale with cart management
- **Barcode Scanning** - Manual input + Camera scanner (html5-qrcode)
- **Sales Management** - Complete transaction tracking
- **Reports Dashboard** - Sales analytics, low stock alerts, expiry alerts
- **Egyptian E-Invoice** - ETA API integration ready

### Tech Stack
- **Backend:** Node.js + Express
- **Database:** SQLite (upgradeable to PostgreSQL)
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Mobile:** Capacitor-ready for Android APK

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` file:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
DATABASE_PATH=./database/pharmacy.db
```

### 3. Run Server
```bash
npm start
```

### 4. Access Application
Open browser: `http://localhost:3000`

**Default Login:**
- Username: `admin`
- Password: `admin123`

## 📁 Project Structure

```
/workspace
├── server.js                 # Main Express server
├── package.json              # Dependencies
├── .env                      # Environment variables
├── capacitor.config.json     # Mobile app config
│
├── database/
│   └── db.js                 # SQLite database setup
│
├── middleware/
│   └── auth.js               # JWT & subscription middleware
│
├── routes/
│   ├── auth.js               # Authentication endpoints
│   ├── products.js           # Product CRUD
│   ├── sales.js              # Sales/POS endpoints
│   ├── einvoice.js           # Egyptian E-Invoice API
│   ├── subscription.js       # Subscription management
│   ├── reports.js            # Dashboard & analytics
│   └── suppliers.js          # Supplier management
│
└── public/
    ├── index.html            # Dashboard
    ├── login.html            # Login page
    ├── register.html         # Registration page
    ├── pos.html              # Point of Sale
    ├── inventory.html        # Inventory management
    ├── reports.html          # Reports & analytics
    ├── settings.html         # Settings page
    ├── style.css             # Dark neon theme
    └── app.js                # Frontend JavaScript
```

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register      - Register new tenant
POST /api/auth/login         - Login
GET  /api/auth/me            - Get current user
```

### Products
```
GET    /api/products         - List products
GET    /api/products/:id     - Get product
POST   /api/products         - Create product
PUT    /api/products/:id     - Update product
DELETE /api/products/:id     - Delete product
GET    /api/products/barcode/:barcode - Get by barcode
```

### Sales
```
GET    /api/sales            - List sales
POST   /api/sales            - Create sale (checkout)
GET    /api/sales/:id        - Get sale details
DELETE /api/sales/:id        - Refund sale
```

### E-Invoice (Egyptian Tax Authority)
```
GET    /api/einvoice/credentials  - Get credentials
POST   /api/einvoice/auth        - Save credentials & get token
POST   /api/einvoice/submit      - Submit invoice
GET    /api/einvoice/status/:id  - Check invoice status
```

### Subscription
```
GET    /api/subscription         - Get subscription info
POST   /api/subscription/upgrade - Upgrade plan
```

### Reports
```
GET /api/reports/stats       - Dashboard statistics
GET /api/reports/chart-data  - Sales chart data
GET /api/reports/alerts      - System alerts
GET /api/reports/recent-sales - Recent transactions
```

## 📱 Mobile App (APK)

### Build Android App with Capacitor

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli --save
npm install @capacitor/android --save

# Initialize Capacitor (if not done)
npx cap init

# Add Android platform
npx cap add android

# Build web assets
npm run build

# Sync with native project
npx cap sync

# Open in Android Studio
npx cap open android
```

### In Android Studio:
1. Build → Build Bundle(s) / APK(s) → Build APK
2. APK will be in: `android/app/build/outputs/apk/`

## ☁️ Deployment

### Deploy to Render
1. Connect GitHub repository
2. Set environment variables
3. Build Command: `npm install`
4. Start Command: `npm start`

### Deploy to Railway
1. Import from GitHub
2. Add environment variables
3. Auto-deploys on push

### Deploy to VPS (Ubuntu)
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2

# Clone and run
git clone <repo>
cd ElSaada-Pharmacy
npm install --production
pm2 start server.js --name elsaada-pharmacy
pm2 startup
pm2 save
```

## 🔒 Security Features

- JWT authentication
- Password hashing (bcrypt)
- Role-based access control
- Subscription validation middleware
- CORS protection
- Rate limiting
- Helmet security headers

## 💎 Subscription Plans

### Free Plan
- Basic POS functionality
- Up to 100 products
- Basic reports
- 30-day trial

### Pro Plan
- Unlimited products
- Advanced analytics
- E-Invoice integration
- Multi-user support

---

**Built with ❤️ for Egyptian Pharmacies**
