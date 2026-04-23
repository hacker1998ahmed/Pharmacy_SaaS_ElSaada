const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Total products
    const totalProducts = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = ?',
      [req.tenantId]
    );

    // Low stock products
    const lowStock = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND stock <= min_stock',
      [req.tenantId]
    );

    // Expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = ? AND expiry_date IS NOT NULL AND expiry_date <= ?',
      [req.tenantId, thirtyDaysFromNow.toISOString().split('T')[0]]
    );

    // Today's sales
    const todaySales = await db.get(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE tenant_id = ? AND DATE(created_at) = ?',
      [req.tenantId, today]
    );

    // Monthly sales
    const monthlySales = await db.get(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE tenant_id = ? AND created_at >= ?',
      [req.tenantId, monthStart]
    );

    // Total revenue (all time)
    const totalRevenue = await db.get(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE tenant_id = ? AND payment_status != ?',
      [req.tenantId, 'refunded']
    );

    res.json({
      products: {
        total: totalProducts.count,
        lowStock: lowStock.count,
        expiringSoon: expiringSoon.count
      },
      sales: {
        today: {
          count: todaySales.count,
          revenue: todaySales.total
        },
        month: {
          count: monthlySales.count,
          revenue: monthlySales.total
        },
        total: {
          revenue: totalRevenue.total
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get sales chart data (last 7 days or 30 days)
router.get('/chart-data', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sales = await db.all(
      `SELECT DATE(created_at) as date, 
              COUNT(*) as count, 
              COALESCE(SUM(total_amount), 0) as revenue
       FROM sales 
       WHERE tenant_id = ? AND created_at >= ? AND payment_status != ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [req.tenantId, startDate.toISOString(), 'refunded']
    );

    // Fill in missing dates
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = sales.find(s => s.date === dateStr);
      result.push({
        date: dateStr,
        count: existingData?.count || 0,
        revenue: existingData?.revenue || 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get recent sales
router.get('/recent-sales', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const sales = await db.all(
      `SELECT s.*, u.username as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.tenant_id = ?
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [req.tenantId, parseInt(limit)]
    );

    res.json(sales);
  } catch (error) {
    console.error('Get recent sales error:', error);
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
});

// Get alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = [];

    // Low stock alert
    const lowStockProducts = await db.all(
      'SELECT id, name, barcode, stock, min_stock FROM products WHERE tenant_id = ? AND stock <= min_stock',
      [req.tenantId]
    );

    if (lowStockProducts.length > 0) {
      alerts.push({
        type: 'low_stock',
        message: `${lowStockProducts.length} products have low stock`,
        items: lowStockProducts
      });
    }

    // Expiring products alert
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringProducts = await db.all(
      `SELECT id, name, barcode, expiry_date FROM products 
       WHERE tenant_id = ? AND expiry_date IS NOT NULL AND expiry_date <= ?`,
      [req.tenantId, thirtyDaysFromNow.toISOString().split('T')[0]]
    );

    if (expiringProducts.length > 0) {
      alerts.push({
        type: 'expiring_soon',
        message: `${expiringProducts.length} products expiring within 30 days`,
        items: expiringProducts
      });
    }

    // Subscription expiring alert
    const subscription = await db.get(
      'SELECT * FROM subscriptions WHERE tenant_id = ?',
      [req.tenantId]
    );

    if (subscription) {
      const daysRemaining = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 7 && daysRemaining > 0) {
        alerts.push({
          type: 'subscription_expiring',
          message: `Subscription expires in ${daysRemaining} days`,
          daysRemaining
        });
      } else if (daysRemaining <= 0) {
        alerts.push({
          type: 'subscription_expired',
          message: 'Subscription has expired',
          daysRemaining: 0
        });
      }
    }

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
