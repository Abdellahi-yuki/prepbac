FROM php:8.2-cli

# Install system deps
RUN apt-get update && apt-get install -y \
    libssl-dev \
    zip \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for layer caching
COPY composer.json composer.lock* ./

# Install PHP dependencies (skip dev, no interaction)
RUN composer install --no-dev --no-interaction --optimize-autoloader

# Copy rest of the app
COPY . .

# PHP runtime config for large uploads (mirrors run.sh limits)
RUN { \
    echo 'upload_max_filesize = 500M'; \
    echo 'post_max_size = 510M'; \
    echo 'memory_limit = 512M'; \
    echo 'max_execution_time = 600'; \
    echo 'max_input_time = 600'; \
} > /usr/local/etc/php/conf.d/uploads.ini

# Railway injects $PORT — PHP built-in server binds to it directly
ENV PORT=8000
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} -t /var/www/html/api /var/www/html/api/index.php"]
