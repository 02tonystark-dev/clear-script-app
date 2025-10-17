import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, passwordHash]
      );
      const user = userResult.rows[0];

      // Insert profile
      await client.query(
        'INSERT INTO profiles (id, full_name) VALUES ($1, $2)',
        [user.id, full_name]
      );

      // Insert default role
      await client.query(
        'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
        [user.id, 'clerk']
      );

      await client.query('COMMIT');

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: full_name
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get user
    const result = await pool.query(
      'SELECT u.id, u.email, u.password_hash FROM users u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get profile
    const profileResult = await pool.query(
      'SELECT full_name, phone FROM profiles WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: profileResult.rows[0]?.full_name || 'User'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, p.full_name, p.phone 
       FROM users u 
       LEFT JOIN profiles p ON u.id = p.id 
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
