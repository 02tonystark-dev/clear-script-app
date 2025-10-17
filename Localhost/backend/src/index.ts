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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`✅ PharmaCare API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
