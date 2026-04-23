const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new tenant and admin user
router.post('/register', async (req, res) => {
  try {
    const { tenantName, email, username, password, phone, address } = req.body;

    if (!tenantName || !email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if email or username exists
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const tenantId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Start transaction-like operations
    await db.run(
      `INSERT INTO tenants (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)`,
      [tenantId, tenantName, email, phone || '', address || '']
    );

    await db.run(
      `INSERT INTO users (id, tenant_id, username, password, email, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), tenantId, username, hashedPassword, email, 'admin']
    );

    // Create free subscription with 30-day trial
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    await db.run(
      `INSERT INTO subscriptions (id, tenant_id, plan_type, end_date) VALUES (?, ?, ?, ?)`,
      [uuidv4(), tenantId, 'free', endDate.toISOString()]
    );

    res.status(201).json({ 
      message: 'Registration successful',
      tenantId,
      username 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.get(
      'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.username = ? AND u.is_active = 1',
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check subscription
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE tenant_id = ? AND is_active = 1',
      [user.tenant_id]
    );

    const subscriptionActive = subscription && new Date(subscription.end_date) > new Date();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: user.tenant_name
      },
      subscription: subscription ? {
        planType: subscription.plan_type,
        endDate: subscription.end_date,
        isActive: subscriptionActive
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE tenant_id = ?',
      [req.tenantId]
    );

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        tenantId: req.tenantId,
        tenantName: req.user.tenant_name
      },
      subscription: subscription ? {
        planType: subscription.plan_type,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        isActive: subscription.is_active && new Date(subscription.end_date) > new Date()
      } : null
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email, phone, address } = req.body;

    await db.run(
      `UPDATE tenants SET email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?`,
      [email, phone, address, req.tenantId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
