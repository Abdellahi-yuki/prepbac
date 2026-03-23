FROM php:8.2-apache

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

# Configure Apache document root to point to api/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/api

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/sites-enabled/*.conf

# Enable mod_rewrite for clean URLs
RUN a2enmod rewrite

# PHP runtime config for large uploads
RUN { \
    echo 'upload_max_filesize = 500M'; \
    echo 'post_max_size = 510M'; \
    echo 'memory_limit = 512M'; \
    echo 'max_execution_time = 600'; \
    echo 'max_input_time = 600'; \
} > /usr/local/etc/php/conf.d/uploads.ini

# Railway entrypoint: patches Apache to listen on $PORT
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]
