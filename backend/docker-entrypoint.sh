#!/bin/bash
# Railway injects $PORT — Apache must listen on that port
PORT="${PORT:-80}"

# Update Apache to listen on the assigned port
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-enabled/*.conf

exec apache2-foreground
