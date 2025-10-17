import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [medicinesCount, salesCount, revenueResult, lowStockCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM medicines'),
      pool.query('SELECT COUNT(*) FROM sales'),
      pool.query('SELECT COALESCE(SUM(total_price), 0) as total FROM sales'),
      pool.query('SELECT COUNT(*) FROM medicines WHERE quantity_in_stock <= reorder_level')
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todaySalesResult = await pool.query(
      `SELECT COALESCE(SUM(total_price), 0) as total 
       FROM sales 
       WHERE DATE(sale_date) = $1`,
      [today]
    );

    res.json({
      total_medicines: parseInt(medicinesCount.rows[0].count),
      total_sales: parseInt(salesCount.rows[0].count),
      total_revenue: parseFloat(revenueResult.rows[0].total),
      today_sales: parseFloat(todaySalesResult.rows[0].total),
      low_stock_count: parseInt(lowStockCount.rows[0].count)
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
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

// Get low stock medicines
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
