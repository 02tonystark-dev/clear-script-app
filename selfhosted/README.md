# PharmaCare System - Self-Hosted Version

A complete Pharmacy Management System with Node.js backend, PostgreSQL database, and React frontend.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Quick Start with Docker

```bash
cd selfhosted
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Manual Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb pharmacare

# Run migrations
psql -d pharmacare -f database/schema.sql
psql -d pharmacare -f database/seed.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Start backend
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Start frontend
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/pharmacare
JWT_SECRET=your-secret-key-change-this
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

## Features

- 👤 User Authentication (Signup/Login)
- 💊 Medicine Inventory Management
- 📊 Sales Tracking
- 📈 Dashboard Analytics
- 👥 Role-based Access Control (Admin, Pharmacist, Clerk)
- 🔍 Search & Filter

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT

## Production Deployment

### Using nginx as reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/pharmacare/frontend/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Build frontend for production

```bash
cd frontend
npm run build
```

### Run backend in production

```bash
cd backend
npm run build
npm start
```

## License

MIT
