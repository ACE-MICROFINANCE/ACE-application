#!/bin/bash
set -e

# tạo và cấp quyền cho thư mục data (volume mount)
mkdir -p /var/opt/mssql
chown -R 10001:0 /var/opt/mssql || true
chmod -R 770 /var/opt/mssql || true

exec /opt/mssql/bin/sqlservr
