import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all sales
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as medicine_name, p.full_name as sold_by_name
      FROM sales s
      LEFT JOIN medicines m ON s.medicine_id = m.id
      LEFT JOIN profiles p ON s.sold_by = p.id
      ORDER BY s.sale_date DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create sale
router.post('/', async (req: AuthRequest, res) => {
  const {
    medicine_id,
    quantity,
    unit_price,
    total_price,
    customer_name,
    customer_phone,
    notes
  } = req.body;

  if (!medicine_id || !quantity || !unit_price || !total_price) {
    return res.status(400).json({ error: 'Medicine, quantity, and prices are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check stock availability
    const stockResult = await client.query(
      'SELECT quantity_in_stock FROM medicines WHERE id = $1',
      [medicine_id]
    );

    if (stockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Medicine not found' });
    }

    if (stockResult.rows[0].quantity_in_stock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Create sale
    const saleResult = await client.query(
      `INSERT INTO sales (
        medicine_id, quantity, unit_price, total_price,
        customer_name, customer_phone, notes, sold_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        medicine_id, quantity, unit_price, total_price,
        customer_name, customer_phone, notes, req.user!.userId
      ]
    );

    // Update stock
    await client.query(
      'UPDATE medicines SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2',
      [quantity, medicine_id]
    );

    await client.query('COMMIT');
    res.status(201).json(saleResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
