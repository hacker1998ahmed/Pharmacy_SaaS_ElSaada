const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await db.all(
      'SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC',
      [req.tenantId]
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Create supplier
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, taxNumber } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const supplierId = uuidv4();
    await db.run(
      `INSERT INTO suppliers (id, tenant_id, name, contact_person, phone, email, address, tax_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplierId, req.tenantId, name, contactPerson || null, phone || null, email || null, address || null, taxNumber || null]
    );

    res.status(201).json({ message: 'Supplier created successfully', id: supplierId });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, taxNumber } = req.body;

    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await db.run(
      `UPDATE suppliers SET 
        name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        tax_number = COALESCE(?, tax_number)
       WHERE id = ? AND tenant_id = ?`,
      [name, contactPerson, phone, email, address, taxNumber, id, req.tenantId]
    );

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await db.run('DELETE FROM suppliers WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
