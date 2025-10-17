# PharmaCare - Local PostgreSQL Setup

This is a complete standalone setup for running PharmaCare with a local PostgreSQL database.

## Structure

```
Localhost/
├── database/          # Database schema and seed files
├── backend/           # Express API server
└── frontend/          # React frontend application
```

## Quick Start Guide

### 1. Setup PostgreSQL Database

```bash
cd database
./setup.sh
```

Or manually:
```bash
# Install PostgreSQL (Ubuntu)
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE pharmacare;"
sudo -u postgres psql -c "CREATE USER pharmacare_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;"

# Run schema and seed
cd database
PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -f schema.sql
PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -f seed.sql
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

Backend will run on http://localhost:5000

### 3. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed (default: http://localhost:5000)
npm run dev
```

Frontend will run on http://localhost:5173

### 4. Create First User

1. Open browser to http://localhost:5173
2. Click "Sign Up" and create an account
3. To make yourself admin:

```bash
# Get your user ID
PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -c "SELECT id, email FROM users;"

# Add admin role (replace YOUR_USER_ID)
PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -c "INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin') ON CONFLICT DO NOTHING;"
```

## Features

- ✅ Complete user authentication with JWT
- ✅ Medicine inventory management
- ✅ Sales tracking and reporting
- ✅ Dashboard with statistics
- ✅ Low stock alerts
- ✅ Category management
- ✅ User roles (admin, pharmacist, clerk)

## Troubleshooting

See individual README files in each directory:
- `database/README.md` - Database setup issues
- `backend/README.md` - API server issues
- `frontend/README.md` - Frontend issues
