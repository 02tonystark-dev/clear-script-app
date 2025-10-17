#!/bin/bash

# PharmaCare Database Setup Script

echo "PharmaCare Database Setup"
echo "=========================="
echo ""

# Prompt for password
read -sp "Enter password for pharmacare_user: " DB_PASSWORD
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Installing..."
    sudo apt update
    sudo apt install postgresql postgresql-contrib -y
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS pharmacare;
CREATE DATABASE pharmacare;
DROP USER IF EXISTS pharmacare_user;
CREATE USER pharmacare_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;
EOF

# Grant schema privileges
sudo -u postgres psql -d pharmacare << EOF
GRANT ALL ON SCHEMA public TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pharmacare_user;
EOF

# Run schema
echo "Running schema..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U pharmacare_user -d pharmacare -f schema.sql

# Load seed data
echo "Loading seed data..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U pharmacare_user -d pharmacare -f seed.sql

echo ""
echo "Database setup complete!"
echo ""
echo "Connection string:"
echo "postgresql://pharmacare_user:$DB_PASSWORD@localhost:5432/pharmacare"
echo ""
echo "Update your backend/.env file with:"
echo "DATABASE_URL=postgresql://pharmacare_user:$DB_PASSWORD@localhost:5432/pharmacare"
