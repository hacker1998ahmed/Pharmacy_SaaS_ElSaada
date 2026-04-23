const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../database/db');
const { authenticateToken, requireProPlan } = require('../middleware/auth');

const router = express.Router();

// Get eInvoice credentials
router.get('/credentials', authenticateToken, async (req, res) => {
  try {
    const credentials = await db.get(
      'SELECT client_id, tax_number, access_token, token_expires_at FROM einvoice_credentials WHERE tenant_id = ?',
      [req.tenantId]
    );

    res.json(credentials || null);
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

// Save/Update eInvoice credentials and get access token
router.post('/auth', authenticateToken, requireProPlan, async (req, res) => {
  try {
    const { clientId, clientSecret, taxNumber } = req.body;

    if (!clientId || !clientSecret || !taxNumber) {
      return res.status(400).json({ error: 'Client ID, Client Secret, and Tax Number are required' });
    }

    // Try to get access token from Egyptian E-Invoice API
    // Note: This is a demo implementation - actual API endpoint may vary
    let accessToken = null;
    let tokenExpiresAt = null;

    try {
      const response = await axios.post(
        process.env.EINVOICE_API_URL + '/connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      accessToken = response.data.access_token;
      tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000).toISOString();
    } catch (apiError) {
      console.log('E-Invoice API auth failed (demo mode):', apiError.message);
      // In demo mode, we still save credentials but without token
    }

    // Check if credentials exist
    const existing = await db.get('SELECT id FROM einvoice_credentials WHERE tenant_id = ?', [req.tenantId]);

    if (existing) {
      await db.run(
        `UPDATE einvoice_credentials SET 
          client_id = ?, 
          client_secret = ?, 
          tax_number = ?,
          access_token = COALESCE(?, access_token),
          token_expires_at = COALESCE(?, token_expires_at),
          updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = ?`,
        [clientId, clientSecret, taxNumber, accessToken, tokenExpiresAt, req.tenantId]
      );
    } else {
      await db.run(
        `INSERT INTO einvoice_credentials (id, tenant_id, client_id, client_secret, tax_number, access_token, token_expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), req.tenantId, clientId, clientSecret, taxNumber, accessToken, tokenExpiresAt]
      );
    }

    res.json({
      message: 'E-Invoice credentials saved successfully',
      hasAccessToken: !!accessToken
    });
  } catch (error) {
    console.error('Save credentials error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

// Submit invoice to Egyptian E-Invoice system
router.post('/submit', authenticateToken, requireProPlan, async (req, res) => {
  try {
    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({ error: 'Sale ID is required' });
    }

    // Get sale with items
    const sale = await db.get('SELECT * FROM sales WHERE id = ? AND tenant_id = ?', [saleId, req.tenantId]);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.einvoice_submitted) {
      return res.status(400).json({ error: 'Invoice already submitted' });
    }

    const items = await db.all(
      `SELECT si.*, p.name, p.barcode, p.stock 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       WHERE si.sale_id = ?`,
      [saleId]
    );

    // Get credentials
    const credentials = await db.get(
      'SELECT * FROM einvoice_credentials WHERE tenant_id = ?',
      [req.tenantId]
    );

    if (!credentials || !credentials.access_token) {
      return res.status(400).json({ 
        error: 'E-Invoice credentials not configured. Please configure in settings.',
        needsConfig: true 
      });
    }

    // Generate Egyptian E-Invoice JSON format
    const einvoicePayload = generateEInvoicePayload(sale, items, credentials);

    // Submit to Egyptian Tax Authority API
    try {
      const response = await axios.post(
        process.env.EINVOICE_API_URL + '/api/invoices',
        einvoicePayload,
        {
          headers: {
            'Authorization': `Bearer ${credentials.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const einvoiceUuid = response.data.uuid || response.data.invoiceUUID;

      // Update sale record
      await db.run(
        `UPDATE sales SET 
          einvoice_submitted = 1, 
          einvoice_status = 'submitted',
          einvoice_uuid = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [einvoiceUuid, saleId]
      );

      res.json({
        message: 'Invoice submitted successfully',
        einvoiceUuid,
        status: response.data.status || 'submitted'
      });
    } catch (apiError) {
      console.error('E-Invoice API submission error:', apiError.response?.data || apiError.message);
      
      // Still save locally for later retry
      await db.run(
        `UPDATE sales SET einvoice_status = 'failed' WHERE id = ?`,
        [saleId]
      );

      res.status(500).json({
        error: 'Failed to submit to E-Invoice API',
        details: apiError.response?.data || apiError.message
      });
    }
  } catch (error) {
    console.error('Submit invoice error:', error);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
});

// Get invoice status
router.get('/status/:saleId', authenticateToken, async (req, res) => {
  try {
    const sale = await db.get(
      'SELECT einvoice_submitted, einvoice_status, einvoice_uuid, created_at FROM sales WHERE id = ? AND tenant_id = ?',
      [req.params.saleId, req.tenantId]
    );

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // If submitted, check status from API
    if (sale.einvoice_submitted && sale.einvoice_uuid) {
      const credentials = await db.get(
        'SELECT access_token FROM einvoice_credentials WHERE tenant_id = ?',
        [req.tenantId]
      );

      if (credentials?.access_token) {
        try {
          const response = await axios.get(
            `${process.env.EINVOICE_API_URL}/api/invoices/${sale.einvoice_uuid}`,
            {
              headers: { 'Authorization': `Bearer ${credentials.access_token}` }
            }
          );

          res.json({
            submitted: true,
            einvoiceUuid: sale.einvoice_uuid,
            status: response.data.status || sale.einvoice_status,
            apiStatus: response.data
          });
          return;
        } catch (apiError) {
          console.log('Status check failed:', apiError.message);
        }
      }
    }

    res.json({
      submitted: !!sale.einvoice_submitted,
      status: sale.einvoice_status,
      einvoiceUuid: sale.einvoice_uuid
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get invoice status' });
  }
});

// Helper function to generate Egyptian E-Invoice payload
function generateEInvoicePayload(sale, items, credentials) {
  const invoiceTypeCode = sale.payment_status === 'refunded' ? '388' : '381'; // 381 = Invoice, 388 = Credit Note

  return {
    invoiceTypeCode: invoiceTypeCode,
    invoiceNumber: sale.invoice_number,
    issueDate: sale.created_at.split('T')[0],
    issueTime: sale.created_at.split('T')[1]?.split('.')[0] || '00:00:00',
    deliveryDate: sale.created_at.split('T')[0],
    
    taxpayer: {
      id: credentials.tax_number,
      name: 'ElSaada Pharmacy' // Should be from tenant data
    },
    
    receiver: {
      id: sale.customer_tax_number || '000000000',
      name: sale.customer_name || 'Cash Customer',
      type: 'P' // Person
    },
    
    currency: 'EGP',
    exchangeRate: 1,
    
    invoiceLines: items.map((item, index) => ({
      sequenceNumber: index + 1,
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      taxableValue: item.total_price,
      taxType: 'T', // Table tax
      taxSubType: 'VAT',
      taxAmount: item.total_price * 0.14,
      totalAmount: item.total_price * 1.14
    })),
    
    taxTotalAmounts: {
      taxTotalAmount: [{
        taxType: 'T',
        amount: sale.tax_amount
      }]
    },
    
    payableAmount: sale.total_amount,
    
    paymentMeans: [{
      paymentTypeCode: '10', // Cash
      instruction: sale.payment_method
    }]
  };
}

module.exports = router;
