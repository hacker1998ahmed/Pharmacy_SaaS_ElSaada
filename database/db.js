const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'pharmacy.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Tenants table (for multi-tenant SaaS)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        tax_number TEXT,
        address TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('Error creating tenants table:', err);
    });

    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT CHECK(role IN ('admin', 'cashier')) DEFAULT 'cashier',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
    });

    // Subscriptions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT UNIQUE NOT NULL,
        plan_type TEXT CHECK(plan_type IN ('free', 'pro')) DEFAULT 'free',
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `, (err) => {
      if (err) console.error('Error creating subscriptions table:', err);
    });

    // Products table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        price REAL NOT NULL,
        cost_price REAL,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        expiry_date DATE,
        category TEXT,
        supplier_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `, (err) => {
      if (err) console.error('Error creating products table:', err);
    });

    // Suppliers table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        tax_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `, (err) => {
      if (err) console.error('Error creating suppliers table:', err);
    });

    // Purchases table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        supplier_id TEXT,
        total_amount REAL NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('paid', 'pending', 'partial')) DEFAULT 'pending',
        notes TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Error creating purchases table:', err);
    });

    // Purchase items table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `, (err) => {
      if (err) console.error('Error creating purchase_items table:', err);
    });

    // Sales table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_tax_number TEXT,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'mixed')) DEFAULT 'cash',
        payment_status TEXT CHECK(payment_status IN ('paid', 'pending', 'refunded')) DEFAULT 'paid',
        notes TEXT,
        created_by TEXT,
        einvoice_submitted INTEGER DEFAULT 0,
        einvoice_status TEXT,
        einvoice_uuid TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Error creating sales table:', err);
    });

    // Sale items table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `, (err) => {
      if (err) console.error('Error creating sale_items table:', err);
    });

    // E-Invoice credentials table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS einvoice_credentials (
        id TEXT PRIMARY KEY,
        tenant_id TEXT UNIQUE NOT NULL,
        client_id TEXT,
        client_secret TEXT,
        tax_number TEXT,
        access_token TEXT,
        token_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `, (err) => {
      if (err) console.error('Error creating einvoice_credentials table:', err);
    });

    // Audit log table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Error creating audit_logs table:', err);
    });

    console.log('Database tables initialized');
    
    // Wait a bit for tables to be created, then create default tenant
    setTimeout(() => this.createDefaultTenant(), 500);
  }

  createDefaultTenant() {
    const defaultTenantId = uuidv4();
    
    this.db.get('SELECT COUNT(*) as count FROM tenants', [], (err, row) => {
      if (err) {
        console.error('Error checking tenants:', err);
        return;
      }
      
      if (!row || row.count === 0) {
        this.db.run(
          `INSERT INTO tenants (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)`,
          [defaultTenantId, 'ElSaada Pharmacy - Demo', 'demo@elsaada.com', '01000000000', 'Cairo, Egypt'],
          (err) => {
            if (!err) {
              // Create default admin user
              const hashedPassword = bcrypt.hashSync('admin123', 10);
              this.db.run(
                `INSERT INTO users (id, tenant_id, username, password, email, role) VALUES (?, ?, ?, ?, ?, ?)`,
                [uuidv4(), defaultTenantId, 'admin', hashedPassword, 'admin@elsaada.com', 'admin']
              );
              
              // Create free subscription with 30-day trial
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + 30);
              this.db.run(
                `INSERT INTO subscriptions (id, tenant_id, plan_type, end_date) VALUES (?, ?, ?, ?)`,
                [uuidv4(), defaultTenantId, 'free', endDate.toISOString()]
              );
              
              console.log('Default tenant and admin user created');
              console.log('Login: admin / admin123');
            }
          }
        );
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
