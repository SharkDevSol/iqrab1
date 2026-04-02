# IQRAB1 Migration Summary

## Project Migration: Bilal → Iqrab1

**Date**: April 2, 2026  
**Repository**: https://github.com/SharkDevSol/iqrab1.git  
**Domain**: iqrab1.skoolific.com  
**Backend Port**: 5021  
**WebSocket Port**: 7799

---

## Changes Made

### 1. Backend Configuration

#### Environment Files Updated:
- `backend/.env`
  - PORT: 5011 → 5021
  - FRONTEND_URL: bilal.skoolific.com → iqrab1.skoolific.com
  - AI06_WEBSOCKET_PORT: 7789 → 7799

- `backend/.env.production`
  - PORT: 5011 → 5021
  - FRONTEND_URL: bilal.skoolific.com → iqrab1.skoolific.com

- `backend/.env.vps`
  - PORT: 5011 → 5021
  - FRONTEND_URL: bilal.skoolific.com → iqrab1.skoolific.com
  - SSL paths updated to iqrab1.skoolific.com
  - Comment updated: "VPS PRODUCTION ENVIRONMENT - iqrab1.skoolific.com"

### 2. Frontend Configuration

#### Environment Files Updated:
- `APP/.env`
  - VITE_API_URL: bilal.skoolific.com/api → iqrab1.skoolific.com/api

- `APP/.env.production`
  - VITE_API_URL: bilal.skoolific.com/api → iqrab1.skoolific.com/api
  - Comment updated: "Production configuration for iqrab1 VPS"

### 3. Source Code Updates

All hardcoded URLs in 84 files were updated from `bilal.skoolific.com` to `iqrab1.skoolific.com`:

#### Key Files Updated:
- `APP/src/utils/api.js` - API base URL
- `APP/src/PAGE/List/utils/fileUtils.js` - File utilities
- `APP/src/PAGE/List/ListStaff/ListStaff.jsx` - Staff list
- `APP/src/PAGE/List/ListStaff/EditStaff.jsx` - Staff editor
- `APP/src/PAGE/Finance/ChartOfAccounts/AccountList.jsx` - Finance accounts
- `APP/src/PAGE/Finance/ChartOfAccounts/AccountSelector.jsx` - Account selector
- `APP/src/PAGE/TaskDetail.jsx` - Task details
- `APP/src/PAGE/StudentFaults/StudentFaultsS.jsx` - Student faults (11 URLs updated)
- `APP/src/PAGE/Post/Post.jsx` - Posts with media uploads
- `APP/src/PAGE/Setting/Setting.jsx` - Settings with logo/icon uploads
- `APP/src/PAGE/Evaluation/*.jsx` - All evaluation pages (5 files)
- `APP/src/PAGE/EvaluationBook/*.jsx` - All evaluation book pages (7 files)
- `APP/src/PAGE/HR/*.jsx` - All HR pages (11 files)
- `APP/src/PAGE/HR/components/*.jsx` - All HR components (8 files)
- `APP/src/PAGE/Communication/*.jsx` - All communication pages (12 files)
- `APP/src/Guardian/*.jsx` - All guardian pages (4 files)
- `APP/src/Staff/*.jsx` - All staff pages (2 files)
- And 30+ more files...

### 4. Nginx Configuration Files

#### Files Updated:
- `nginx-bilal-school.conf`
  - server_name: bilal.skoolific.com → iqrab1.skoolific.com
  - SSL certificate paths updated
  - root: /var/www/bilal.skoolific.com → /var/www/iqrab1.skoolific.com
  - proxy_pass: localhost:5011 → localhost:5021
  - WebSocket proxy: localhost:7789 → localhost:7799

- `nginx-bilal-school-fixed.conf`
  - server_name: bilal.skoolific.com → iqrab1.skoolific.com
  - SSL certificate paths updated
  - upstream backend: 127.0.0.1:5011 → 127.0.0.1:5021

- `bilal-nginx.conf`
  - server_name: bilal.skoolific.com → iqrab1.skoolific.com
  - SSL certificate paths updated
  - proxy_pass: localhost:5011 → localhost:5021
  - WebSocket proxy: localhost:7789 → localhost:7799

### 5. Build & Deployment

- Frontend built successfully (44.65s)
- Build output: `APP/dist/`
- All changes committed to git
- Pushed to GitHub: https://github.com/SharkDevSol/iqrab1.git
- Commit: 1146e8d - "Update all URLs and port from bilal.skoolific.com:5011 to iqrab1.skoolific.com:5021"

---

## Port Configuration Summary

| Service | Old (Bilal) | New (Iqrab1) |
|---------|-------------|--------------|
| Backend API | 5011 | 5021 |
| AI06 WebSocket | 7789 | 7799 |
| Frontend | HTTPS (443) | HTTPS (443) |

---

## Deployment Instructions

### 1. VPS Setup

```bash
# SSH to VPS
ssh root@76.13.48.245

# Create directories
mkdir -p /var/www/iqrab1-school/backend
mkdir -p /var/www/iqrab1.skoolific.com

# Clone repository
cd /var/www/iqrab1-school
git clone https://github.com/SharkDevSol/iqrab1.git .

# Install backend dependencies
cd backend
npm install

# Copy environment file
cp .env.vps .env

# Install frontend dependencies
cd ../APP
npm install

# Build frontend
npm run build

# Copy build to web directory
cp -r dist/* /var/www/iqrab1.skoolific.com/
```

### 2. Database Setup

```bash
# Create new database for iqrab1
sudo -u postgres psql
CREATE DATABASE school_management_iqrab1;
\q

# Update backend/.env with new database name
# DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/school_management_iqrab1?schema=school_comms&timezone=Africa/Addis_Ababa"
```

### 3. Nginx Configuration

```bash
# Copy nginx config
cp nginx-bilal-school.conf /etc/nginx/sites-available/iqrab1.skoolific.com
ln -s /etc/nginx/sites-available/iqrab1.skoolific.com /etc/nginx/sites-enabled/

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

### 4. SSL Certificate

```bash
# Install SSL certificate
certbot --nginx -d iqrab1.skoolific.com

# Verify auto-renewal
certbot renew --dry-run
```

### 5. PM2 Process

```bash
# Start backend with PM2
cd /var/www/iqrab1-school/backend
pm2 start server.js --name iqrab1-backend

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### 6. Verify Deployment

```bash
# Check backend is running
curl http://localhost:5021/api/health

# Check frontend
curl https://iqrab1.skoolific.com

# Check PM2 status
pm2 status

# View logs
pm2 logs iqrab1-backend
```

---

## Verification Checklist

- [x] All URLs updated from bilal.skoolific.com to iqrab1.skoolific.com
- [x] Backend port changed from 5011 to 5021
- [x] WebSocket port changed from 7789 to 7799
- [x] Environment files updated (.env, .env.production, .env.vps)
- [x] Nginx configuration files updated
- [x] Frontend built successfully
- [x] All changes committed to git
- [x] Pushed to GitHub repository: https://github.com/SharkDevSol/iqrab1.git
- [ ] VPS deployment (pending)
- [ ] Database created (pending)
- [ ] SSL certificate installed (pending)
- [ ] Backend running on PM2 (pending)
- [ ] Frontend accessible via HTTPS (pending)

---

## Important Notes

1. **Database**: Create a new database `school_management_iqrab1` for this school
2. **SSL Certificate**: Must be obtained for iqrab1.skoolific.com domain
3. **DNS**: Ensure iqrab1.skoolific.com points to VPS IP (76.13.48.245)
4. **Firewall**: Ensure port 5021 is accessible (if needed for direct access)
5. **PM2**: Use unique process name `iqrab1-backend` to avoid conflicts

---

## Files Modified: 84 files

### Backend (3 files)
- backend/.env
- backend/.env.production
- backend/.env.vps

### Frontend Config (2 files)
- APP/.env
- APP/.env.production

### Nginx (3 files)
- nginx-bilal-school.conf
- nginx-bilal-school-fixed.conf
- bilal-nginx.conf

### Source Code (76 files)
All .jsx and .js files in:
- APP/src/COMPONENTS/
- APP/src/Guardian/
- APP/src/PAGE/
- APP/src/Staff/
- APP/src/utils/

---

## GitHub Repository

**URL**: https://github.com/SharkDevSol/iqrab1.git  
**Branch**: main  
**Latest Commit**: 1146e8d  
**Commit Message**: "Update all URLs and port from bilal.skoolific.com:5011 to iqrab1.skoolific.com:5021"

---

## Next Steps

1. Deploy to VPS following the deployment instructions above
2. Create and configure the database
3. Install SSL certificate
4. Start the backend with PM2
5. Test all functionality
6. Update DNS if needed

---

**Migration completed successfully!** ✅
