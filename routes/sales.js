const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all sales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    let sql = `SELECT s.*, u.username as created_by_name 
               FROM sales s 
               LEFT JOIN users u ON s.created_by = u.id 
               WHERE s.tenant_id = ?`;
    const params = [req.tenantId];

    if (startDate) {
      sql += ` AND s.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND s.created_at <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY s.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const sales = await db.all(sql, params);
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sale = await db.get(
      `SELECT s.*, u.username as created_by_name 
       FROM sales s 
       LEFT JOIN users u ON s.created_by = u.id 
       WHERE s.id = ? AND s.tenant_id = ?`,
      [req.params.id, req.tenantId]
    );

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.all(
      `SELECT si.*, p.name, p.barcode 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`,
      [req.params.id]
    );

    res.json({ ...sale, items });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Create sale (POS checkout)
router.post('/', authenticateToken, async (req, res) => {
  const transactionDb = db.db;
  
  try {
    const { items, customerName, customerTaxNumber, discount, paymentMethod, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    for (const item of items) {
      const product = await db.get('SELECT * FROM products WHERE id = ? AND tenant_id = ?', [item.productId, req.tenantId]);
      
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      subtotal += product.price * item.quantity;
    }

    const taxRate = 0.14; // 14% VAT for Egypt
    const taxAmount = (subtotal - (discount || 0)) * taxRate;
    const totalAmount = subtotal - (discount || 0) + taxAmount;

    // Generate invoice number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${dateStr}-${randomNum}`;

    const saleId = uuidv4();

    // Use serialize for transaction-like behavior
    await new Promise((resolve, reject) => {
      transactionDb.serialize(() => {
        transactionDb.run('BEGIN TRANSACTION');

        // Create sale record
        transactionDb.run(
          `INSERT INTO sales (id, tenant_id, invoice_number, customer_name, customer_tax_number, subtotal, discount, tax_amount, total_amount, payment_method, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, req.tenantId, invoiceNumber, customerName || null, customerTaxNumber || null, subtotal, discount || 0, taxAmount, totalAmount, paymentMethod || 'cash', notes || null, req.user.id],
          function(err) {
            if (err) {
              transactionDb.run('ROLLBACK');
              reject(err);
              return;
            }

            // Create sale items and update stock
            let completed = 0;
            items.forEach((item, index) => {
              const itemId = uuidv4();
              const totalPrice = item.price * item.quantity;

              transactionDb.run(
                `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, saleId, item.productId, item.quantity, item.price, totalPrice],
                function(err) {
                  if (err) {
                    transactionDb.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  // Update product stock
                  transactionDb.run(
                    `UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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
      message: 'Sale completed successfully',
      saleId,
      invoiceNumber,
      totalAmount
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// Delete/Refund sale
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sale = await db.get('SELECT * FROM sales WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.payment_status === 'refunded') {
      return res.status(400).json({ error: 'Sale already refunded' });
    }

    await new Promise((resolve, reject) => {
      db.db.serialize(() => {
        db.db.run('BEGIN TRANSACTION');

        // Restore stock
        db.db.all('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id], (err, items) => {
          if (err) {
            db.db.run('ROLLBACK');
            reject(err);
            return;
          }

          let completed = 0;
          items.forEach((item) => {
            db.db.run(
              `UPDATE products SET stock = stock + ? WHERE id = ?`,
              [item.quantity, item.product_id],
              (err) => {
                if (err) {
                  db.db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                completed++;
                if (completed === items.length) {
                  // Mark sale as refunded
                  db.db.run(
                    `UPDATE sales SET payment_status = 'refunded' WHERE id = ?`,
                    [req.params.id],
                    (err) => {
                      if (err) {
                        db.db.run('ROLLBACK');
                        reject(err);
                      } else {
                        db.db.run('COMMIT', (err) => {
                          if (err) reject(err);
                          else resolve();
                        });
                      }
                    }
                  );
                }
              }
            );
          });

          if (items.length === 0) {
            db.db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        });
      });
    });

    res.json({ message: 'Sale refunded successfully' });
  } catch (error) {
    console.error('Refund sale error:', error);
    res.status(500).json({ error: 'Failed to refund sale' });
  }
});

module.exports = router;
