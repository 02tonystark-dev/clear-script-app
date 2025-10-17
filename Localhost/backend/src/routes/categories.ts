import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all categories
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM medicine_categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/', async (req: AuthRequest, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO medicine_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
