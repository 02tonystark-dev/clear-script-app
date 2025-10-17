# Database Setup

## Files

- `schema.sql` - Database schema with tables and triggers
- `seed.sql` - Initial seed data (medicine categories)
- `setup.sh` - Automated setup script

## Manual Setup

### 1. Install PostgreSQL (Ubuntu)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
psql --version
```

### 2. Create Database and User

```bash
sudo -i -u postgres
psql
```

In PostgreSQL prompt:

```sql
CREATE DATABASE pharmacare;
CREATE USER pharmacare_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;

\c pharmacare

GRANT ALL ON SCHEMA public TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pharmacare_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pharmacare_user;

\q
```

Exit postgres user:
```bash
exit
```

### 3. Run Schema

```bash
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -f schema.sql
```

### 4. Load Seed Data

```bash
PGPASSWORD='your_secure_password' psql -h localhost -U pharmacare_user -d pharmacare -f seed.sql
```

## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check the port
sudo netstat -plunt | grep postgres
```

### Password Authentication Failed

Edit `/etc/postgresql/*/main/pg_hba.conf`:
```
# Change from 'peer' to 'md5' for local connections
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Reset Database

```bash
sudo -u postgres psql -c "DROP DATABASE IF EXISTS pharmacare;"
sudo -u postgres psql -c "CREATE DATABASE pharmacare;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare_user;"

PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -f schema.sql
PGPASSWORD='your_password' psql -h localhost -U pharmacare_user -d pharmacare -f seed.sql
```
