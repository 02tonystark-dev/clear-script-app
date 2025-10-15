# Local PostgreSQL Setup Guide for Ubuntu

This guide will help you install PostgreSQL on Ubuntu and configure the pharmacy management system to use your local database.

## Prerequisites

- Ubuntu Linux (20.04 LTS or newer)
- Terminal access with sudo privileges
- Node.js 18+ and npm installed

## Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL and contrib package
sudo apt install postgresql postgresql-contrib -y

# Verify installation
psql --version
# Should output something like: psql (PostgreSQL) 14.x
```

## Step 2: Start PostgreSQL Service

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
# Should show "active (running)"
```

## Step 3: Create Database and User

```bash
# Switch to postgres user
sudo -i -u postgres

# Enter PostgreSQL interactive terminal
psql

# Now you're in the PostgreSQL prompt (postgres=#)
# Run these commands one by one:
```

**In the PostgreSQL prompt:**

```sql
-- Create a new database
CREATE DATABASE pharmacare;

-- Create a new user with password
CREATE USER pharmacare_user WITH PASSWORD 'your_secure_password_here';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;

-- Connect to the pharmacare database
\c pharmacare

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO pharmacare_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pharmacare_user;

-- Exit PostgreSQL
\q
```

**Exit from postgres user:**

```bash
# Exit back to your regular user
exit
```

## Step 4: Run Database Schema

```bash
# Copy the schema file to a temporary location
cd /path/to/your/project/selfhosted

# Run the schema as the pharmacare_user
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -f database/schema.sql

# You should see output showing tables, functions, and triggers being created
```

## Step 5: Load Seed Data (Optional)

```bash
# Load initial medicine categories
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -f database/seed.sql

# You should see "INSERT 0 8" indicating 8 categories were added
```

## Step 6: Configure Backend Environment

```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**Update `.env` with your local database credentials:**

```env
DATABASE_URL=postgresql://pharmacare_user:your_secure_password_here@localhost:5432/pharmacare
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

**Important:** Replace `your_secure_password_here` with the password you set in Step 3!

## Step 7: Install Backend Dependencies

```bash
# Make sure you're in the backend directory
cd /path/to/your/project/selfhosted/backend

# Install dependencies
npm install

# The installation should complete without errors
```

## Step 8: Test Database Connection

```bash
# Still in the backend directory
# Start the backend server
npm run dev

# You should see:
# "Server running on port 5000"
# "Database connected successfully" (or similar)
```

**If you see connection errors:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check your DATABASE_URL in `.env`
- Verify the password matches what you set in Step 3
- Check PostgreSQL is accepting connections: `sudo nano /etc/postgresql/*/main/postgresql.conf` and ensure `listen_addresses = 'localhost'`

## Step 9: Configure Frontend

```bash
# Open a new terminal
cd /path/to/your/project/selfhosted/frontend

# Copy example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**Set the API URL:**

```env
VITE_API_URL=http://localhost:5000
```

## Step 10: Install Frontend Dependencies

```bash
# Make sure you're in the frontend directory
cd /path/to/your/project/selfhosted/frontend

# Install dependencies
npm install
```

## Step 11: Start the Application

**Terminal 1 (Backend):**
```bash
cd /path/to/your/project/selfhosted/backend
npm run dev
# Should show: "Server running on port 5000"
```

**Terminal 2 (Frontend):**
```bash
cd /path/to/your/project/selfhosted/frontend
npm run dev
# Should show: "Local: http://localhost:5173"
```

## Step 12: Create Your First User

1. Open your browser and go to `http://localhost:5173`
2. Click "Sign Up" or register option
3. Fill in your details (this will be your admin user)
4. After registration, you need to manually assign admin role

**Assign admin role via SQL:**

```bash
# First, get the user ID from the users table
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -c "SELECT id, email FROM users;"

# Copy the user ID, then insert admin role
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -c "INSERT INTO user_roles (user_id, role) VALUES ('USER_ID_HERE', 'admin');"
```

Replace `USER_ID_HERE` with the actual UUID from the first query.

## Step 13: Verify Everything Works

1. Log in with your admin account
2. Try adding a medicine category
3. Try adding a medicine
4. Record a test sale
5. Check the dashboard for statistics

## Common Issues and Solutions

### Issue: "password authentication failed"
**Solution:**
```bash
# Edit pg_hba.conf to allow password authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Find the line with "local all all peer"
# Change it to "local all all md5"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Issue: "connection refused"
**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Check if it's listening on port 5432
sudo netstat -plunt | grep 5432
```

### Issue: "relation does not exist"
**Solution:**
```bash
# Re-run the schema file
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -f database/schema.sql
```

### Issue: Backend can't connect to database
**Solution:**
```bash
# Test connection manually
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare -c "SELECT version();"

# If this works, check your .env file for typos
cat backend/.env
```

## Security Best Practices

### For Development:
- Use strong passwords even in development
- Don't commit `.env` files to git
- Keep PostgreSQL updated: `sudo apt update && sudo apt upgrade postgresql`

### For Production:
- Use SSL/TLS for database connections
- Configure PostgreSQL to only accept local connections
- Set up regular database backups
- Use environment-specific passwords
- Enable PostgreSQL logging
- Configure firewall rules (ufw)

```bash
# Production security example
sudo ufw allow 5000/tcp  # Backend API
sudo ufw enable
```

## Database Backup

```bash
# Create a backup
PGPASSWORD='your_secure_password_here' pg_dump -h localhost -U pharmacare_user pharmacare > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare < backup_20241215_120000.sql
```

## Useful PostgreSQL Commands

```bash
# Connect to database
PGPASSWORD='your_secure_password_here' psql -h localhost -U pharmacare_user -d pharmacare

# Inside psql:
\dt              # List all tables
\d table_name    # Describe a table
\du              # List users
\l               # List databases
\q               # Quit

# Check table data
SELECT * FROM medicine_categories;
SELECT * FROM medicines LIMIT 10;
SELECT * FROM users;
```

## Next Steps

- Set up automatic backups using cron
- Configure Nginx as a reverse proxy for production
- Set up systemd services for auto-start
- Implement monitoring and logging
- See `DEPLOYMENT.md` for production deployment guide

## Need Help?

- PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*-main.log`
- Backend logs: Check your terminal where `npm run dev` is running
- Frontend logs: Check browser console (F12)

---

**Congratulations!** 🎉 You now have a fully functional pharmacy management system running on your local PostgreSQL database!
