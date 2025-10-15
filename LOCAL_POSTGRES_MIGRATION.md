# Migrating from Supabase to Local PostgreSQL

This guide will help you convert your current Supabase-based application to use a local PostgreSQL database on Ubuntu.

## Architecture Overview

**Current Setup:** Frontend → Supabase Client → Supabase Cloud
**New Setup:** Frontend → Express API → Local PostgreSQL

## Part 1: PostgreSQL Installation (Ubuntu)

### Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL and contrib package
sudo apt install postgresql postgresql-contrib -y

# Verify installation
psql --version
```

### Step 2: Start PostgreSQL Service

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Step 3: Create Database and User

```bash
# Switch to postgres user
sudo -i -u postgres

# Enter PostgreSQL terminal
psql
```

**In PostgreSQL prompt:**

```sql
-- Create database
CREATE DATABASE pharmacare;

-- Create user with password
CREATE USER pharmacare_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;

-- Connect to database
\c pharmacare

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO pharmacare_user;

-- Grant default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pharmacare_user;

-- Exit
\q
```

```bash
# Exit postgres user
exit
```

### Step 4: Run Schema

Create a file `local_schema.sql` with the following content:

```sql
-- Create enums
CREATE TYPE app_role AS ENUM ('admin', 'pharmacist', 'clerk');

-- Users table (replacing Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Medicine categories table
CREATE TABLE medicine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicines table
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  description TEXT,
  manufacturer TEXT,
  category_id UUID REFERENCES medicine_categories(id),
  batch_number TEXT,
  expiry_date DATE,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES medicines(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  sold_by UUID REFERENCES users(id),
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medicines_updated_at
  BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_sales_medicine ON sales(medicine_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

Run the schema:

```bash
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -f local_schema.sql
```

### Step 5: Load Seed Data

Create `local_seed.sql`:

```sql
-- Insert medicine categories
INSERT INTO medicine_categories (name, description) VALUES
  ('Antibiotics', 'Medications used to treat bacterial infections'),
  ('Pain Relief', 'Analgesics and pain management medications'),
  ('Vitamins', 'Dietary supplements and vitamins'),
  ('Cardiovascular', 'Heart and blood pressure medications'),
  ('Respiratory', 'Medications for respiratory conditions'),
  ('Gastrointestinal', 'Medications for digestive system'),
  ('Dermatology', 'Skin condition treatments'),
  ('Diabetes', 'Blood sugar management medications');
```

```bash
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -f local_seed.sql
```

## Part 2: Backend API Setup

### Step 6: Create Backend Directory

```bash
mkdir backend
cd backend
npm init -y
```

### Step 7: Install Dependencies

```bash
npm install express pg cors dotenv bcryptjs jsonwebtoken
npm install -D typescript @types/express @types/node @types/bcryptjs @types/jsonwebtoken @types/cors ts-node nodemon
```

### Step 8: Create Backend Files

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://pharmacare_user:your_secure_password@localhost:5432/pharmacare
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

Create `backend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Create `backend/src/db.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

Create `backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

Create `backend/src/routes/auth.ts`:

```typescript
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
```

Create `backend/src/routes/medicines.ts`:

```typescript
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
```

Create `backend/src/routes/sales.ts`:

```typescript
import express from 'express';
import pool from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// Get all sales
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as medicine_name, p.full_name as seller_name
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
    return res.status(400).json({ error: 'Medicine, quantity, unit price, and total price are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert sale
    const saleResult = await client.query(
      `INSERT INTO sales 
       (medicine_id, quantity, unit_price, total_price, customer_name, customer_phone, notes, sold_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [medicine_id, quantity, unit_price, total_price, customer_name, customer_phone, notes, req.user!.userId]
    );

    // Update medicine stock
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
```

Create `backend/src/routes/categories.ts`:

```typescript
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
```

Create `backend/src/routes/dashboard.ts`:

```typescript
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

    res.json({
      total_medicines: parseInt(medicinesCount.rows[0].count),
      total_sales: parseInt(salesCount.rows[0].count),
      total_revenue: parseFloat(revenueResult.rows[0].total),
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
```

Create `backend/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import medicinesRoutes from './routes/medicines';
import salesRoutes from './routes/sales';
import categoriesRoutes from './routes/categories';
import dashboardRoutes from './routes/dashboard';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Part 3: Frontend Modifications

### Step 9: Create API Client

Create `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

async function fetchAPI(endpoint: string, options: RequestOptions = {}) {
  const { auth = true, ...fetchOptions } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (auth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  auth: {
    signup: (data: { email: string; password: string; full_name: string }) =>
      fetchAPI('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
        auth: false,
      }),
    
    login: (data: { email: string; password: string }) =>
      fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        auth: false,
      }),
    
    me: () => fetchAPI('/api/auth/me'),
  },

  // Medicines
  medicines: {
    getAll: () => fetchAPI('/api/medicines'),
    getOne: (id: string) => fetchAPI(`/api/medicines/${id}`),
    create: (data: any) =>
      fetchAPI('/api/medicines', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      fetchAPI(`/api/medicines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchAPI(`/api/medicines/${id}`, {
        method: 'DELETE',
      }),
  },

  // Sales
  sales: {
    getAll: () => fetchAPI('/api/sales'),
    create: (data: any) =>
      fetchAPI('/api/sales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Categories
  categories: {
    getAll: () => fetchAPI('/api/categories'),
    create: (data: { name: string; description?: string }) =>
      fetchAPI('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Dashboard
  dashboard: {
    getStats: () => fetchAPI('/api/dashboard/stats'),
    getRecentSales: () => fetchAPI('/api/dashboard/recent-sales'),
    getLowStock: () => fetchAPI('/api/dashboard/low-stock'),
  },
};
```

### Step 10: Create Auth Hook

Create `src/hooks/useAuth.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem('auth_token', token);
    setUser(user);
  };

  const signup = async (email: string, password: string, fullName: string) => {
    const { token, user } = await api.auth.signup({ email, password, full_name: fullName });
    localStorage.setItem('auth_token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Step 11: Update Frontend Environment

Create `.env.local`:

```env
VITE_API_URL=http://localhost:5000
```

### Step 12: Update App.tsx

Replace your `src/App.tsx` to use the new auth system:

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

## Part 4: Running the Application

### Step 13: Start Backend

```bash
cd backend
npm run dev
```

You should see: `Server running on port 5000`

### Step 14: Start Frontend

In a new terminal:

```bash
cd [your-project-root]
npm run dev
```

### Step 15: Create First User

1. Open browser to `http://localhost:5173`
2. Click "Sign Up"
3. Create your account
4. To make yourself admin:

```bash
# Get your user ID
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -c "SELECT id, email FROM users;"

# Add admin role (replace USER_ID with your ID)
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -c "INSERT INTO user_roles (user_id, role) VALUES ('USER_ID', 'admin');"
```

## Part 5: Update All Pages to Use New API

You'll need to update these files to use the new `api` client instead of Supabase:

- `src/pages/Dashboard.tsx` - Replace Supabase queries with `api.dashboard.*`
- `src/pages/Inventory.tsx` - Replace Supabase queries with `api.medicines.*`
- `src/pages/Sales.tsx` - Replace Supabase queries with `api.sales.*`
- `src/pages/Auth.tsx` - Replace Supabase auth with `useAuth()` hook
- `src/components/Layout.tsx` - Replace Supabase auth with `useAuth()` hook

## Troubleshooting

### Backend won't start
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database connection
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -c "SELECT version();"
```

### Frontend can't connect to backend
- Check `VITE_API_URL` in `.env.local`
- Ensure backend is running on port 5000
- Check browser console for CORS errors

### Authentication not working
- Check JWT_SECRET is set in `backend/.env`
- Clear localStorage: `localStorage.clear()` in browser console
- Check token in localStorage: `localStorage.getItem('auth_token')`

## Summary

You now have:
- ✅ Local PostgreSQL database
- ✅ Express backend API with JWT authentication
- ✅ Updated frontend using REST API
- ✅ Complete separation from Supabase

All functionality now runs entirely on your local machine!
