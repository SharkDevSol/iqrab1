# Fix VPS Environment Configuration

## Issue
Port 7788 is already in use by iqrab3.skoolific.com system. Need to change AI06 WebSocket port to 7789.

## Commands to Run on VPS

```bash
# Navigate to backend directory
cd /var/www/bilal-school/backend

# Update AI06_WEBSOCKET_PORT in .env file
sed -i 's/AI06_WEBSOCKET_PORT=7788/AI06_WEBSOCKET_PORT=7789/' .env

# Verify the change
grep AI06_WEBSOCKET_PORT .env

# Test the server
node server.js
```

## Expected Output
```
AI06_WEBSOCKET_PORT=7789
```

Then the server should start successfully without port conflicts.

## After Server Starts Successfully
Press `Ctrl+C` to stop the test, then proceed with:
1. Get SSL certificate with certbot
2. Update HTTPS_ENABLED=true
3. Start with PM2
