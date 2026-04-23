const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all products (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, lowStock, expiring } = req.query;
    
    let sql = `SELECT * FROM products WHERE tenant_id = ?`;
    const params = [req.tenantId];

    if (search) {
      sql += ` AND (name LIKE ? OR barcode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (lowStock === 'true') {
      sql += ` AND stock <= min_stock`;
    }

    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      sql += ` AND expiry_date IS NOT NULL AND expiry_date <= ?`;
      params.push(thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    sql += ` ORDER BY name ASC`;

    const products = await db.all(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await db.get(
      'SELECT * FROM products WHERE tenant_id = ? AND barcode = ?',
      [req.tenantId, req.params.barcode]
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, minStock, expiryDate, category, supplierId } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Check if barcode already exists for this tenant
    if (barcode) {
      const existing = await db.get(
        'SELECT * FROM products WHERE tenant_id = ? AND barcode = ?',
        [req.tenantId, barcode]
      );
      if (existing) {
        return res.status(409).json({ error: 'Barcode already exists' });
      }
    }

    const productId = uuidv4();
    await db.run(
      `INSERT INTO products (id, tenant_id, name, barcode, price, cost_price, stock, min_stock, expiry_date, category, supplier_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, req.tenantId, name, barcode || null, price, costPrice || null, stock || 0, minStock || 5, expiryDate || null, category || null, supplierId || null]
    );

    res.status(201).json({ message: 'Product created successfully', id: productId });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, barcode, price, costPrice, stock, minStock, expiryDate, category, supplierId } = req.body;
    const { id } = req.params;

    // Verify product belongs to tenant
    const product = await db.get('SELECT * FROM products WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.run(
      `UPDATE products SET 
        name = COALESCE(?, name),
        barcode = COALESCE(?, barcode),
        price = COALESCE(?, price),
        cost_price = COALESCE(?, cost_price),
        stock = COALESCE(?, stock),
        min_stock = COALESCE(?, min_stock),
        expiry_date = COALESCE(?, expiry_date),
        category = COALESCE(?, category),
        supplier_id = COALESCE(?, supplier_id),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND tenant_id = ?`,
      [name, barcode, price, costPrice, stock, minStock, expiryDate, category, supplierId, id, req.tenantId]
    );

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.get('SELECT * FROM products WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.run('DELETE FROM products WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update stock
router.patch('/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body; // operation: 'add' or 'set'

    const product = await db.get('SELECT * FROM products WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let newStock;
    if (operation === 'set') {
      newStock = parseInt(quantity);
    } else {
      newStock = product.stock + parseInt(quantity);
    }

    await db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, id]);

    res.json({ message: 'Stock updated', newStock });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

module.exports = router;
