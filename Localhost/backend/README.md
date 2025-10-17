# PharmaCare Backend API

Express.js API server with PostgreSQL database.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Make sure PostgreSQL database is setup (see ../database/README.md)

4. Start development server:
```bash
npm run dev
```

Server will run on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Medicines
- `GET /api/medicines` - List all medicines
- `GET /api/medicines/:id` - Get single medicine
- `POST /api/medicines` - Create medicine
- `PATCH /api/medicines/:id` - Update medicine
- `DELETE /api/medicines/:id` - Delete medicine

### Sales
- `GET /api/sales` - List all sales
- `POST /api/sales` - Create sale

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-sales` - Get recent sales
- `GET /api/dashboard/low-stock` - Get low stock items

## Authentication

All endpoints except `/api/auth/signup` and `/api/auth/login` require authentication.

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Production Build

```bash
npm run build
npm start
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
sudo lsof -t -i:5000 | xargs kill -9
```

### Database connection error
- Check if PostgreSQL is running
- Verify DATABASE_URL in .env
- Test connection: `psql $DATABASE_URL`

### CORS errors
- Frontend URL is allowed in src/index.ts
- Check frontend is running on correct port
