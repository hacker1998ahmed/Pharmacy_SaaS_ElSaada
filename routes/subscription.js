const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get subscription info
router.get('/', authenticateToken, async (req, res) => {
  try {
    const subscription = await db.get(
      `SELECT s.*, t.name as tenant_name, t.email 
       FROM subscriptions s 
       JOIN tenants t ON s.tenant_id = t.id 
       WHERE s.tenant_id = ?`,
      [req.tenantId]
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const daysRemaining = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      ...subscription,
      daysRemaining,
      isActive: subscription.is_active && daysRemaining > 0
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Upgrade subscription
router.post('/upgrade', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { planType, durationMonths = 1 } = req.body;

    if (!['free', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const currentSub = await db.get('SELECT * FROM subscriptions WHERE tenant_id = ?', [req.tenantId]);

    if (!currentSub) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Calculate new end date
    let endDate = new Date();
    
    if (currentSub.end_date && new Date(currentSub.end_date) > new Date()) {
      // Extend from current end date
      endDate = new Date(currentSub.end_date);
    }
    
    // Add months
    endDate.setMonth(endDate.getMonth() + durationMonths);

    await db.run(
      `UPDATE subscriptions SET 
        plan_type = ?, 
        end_date = ?, 
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ?`,
      [planType, endDate.toISOString(), req.tenantId]
    );

    res.json({
      message: `Successfully upgraded to ${planType} plan`,
      endDate: endDate.toISOString(),
      planType
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Extend trial (admin only - for demo/testing)
router.post('/extend-trial', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const currentSub = await db.get('SELECT * FROM subscriptions WHERE tenant_id = ?', [req.tenantId]);

    if (!currentSub) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    await db.run(
      `UPDATE subscriptions SET end_date = ?, is_active = 1 WHERE tenant_id = ?`,
      [endDate.toISOString(), req.tenantId]
    );

    res.json({
      message: `Trial extended by ${days} days`,
      endDate: endDate.toISOString()
    });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({ error: 'Failed to extend trial' });
  }
});

module.exports = router;
