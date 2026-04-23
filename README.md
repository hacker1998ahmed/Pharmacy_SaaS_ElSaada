# 🏥 ElSaada Pharmacy Management System

A complete, production-ready SaaS Pharmacy Management System with Egyptian eInvoicing integration.

## ✨ Features

### Core Features
- **Multi-tenant SaaS Architecture** - Each pharmacy has isolated data
- **Authentication & Authorization** - JWT-based with role management (Admin/Cashier)
- **Subscription System** - Free/Pro plans with trial periods
- **Product Management** - Full inventory with barcode support
- **Point of Sale (POS)** - Fast checkout with barcode scanner
- **Purchase Management** - Supplier orders and stock replenishment
- **Sales Management** - Complete transaction history
- **Reports & Analytics** - Dashboard with real-time statistics
- **Low Stock Alerts** - Automatic notifications
- **Expiry Tracking** - Product expiration monitoring

### Egyptian eInvoicing Integration
- Full integration with Egyptian Tax Authority (ETA) API
- Automatic invoice generation and submission
- Invoice status tracking
- PDF/XML invoice downloads

### Technical Features
- RESTful API with Express.js
- SQLite database (easily upgradable to PostgreSQL)
- Responsive UI (mobile-friendly)
- Barcode scanning via camera (html5-qrcode)
- Printable receipts
- Audit logging
- Rate limiting & security headers

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
cd /workspace
npm install
npm start
```

Server runs on `http://localhost:3000`

### Default Login
- **Username:** admin
- **Password:** admin123

## 🔌 API Endpoints

### Authentication
- POST `/api/auth/register` - Register new tenant/user
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user

### Products
- GET `/api/products` - List products
- GET `/api/products/barcode/:barcode` - Get by barcode
- POST `/api/products` - Create product
- PUT `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Delete product
- PATCH `/api/products/:id/stock` - Update stock

### Sales
- GET `/api/sales` - List sales
- POST `/api/sales` - Create sale (checkout)
- DELETE `/api/sales/:id` - Refund sale

### Purchases
- GET `/api/purchases` - List purchases
- POST `/api/purchases` - Create purchase
- PATCH `/api/purchases/:id/payment` - Update payment status

### Reports
- GET `/api/reports/stats` - Dashboard statistics
- GET `/api/reports/alerts` - System alerts

### Users
- GET `/api/users/profile` - Get profile
- POST `/api/users/change-password` - Change password
- GET `/api/users/users` - List users (admin)
- POST `/api/users/users` - Create user (admin)

## 📱 Mobile App

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap sync
```

## ☁️ Deployment

Set environment variables in `.env`:
```
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=production
```

Deploy to Render, Railway, or any VPS with PM2.

## 🔒 Security

- JWT authentication
- bcrypt password hashing
- Role-based access control
- CORS & Helmet
- Rate limiting

---

Built with ❤️ for Egyptian Pharmacies
