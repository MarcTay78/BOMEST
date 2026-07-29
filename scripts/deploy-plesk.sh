#!/usr/bin/env bash
# Build and FTP-upload to the Plesk (Exabyte) subdirectory deploy.
# Config comes from .env.deploy (gitignored, see .env.deploy.example).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.deploy ]; then
  echo "Missing .env.deploy — copy .env.deploy.example and fill in your FTP details." >&2
  exit 1
fi
source .env.deploy

: "${PLESK_FTP_HOST:?Set PLESK_FTP_HOST in .env.deploy}"
: "${PLESK_FTP_USER:?Set PLESK_FTP_USER in .env.deploy}"
: "${PLESK_FTP_PASS:?Set PLESK_FTP_PASS in .env.deploy}"
: "${PLESK_REMOTE_PATH:?Set PLESK_REMOTE_PATH in .env.deploy}"
: "${PLESK_BASE_URL:?Set PLESK_BASE_URL in .env.deploy}"

echo "Building (base=$PLESK_BASE_URL)..."
MSYS_NO_PATHCONV=1 npx vite build --base="$PLESK_BASE_URL"

cat > dist/.htaccess <<EOF
RewriteEngine On
RewriteBase $PLESK_BASE_URL

# Serve real files/directories as-is
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else falls back to index.html (client-side routing)
RewriteRule ^ index.html [L]
EOF

echo "Uploading to ftp://$PLESK_FTP_HOST/$PLESK_REMOTE_PATH ..."
cd dist
find . -type f | sed 's|^\./||' | while read -r f; do
  echo "  $f"
  curl -sf --user "$PLESK_FTP_USER:$PLESK_FTP_PASS" --ftp-create-dirs -T "$f" \
    "ftp://$PLESK_FTP_HOST/$PLESK_REMOTE_PATH/$f"
done

echo "Done. Live at: https://$PLESK_PUBLIC_HOST$PLESK_BASE_URL"
