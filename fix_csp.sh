#!/bin/bash
cat >> /etc/nginx/sites-available/bilal-school << 'NGINX_CSP'

# Override CSP to allow eval (required by antd/vendor libs)
NGINX_CSP

# Add CSP header before closing brace
sed -i 's|# Security headers|# Security headers\n    add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: blob: https:; connect-src '\''self'\'' ws: wss: https:; font-src '\''self'\'' data:; object-src '\''none'\'';" always;|' /etc/nginx/sites-available/bilal-school

nginx -t && systemctl reload nginx && echo "Done!"
