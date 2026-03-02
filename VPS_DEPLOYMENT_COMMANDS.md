# 🚀 VPS Deployment Commands - Ready to Execute

## ✅ GitHub Push Complete!

Your code is now at: **https://github.com/SharkDevSol/bilal.git**

---

## 📋 VPS Deployment Steps

### STEP 1: Connect to VPS

```bash
ssh root@76.13.48.245
```

---

### STEP 2: Install Required Software (if not already installed)

**Copy and paste this entire block:**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install PM2
npm install -g pm2

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git

# Verify installations
node --version
npm --version
psql --version
nginx -v
pm2 --version
git --version
```

---

### STEP 3: Clone Repository

```bash
# Navigate to web directory
cd /var/www

# Clone repository
git clone https://github.com/SharkDevSol/bilal.git bilal-school

# Navigate to project
cd bilal-school

# Verify files
ls -la
```

---

### STEP 4: Install Dependencies

**Backend:**
```bash
cd /var/www/bilal-school/backend
npm install --production
```

**Frontend:**
```bash
cd /var/www/bilal-school/app
npm install
npm run build
```

---

### STEP 5: Setup Environment

```bash
cd /var/www/bilal-school/backend

# Copy production template
cp .env.vps .env

# Fix AI06 WebSocket port (avoid conflict with iqrab3)
sed -i 's/AI06_WEBSOCKET_PORT=7788/AI06_WEBSOCKET_PORT=7789/' .env

# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64').replace(/[^a-zA-Z0-9]/g, ''))"

# Edit environment file
nano .env
```

**Update these values in .env:**
```env
DB_PASSWORD=Bilal2026SchoolSecurePass
JWT_SECRET=PASTE_GENERATED_SECRET_HERE
AI06_WEBSOCKET_PORT=7789
HTTPS_ENABLED=false
SMTP_USER=your-email@gmail.com (optional)
SMTP_PASS=your-app-password (optional)
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### STEP 6: Create Database

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE school_management10;"

# Set password (use same as DB_PASSWORD in .env)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Bilal2026SchoolSecurePass';"

# Configure authentication
nano /etc/postgresql/16/main/pg_hba.conf
```

**Find and change:**
```
local   all             postgres                                peer
```
**To:**
```
local   all             postgres                                md5
```

**Save and restart:**
```bash
systemctl restart postgresql
```

**Create student_activities table:**
```bash
cd /var/www/bilal-school/backend
sudo -u postgres psql -d school_management10 -f database/create_student_activities_table.sql
```

**Initialize database tables:**
```bash
node setup-report-card.js
```

---

### STEP 6.5: Test Backend (Before SSL)

```bash
cd /var/www/bilal-school/backend

# Test server startup
node server.js

# Should see:
# ✅ HTTP server created (development mode)
# ✅ AI06 WebSocket Server started on port 7789
# ✅ Auto-marker started
# ✅ Guardian notification service started

# Press Ctrl+C to stop
```

**If successful, proceed to SSL setup. If errors, check logs.**

---

### STEP 7: Get SSL Certificate

```bash
# Stop Nginx temporarily
systemctl stop nginx

# Get certificate
certbot certonly --standalone -d bilal.skoolific.com

# Follow prompts:
# - Enter email
# - Agree to terms (Y)
# - Share email? (N or Y)

# Start Nginx
systemctl start nginx

# Update .env to enable HTTPS
cd /var/www/bilal-school/backend
nano .env
# Change: HTTPS_ENABLED=true
# Save: Ctrl+X, Y, Enter
```

---

### STEP 8: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/bilal-school
```

**Paste this entire configuration:**

```nginx
# Backend API Server
upstream backend {
    server localhost:5011;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name bilal.skoolific.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Main Server
server {
    listen 443 ssl http2;
    server_name bilal.skoolific.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/bilal.skoolific.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bilal.skoolific.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend - Serve React App
    root /var/www/bilal-school/app/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend Routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Uploads Directory
    location /uploads/ {
        alias /var/www/bilal-school/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max Upload Size
    client_max_body_size 50M;
}
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Enable site:**
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/bilal-school /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Should show: "syntax is ok" and "test is successful"

# Reload Nginx
systemctl reload nginx
```

---

### STEP 9: Start Backend with PM2

```bash
cd /var/www/bilal-school/backend

# Start backend
pm2 start server.js --name bilal-backend

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
# Copy and run the command it gives you

# Check status
pm2 status

# View logs
pm2 logs bilal-backend --lines 20
```

---

### STEP 10: Configure Firewall

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## ✅ Verification

### Check Services

```bash
# Check backend
pm2 status

# Check Nginx
systemctl status nginx

# Check PostgreSQL
systemctl status postgresql

# Test API locally
curl http://localhost:5011/api/health
```

### Test Website

**On your computer, open browser:**
```
https://bilal.skoolific.com
```

**Should see:**
- ✅ Website loads
- ✅ Green padlock (SSL)
- ✅ Login page

---

## 🔄 Future Updates

### When you make changes:

**On your computer:**
```bash
git add .
git commit -m "Your changes"
git push origin main
```

**On VPS:**
```bash
ssh root@76.13.48.245
cd /var/www/bilal-school
git pull origin main

# If backend changed:
cd backend
npm install --production
pm2 restart bilal-backend

# If frontend changed:
cd app
npm install
npm run build
```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
pm2 logs bilal-backend --lines 50
nano /var/www/bilal-school/backend/.env
pm2 restart bilal-backend
```

### Database connection error
```bash
systemctl status postgresql
psql -U postgres -d school_management10
cat /var/www/bilal-school/backend/.env | grep DB_
```

### 502 Bad Gateway
```bash
pm2 status
pm2 restart bilal-backend
systemctl restart nginx
```

### SSL certificate error
```bash
certbot certificates
certbot renew --force-renewal
```

---

## 📞 Quick Commands

```bash
# Connect to VPS
ssh root@76.13.48.245

# Check status
pm2 status
systemctl status nginx
systemctl status postgresql

# View logs
pm2 logs bilal-backend
tail -f /var/log/nginx/error.log

# Restart services
pm2 restart bilal-backend
systemctl restart nginx

# Update from GitHub
cd /var/www/bilal-school
git pull origin main
```

---

## 🎉 Deployment Complete!

Your application will be live at:
- **Website:** https://bilal.skoolific.com
- **API:** https://bilal.skoolific.com/api
- **Health Check:** https://bilal.skoolific.com/api/health

---

**GitHub:** https://github.com/SharkDevSol/bilal.git  
**VPS:** 76.13.48.245  
**Domain:** bilal.skoolific.com  
**Port:** 5011  
**Database:** school_management10

**Status:** ✅ Code pushed to GitHub - Ready for VPS deployment!
