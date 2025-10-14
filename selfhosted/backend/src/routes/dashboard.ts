import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get dashboard statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM medicines) as total_medicines,
        (SELECT COUNT(*) FROM medicines WHERE quantity_in_stock <= reorder_level) as low_stock_count,
        (SELECT COALESCE(SUM(total_price), 0) FROM sales WHERE sale_date >= CURRENT_DATE) as today_sales,
        (SELECT COUNT(*) FROM sales WHERE sale_date >= CURRENT_DATE) as today_transactions,
        (SELECT COALESCE(SUM(quantity_in_stock * unit_price), 0) FROM medicines) as total_inventory_value
    `);
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent sales
router.get('/recent-sales', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as medicine_name
      FROM sales s
      LEFT JOIN medicines m ON s.medicine_id = m.id
      ORDER BY s.sale_date DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get recent sales error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM medicines
      WHERE quantity_in_stock <= reorder_level
      ORDER BY quantity_in_stock ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get low stock error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
