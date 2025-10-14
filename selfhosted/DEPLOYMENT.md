# Deployment Guide

## Production Deployment Options

### Option 1: Docker Compose (Recommended for Quick Setup)

```bash
# Clone the repository
git clone <your-repo-url>
cd selfhosted

# Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env with production values
nano backend/.env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 2: Manual Deployment with nginx

#### 1. Setup PostgreSQL Database

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE pharmacare;
CREATE USER pharmacare WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pharmacare TO pharmacare;
\q

# Run migrations
psql -U pharmacare -d pharmacare -f database/schema.sql
psql -U pharmacare -d pharmacare -f database/seed.sql
```

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Build
npm run build

# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
pm2 start dist/index.js --name pharmacare-api
pm2 save
pm2 startup
```

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL
cp .env.example .env
echo "VITE_API_URL=https://yourdomain.com" > .env

# Build
npm run build

# Copy to nginx directory
sudo cp -r dist/* /var/www/pharmacare/
```

#### 4. Configure nginx

```nginx
# /etc/nginx/sites-available/pharmacare
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/pharmacare;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pharmacare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 3: Cloud Platforms

#### Deploy to Railway.app

1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Add PostgreSQL service
4. Deploy backend and frontend as separate services
5. Configure environment variables

#### Deploy to Heroku

```bash
# Backend
cd backend
heroku create pharmacare-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main

# Frontend (build and deploy to S3/Cloudflare Pages/Netlify)
cd frontend
npm run build
# Deploy dist folder to your preferred static hosting
```

## Security Checklist

- [ ] Change default JWT_SECRET to a strong random value
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall (allow only 80, 443, and SSH)
- [ ] Set up regular database backups
- [ ] Enable rate limiting on API
- [ ] Set NODE_ENV=production
- [ ] Review and restrict CORS settings
- [ ] Set up monitoring and logging
- [ ] Create admin user with strong password

## Database Backup

```bash
# Backup
pg_dump -U pharmacare pharmacare > backup_$(date +%Y%m%d).sql

# Restore
psql -U pharmacare pharmacare < backup_20250113.sql

# Automated daily backups (add to crontab)
0 2 * * * pg_dump -U pharmacare pharmacare > /backups/pharmacare_$(date +\%Y\%m\%d).sql
```

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
pm2 logs pharmacare-api
```

### nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Scaling Considerations

1. **Database**: Use connection pooling, add read replicas for heavy read loads
2. **Backend**: Run multiple instances behind a load balancer
3. **Frontend**: Use CDN for static assets
4. **Caching**: Implement Redis for session and data caching
5. **File Storage**: Move to S3/MinIO for file uploads

## Troubleshooting

### Backend not connecting to database
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U pharmacare -d pharmacare -h localhost
```

### Frontend can't reach API
- Check VITE_API_URL in frontend/.env
- Verify nginx proxy configuration
- Check backend is running: `pm2 status`
- Review CORS settings in backend

### SSL Certificate Issues
```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```
