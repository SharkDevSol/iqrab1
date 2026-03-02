# 🔧 Immediate VPS Fix - Port Conflict Resolution

## Problem
Port 7788 is already in use by iqrab3.skoolific.com

## Solution
Change Bilal system to use port 7789 for AI06 WebSocket

---

## Run These Commands on VPS

```bash
# 1. Navigate to backend
cd /var/www/bilal-school/backend

# 2. Fix the port in .env file
sed -i 's/AI06_WEBSOCKET_PORT=7788/AI06_WEBSOCKET_PORT=7789/' .env

# 3. Verify the change
echo "Checking AI06 port configuration:"
grep AI06_WEBSOCKET_PORT .env

# 4. Test the server
echo ""
echo "Testing server startup..."
node server.js
```

---

## Expected Output

After step 3, you should see:
```
AI06_WEBSOCKET_PORT=7789
```

After step 4, you should see:
```
HTTP server created (development mode)
🔌 AI06 WebSocket Server started on port 7789
📡 Waiting for AI06 devices to connect...
🤖 Attendance auto-marker started
📬 Guardian notification service started
✅ Guardian Notification Service started
```

**If you see these messages, the server is working!**

Press `Ctrl+C` to stop the test.

---

## Next Steps After Successful Test

1. Get SSL certificate:
```bash
systemctl stop nginx
certbot certonly --standalone -d bilal.skoolific.com
systemctl start nginx
```

2. Enable HTTPS in .env:
```bash
nano .env
# Change: HTTPS_ENABLED=true
# Save: Ctrl+X, Y, Enter
```

3. Configure Nginx (see VPS_DEPLOYMENT_COMMANDS.md Step 8)

4. Start with PM2:
```bash
pm2 start server.js --name bilal-backend
pm2 save
```

---

## Port Allocation Summary

| System | Backend Port | AI06 WebSocket Port |
|--------|-------------|---------------------|
| iqrab3.skoolific.com | 5000 | 7788 |
| bilal.skoolific.com | 5011 | 7789 |

Both systems are now isolated and won't conflict! ✅
