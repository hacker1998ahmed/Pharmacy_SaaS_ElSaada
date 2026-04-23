const jwt = require('jsonwebtoken');
const db = require('../database/db');

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await db.get(
      'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = ? AND u.is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    // Check subscription status
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE tenant_id = ? AND is_active = 1',
      [user.tenant_id]
    );

    if (!subscription || new Date(subscription.end_date) < new Date()) {
      return res.status(403).json({ 
        error: 'Subscription expired or not found',
        subscriptionExpired: true 
      });
    }

    req.user = user;
    req.tenantId = user.tenant_id;
    req.subscription = subscription;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin Role Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Pro Plan Middleware
const requireProPlan = (req, res, next) => {
  if (req.subscription.plan_type !== 'pro') {
    return res.status(403).json({ 
      error: 'This feature requires a Pro plan',
      upgradeRequired: true 
    });
  }
  next();
};

// Audit Log Middleware
const logAudit = async (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const { v4: uuidv4 } = require('uuid');
    
    db.run(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, details, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        req.tenantId,
        req.user?.id,
        `${req.method} ${req.path}`,
        req.params.entityType || 'general',
        req.params.id || null,
        JSON.stringify(data).substring(0, 500),
        req.ip
      ]
    ).catch(console.error);

    return originalJson(data);
  };
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireProPlan,
  logAudit
};
