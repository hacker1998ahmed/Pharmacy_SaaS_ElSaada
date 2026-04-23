const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all purchases
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, supplierId, limit = 100 } = req.query;
    
    let sql = `SELECT p.*, s.name as supplier_name, u.username as created_by_name 
               FROM purchases p 
               LEFT JOIN suppliers s ON p.supplier_id = s.id 
               LEFT JOIN users u ON p.created_by = u.id 
               WHERE p.tenant_id = ?`;
    const params = [req.tenantId];

    if (startDate) {
      sql += ` AND p.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND p.created_at <= ?`;
      params.push(endDate);
    }

    if (supplierId) {
      sql += ` AND p.supplier_id = ?`;
      params.push(supplierId);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const purchases = await db.all(sql, params);
    
    // Get items for each purchase
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const items = await db.all(
          `SELECT pi.*, pr.name, pr.barcode 
           FROM purchase_items pi 
           JOIN products pr ON pi.product_id = pr.id 
           WHERE pi.purchase_id = ?`,
          [purchase.id]
        );
        return { ...purchase, items };
      })
    );
    
    res.json(purchasesWithItems);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get single purchase
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const purchase = await db.get(
      `SELECT p.*, s.name as supplier_name, u.username as created_by_name 
       FROM purchases p 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const items = await db.all(
      `SELECT pi.*, pr.name, pr.barcode 
       FROM purchase_items pi 
       JOIN products pr ON pi.product_id = pr.id 
       WHERE pi.purchase_id = ?`,
      [req.params.id]
    );

    res.json({ ...purchase, items });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Create purchase (adds stock to products)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const transactionDb = db.db;
  
  try {
    const { supplierId, items, paymentStatus, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Calculate total
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.unitPrice * item.quantity;
    });

    const purchaseId = uuidv4();

    await new Promise((resolve, reject) => {
      transactionDb.serialize(() => {
        transactionDb.run('BEGIN TRANSACTION');

        // Create purchase record
        transactionDb.run(
          `INSERT INTO purchases (id, tenant_id, supplier_id, total_amount, payment_status, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [purchaseId, req.tenantId, supplierId || null, totalAmount, paymentStatus || 'pending', notes || null, req.user.id],
          function(err) {
            if (err) {
              transactionDb.run('ROLLBACK');
              reject(err);
              return;
            }

            // Create purchase items and update stock
            let completed = 0;
            items.forEach((item) => {
              const itemId = uuidv4();
              const totalPrice = item.unitPrice * item.quantity;

              transactionDb.run(
                `INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price, total_price) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, purchaseId, item.productId, item.quantity, item.unitPrice, totalPrice],
                function(err) {
                  if (err) {
                    transactionDb.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  // Update product stock (add)
                  transactionDb.run(
                    `UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [item.quantity, item.productId],
                    function(err) {
                      if (err) {
                        transactionDb.run('ROLLBACK');
                        reject(err);
                        return;
                      }

                      completed++;
                      if (completed === items.length) {
                        transactionDb.run('COMMIT', (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                      }
                    }
                  );
                }
              );
            });

            if (items.length === 0) {
              transactionDb.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          }
        );
      });
    });

    res.status(201).json({
      message: 'Purchase created successfully',
      purchaseId,
      totalAmount
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// Update purchase payment status
router.patch('/:id/payment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const { id } = req.params;

    if (!['paid', 'pending', 'partial'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const purchase = await db.get('SELECT * FROM purchases WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    await db.run(
      `UPDATE purchases SET payment_status = ? WHERE id = ? AND tenant_id = ?`,
      [paymentStatus, id, req.tenantId]
    );

    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

module.exports = router;
