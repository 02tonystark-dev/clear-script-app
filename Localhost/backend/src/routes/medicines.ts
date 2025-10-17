import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all medicines
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, mc.name as category_name 
      FROM medicines m 
      LEFT JOIN medicine_categories mc ON m.category_id = mc.id 
      ORDER BY m.name ASC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get medicines error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single medicine
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create medicine
router.post('/', async (req: AuthRequest, res) => {
  const {
    name,
    generic_name,
    description,
    manufacturer,
    category_id,
    batch_number,
    expiry_date,
    quantity_in_stock,
    reorder_level,
    unit_price
  } = req.body;

  if (!name || unit_price === undefined) {
    return res.status(400).json({ error: 'Name and unit price are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO medicines 
       (name, generic_name, description, manufacturer, category_id, batch_number, 
        expiry_date, quantity_in_stock, reorder_level, unit_price) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [name, generic_name, description, manufacturer, category_id, batch_number,
       expiry_date, quantity_in_stock || 0, reorder_level || 10, unit_price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update medicine
router.patch('/:id', async (req: AuthRequest, res) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(req.body)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE medicines SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete medicine
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('DELETE FROM medicines WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ message: 'Medicine deleted successfully' });
  } catch (error: any) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
